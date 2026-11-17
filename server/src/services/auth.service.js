// server/src/services/auth.service.js
const { User, Workspace, Membership, PasswordReset, AuditEvent } = require('../models');
const { validatePassword, hashPassword, verifyPassword } = require('../utils/password');
const { generateToken, hashToken } = require('../utils/tokens');
const { sendEmail, buildPasswordResetEmail } = require('./email.service');
const config = require('../config');
const mongoose = require('mongoose');

async function getSetupStatus() {
  const count = await Workspace.countDocuments();
  return { setupComplete: count > 0 };
}

async function setupFirstAdmin({ adminName, email, password, workspaceName, timezone, description }) {
  const existingCount = await Workspace.countDocuments();
  if (existingCount > 0) {
    const err = new Error('A workspace already exists. Setup is already complete.');
    err.status = 409;
    err.code = 'SETUP_ALREADY_DONE';
    throw err;
  }

  // Validate fields
  const fields = {};
  if (!adminName || !adminName.trim()) fields.adminName = 'Admin full name is required.';
  if (!email || !email.trim()) fields.email = 'Valid email address is required.';
  if (!workspaceName || !workspaceName.trim()) fields.workspaceName = 'Workspace name is required.';
  if (Object.keys(fields).length > 0) {
    const err = new Error('Some fields need attention.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = fields;
    throw err;
  }

  // Validate password
  const passCheck = validatePassword(password, email);
  if (!passCheck.valid) {
    const err = new Error('Password does not meet security rules.');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    err.fields = { password: passCheck.failedRules.join(' ') };
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();
  const { hash, salt } = await hashPassword(password);

  // Create User
  const user = await User.create({
    name: adminName.trim(),
    email: cleanEmail,
    passwordHash: hash,
    passwordSalt: salt,
  });

  // Create Workspace
  const workspace = await Workspace.create({
    name: workspaceName.trim(),
    description: (description || '').trim(),
    timezone: timezone || 'UTC',
    createdBy: user._id,
  });

  // Create Admin Membership
  const membership = await Membership.create({
    workspaceId: workspace._id,
    userId: user._id,
    role: 'admin',
    approver: true,
    status: 'active',
  });

  // Write audit event per Section 4
  await AuditEvent.create({
    workspaceId: workspace._id,
    actorId: user._id,
    event: 'workspace_created',
    targetType: 'Workspace',
    targetId: workspace._id,
    details: { workspaceName: workspace.name, timezone: workspace.timezone },
  });

  return {
    user: user.toJSON(),
    workspace,
    membership,
  };
}

async function loginUser({ email, password }) {
  if (!email || !password) {
    const err = new Error('The email or password is incorrect.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (!user) {
    const err = new Error('The email or password is incorrect.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const remainingMs = user.lockedUntil.getTime() - now.getTime();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    const err = new Error(`Account locked due to consecutive failed logins. Try again in ${remainingMinutes} minute(s).`);
    err.status = 423;
    err.code = 'ACCOUNT_LOCKED';
    err.remainingMinutes = remainingMinutes;
    throw err;
  }

  const isValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    user.failedLogins = (user.failedLogins || 0) + 1;
    if (user.failedLogins >= 5) {
      user.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000); // 15 mins lock
    }
    await user.save();

    if (user.lockedUntil && user.lockedUntil > now) {
      const err = new Error('Account locked due to 5 failed login attempts. Try again in 15 minutes.');
      err.status = 423;
      err.code = 'ACCOUNT_LOCKED';
      err.remainingMinutes = 15;
      throw err;
    }

    const err = new Error('The email or password is incorrect.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  // Reset failed logins counter on success per Section 4
  user.failedLogins = 0;
  user.lockedUntil = null;
  await user.save();

  // Load active membership
  const membership = await Membership.findOne({ userId: user._id }).populate('workspaceId');
  if (!membership) {
    const err = new Error('No workspace membership found for this account.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  if (membership.status === 'suspended') {
    const err = new Error('Your account in this workspace has been suspended.');
    err.status = 403;
    err.code = 'ACCOUNT_SUSPENDED';
    throw err;
  }

  return {
    user: user.toJSON(),
    workspace: membership.workspaceId,
    membership,
  };
}

async function requestPasswordReset({ email }) {
  if (!email) return;

  const cleanEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: cleanEmail });

  if (user) {
    // Invalidate earlier unused tokens for that user per Section 4
    await PasswordReset.updateMany(
      { userId: user._id, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await PasswordReset.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    const resetLink = `${config.appUrl}/reset/${token}`;
    const text = buildPasswordResetEmail({ resetLink, userName: user.name });
    await sendEmail({
      to: user.email,
      subject: 'MeetTrack - Password Reset Request',
      text,
    });
  }
}

async function resetPasswordWithToken({ token, password }) {
  if (!token) {
    const err = new Error('Password reset token is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const resetRecord = await PasswordReset.findOne({
    tokenHash,
    usedAt: null,
  });

  if (!resetRecord) {
    const err = new Error('This password reset link is invalid or has already been used.');
    err.status = 410;
    err.code = 'INVALID_TOKEN';
    throw err;
  }

  if (resetRecord.expiresAt < now) {
    const err = new Error('This password reset link has expired.');
    err.status = 410;
    err.code = 'EXPIRED_TOKEN';
    throw err;
  }

  const user = await User.findById(resetRecord.userId);
  if (!user) {
    const err = new Error('User account not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Validate password rules
  const passCheck = validatePassword(password, user.email);
  if (!passCheck.valid) {
    const err = new Error('Password does not meet security rules.');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    err.fields = { password: passCheck.failedRules.join(' ') };
    throw err;
  }

  const { hash, salt } = await hashPassword(password);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  user.failedLogins = 0;
  user.lockedUntil = null;
  await user.save();

  // Mark token as used
  resetRecord.usedAt = now;
  await resetRecord.save();

  // Terminate all existing sessions for this user per Section 4
  try {
    const db = mongoose.connection.db;
    if (db) {
      await db.collection('sessions').deleteMany({
        $or: [
          { 'session.userId': user._id.toString() },
          { session: { $regex: user._id.toString() } },
        ],
      });
    }
  } catch (e) {
    console.warn('[Auth] Session invalidation error:', e.message);
  }

  return { success: true };
}

async function changeUserPassword({ userId, currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    const err = new Error('The current password entered is incorrect.');
    err.status = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const passCheck = validatePassword(newPassword, user.email);
  if (!passCheck.valid) {
    const err = new Error('New password does not meet security rules.');
    err.status = 400;
    err.code = 'WEAK_PASSWORD';
    err.fields = { newPassword: passCheck.failedRules.join(' ') };
    throw err;
  }

  const { hash, salt } = await hashPassword(newPassword);
  user.passwordHash = hash;
  user.passwordSalt = salt;
  await user.save();

  return { success: true };
}

module.exports = {
  getSetupStatus,
  setupFirstAdmin,
  loginUser,
  requestPasswordReset,
  resetPasswordWithToken,
  changeUserPassword,
};
