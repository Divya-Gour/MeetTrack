// server/src/services/invite.service.js
const { Invitation, User, Membership, Workspace, AuditEvent } = require('../models');
const { generateToken, hashToken } = require('../utils/tokens');
const { validatePassword, hashPassword, verifyPassword } = require('../utils/password');
const { isEmail } = require('../utils/validate');
const { sendEmail, buildInvitationEmail } = require('./email.service');
const config = require('../config');

async function createInvitation({ workspaceId, inviterId, email, role = 'participant', approver = false, message = '' }) {
  if (!email || !isEmail(email)) {
    const err = new Error('A valid email address is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { email: 'Enter a valid email address.' };
    throw err;
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check if already a member per Section 6.1
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const existingMembership = await Membership.findOne({
      workspaceId,
      userId: existingUser._id,
      status: 'active',
    });
    if (existingMembership) {
      const err = new Error('This person is already a member of this workspace.');
      err.status = 409;
      err.code = 'ALREADY_MEMBER';
      throw err;
    }
  }

  // Revoke earlier pending invitation if exists per Section 6.1
  await Invitation.updateMany(
    { workspaceId, email: cleanEmail, status: 'pending' },
    { $set: { status: 'revoked' } }
  );

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  const inviter = await User.findById(inviterId);
  const workspace = await Workspace.findById(workspaceId);

  const invitation = await Invitation.create({
    workspaceId,
    email: cleanEmail,
    role,
    approver: Boolean(approver),
    tokenHash,
    status: 'pending',
    invitedBy: inviterId,
    message: message || '',
    expiresAt,
  });

  const inviteLink = `${config.appUrl}/join/${token}`;
  const emailText = buildInvitationEmail({
    workspaceName: workspace ? workspace.name : 'MeetTrack Workspace',
    inviteLink,
    role,
    inviterName: inviter ? inviter.name : 'A committee administrator',
  });

  const emailRes = await sendEmail({
    to: cleanEmail,
    subject: `Invitation to join ${workspace ? workspace.name : 'MeetTrack'}`,
    text: emailText,
  });

  // Write audit event per Section 6.1
  await AuditEvent.create({
    workspaceId,
    actorId: inviterId,
    event: 'invite_sent',
    targetType: 'Invitation',
    targetId: invitation._id,
    details: { email: cleanEmail, role, approver: Boolean(approver) },
  });

  const resp = {
    ...invitation.toObject(),
    emailStatus: emailRes.status,
  };

  // If email was skipped (e.g. SMTP not configured), surface link to sender per Section 6.1
  if (emailRes.status === 'skipped' || !config.isEmailEnabled) {
    resp.inviteLink = inviteLink;
  }

  return resp;
}

async function listInvitations(workspaceId) {
  const list = await Invitation.find({ workspaceId }).sort({ createdAt: -1 }).populate('invitedBy', 'name email');
  const now = new Date();

  return list.map((inv) => {
    const plain = inv.toObject();
    if (plain.status === 'pending' && plain.expiresAt && new Date(plain.expiresAt) < now) {
      plain.status = 'expired';
    }
    return plain;
  });
}

async function resendInvitation({ inviteId, workspaceId, inviterId }) {
  const inv = await Invitation.findOne({ _id: inviteId, workspaceId });
  if (!inv) {
    const err = new Error('Invitation not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

  inv.tokenHash = tokenHash;
  inv.expiresAt = expiresAt;
  inv.status = 'pending';
  await inv.save();

  const workspace = await Workspace.findById(workspaceId);
  const inviter = await User.findById(inviterId);
  const inviteLink = `${config.appUrl}/join/${token}`;

  const emailText = buildInvitationEmail({
    workspaceName: workspace ? workspace.name : 'MeetTrack Workspace',
    inviteLink,
    role: inv.role,
    inviterName: inviter ? inviter.name : 'A committee administrator',
  });

  const emailRes = await sendEmail({
    to: inv.email,
    subject: `Invitation to join ${workspace ? workspace.name : 'MeetTrack'} (Resent)`,
    text: emailText,
  });

  const resp = {
    ...inv.toObject(),
    emailStatus: emailRes.status,
  };
  if (emailRes.status === 'skipped' || !config.isEmailEnabled) {
    resp.inviteLink = inviteLink;
  }
  return resp;
}

async function revokeInvitation({ inviteId, workspaceId, inviterId }) {
  const inv = await Invitation.findOne({ _id: inviteId, workspaceId, status: 'pending' });
  if (!inv) {
    const err = new Error('Only pending invitations can be revoked.');
    err.status = 400;
    err.code = 'INVALID_STATE';
    throw err;
  }

  inv.status = 'revoked';
  await inv.save();

  await AuditEvent.create({
    workspaceId,
    actorId: inviterId,
    event: 'invite_revoked',
    targetType: 'Invitation',
    targetId: inv._id,
    details: { email: inv.email },
  });

  return inv;
}

async function getInviteByToken(token) {
  if (!token) {
    const err = new Error('Invitation token is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  const tokenHash = hashToken(token);
  const inv = await Invitation.findOne({ tokenHash }).populate('workspaceId', 'name');

  if (!inv) {
    const err = new Error('Invitation not found.');
    err.status = 404;
    err.code = 'INVITE_NOT_FOUND';
    throw err;
  }

  const now = new Date();
  if (inv.status === 'accepted') {
    const err = new Error('This invitation has already been used.');
    err.status = 410;
    err.code = 'INVITE_USED';
    throw err;
  }
  if (inv.status === 'revoked') {
    const err = new Error('This invitation has been revoked by an administrator.');
    err.status = 410;
    err.code = 'INVITE_REVOKED';
    throw err;
  }
  if (inv.status === 'expired' || (inv.expiresAt && inv.expiresAt < now)) {
    const err = new Error('This invitation link has expired.');
    err.status = 410;
    err.code = 'INVITE_EXPIRED';
    throw err;
  }

  return {
    workspaceName: inv.workspaceId ? inv.workspaceId.name : 'MeetTrack Workspace',
    role: inv.role,
    email: inv.email,
    status: 'pending',
  };
}

async function acceptInvitation({ token, name, password }) {
  if (!token) {
    const err = new Error('Invitation token is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  const tokenHash = hashToken(token);
  const inv = await Invitation.findOne({ tokenHash });

  if (!inv) {
    const err = new Error('Invitation not found.');
    err.status = 404;
    err.code = 'INVITE_NOT_FOUND';
    throw err;
  }

  const now = new Date();
  if (inv.status === 'accepted') {
    const err = new Error('This invitation has already been accepted.');
    err.status = 410;
    err.code = 'INVITE_USED';
    throw err;
  }
  if (inv.status === 'revoked') {
    const err = new Error('This invitation has been revoked.');
    err.status = 410;
    err.code = 'INVITE_REVOKED';
    throw err;
  }
  if (inv.status === 'expired' || (inv.expiresAt && inv.expiresAt < now)) {
    const err = new Error('This invitation has expired.');
    err.status = 410;
    err.code = 'INVITE_EXPIRED';
    throw err;
  }

  let user = await User.findOne({ email: inv.email });

  if (!user) {
    if (!name || !name.trim()) {
      const err = new Error('Full name is required.');
      err.status = 400;
      err.code = 'VALIDATION_FAILED';
      err.fields = { name: 'Full name is required.' };
      throw err;
    }

    const passCheck = validatePassword(password, inv.email);
    if (!passCheck.valid) {
      const err = new Error('Password does not meet security rules.');
      err.status = 400;
      err.code = 'WEAK_PASSWORD';
      err.fields = { password: passCheck.failedRules.join(' ') };
      throw err;
    }

    const { hash, salt } = await hashPassword(password);
    user = await User.create({
      name: name.trim(),
      email: inv.email,
      passwordHash: hash,
      passwordSalt: salt,
    });
  } else {
    // If user exists, check provided password
    if (password) {
      const isValid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
      if (!isValid) {
        const err = new Error('Incorrect password for this existing user account.');
        err.status = 401;
        err.code = 'INVALID_CREDENTIALS';
        throw err;
      }
    }
  }

  // Create membership with invited role and approver flag per Section 6.1
  const membership = await Membership.findOneAndUpdate(
    { workspaceId: inv.workspaceId, userId: user._id },
    {
      role: inv.role,
      approver: inv.approver,
      status: 'active',
      joinedAt: now,
    },
    { upsert: true, new: true }
  ).populate('workspaceId');

  inv.status = 'accepted';
  inv.acceptedAt = now;
  await inv.save();

  // Audit event invite_accepted per Section 6.1
  await AuditEvent.create({
    workspaceId: inv.workspaceId,
    actorId: user._id,
    event: 'invite_accepted',
    targetType: 'User',
    targetId: user._id,
    details: { email: user.email, role: inv.role },
  });

  return {
    user: user.toJSON(),
    workspace: membership.workspaceId,
    membership,
  };
}

module.exports = {
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
  getInviteByToken,
  acceptInvitation,
};
