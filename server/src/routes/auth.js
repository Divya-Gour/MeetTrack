// server/src/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import Membership from '../models/Membership.js';
import Invitation from '../models/Invitation.js';
import Meeting from '../models/Meeting.js';
import { sendInvitationEmail } from '../services/mailer.js';

const router = express.Router();

// GET /api/auth/status — Checks if a live workspace has already been set up
router.get('/status', async (req, res) => {
  try {
    const wsCount = await Workspace.countDocuments();
    return res.json({ workspaceExists: wsCount > 0 });
  } catch (err) {
    return res.json({ workspaceExists: false });
  }
});

// POST /api/auth/setup — First-run setup (only works when 0 workspaces exist)
router.post('/setup', async (req, res) => {
  try {
    const existingCount = await Workspace.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ error: 'A live workspace is already configured in this environment.' });
    }

    const { admin, workspace, invites, firstMeeting } = req.body;

    if (!admin?.email || !admin?.password || !admin?.name) {
      return res.status(400).json({ error: 'Admin name, email, and password are required.' });
    }

    if (!workspace?.name) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(admin.password, 12);

    const newUser = await User.create({
      name: admin.name,
      email: admin.email.toLowerCase().trim(),
      passwordHash,
    });

    const newWorkspace = await Workspace.create({
      name: workspace.name,
      timezone: workspace.timezone || 'Asia/Kolkata',
      description: workspace.description || '',
      ownerId: newUser._id,
    });

    // Create Admin Membership
    const adminMembership = await Membership.create({
      userId: newUser._id,
      workspaceId: newWorkspace._id,
      role: 'Admin',
      isApprover: true,
      status: 'active',
    });

    // Process optional initial invitations
    if (Array.isArray(invites) && invites.length > 0) {
      for (const inv of invites) {
        if (!inv.email) continue;
        const rawToken = crypto.randomBytes(24).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await Invitation.create({
          workspaceId: newWorkspace._id,
          email: inv.email.toLowerCase().trim(),
          role: inv.role || 'Participant',
          isApprover: Boolean(inv.approver),
          message: inv.message || '',
          tokenHash,
          invitedBy: newUser._id,
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
        });

        // Attempt SMTP dispatch
        await sendInvitationEmail({
          toEmail: inv.email,
          workspaceName: newWorkspace.name,
          inviterName: newUser.name,
          role: inv.role || 'Participant',
          token: rawToken,
        });
      }
    }

    // Process optional first meeting
    if (firstMeeting?.title) {
      await Meeting.create({
        workspaceId: newWorkspace._id,
        title: firstMeeting.title,
        date: firstMeeting.date || new Date().toISOString().split('T')[0],
        time: firstMeeting.time || '10:00 - 11:30',
        location: firstMeeting.location || 'Main Conference Room',
        isOnline: Boolean(firstMeeting.isOnline),
        chairperson: newUser.name,
        agenda: firstMeeting.agenda1 ? [{ id: 'ag-1', title: firstMeeting.agenda1, presenter: newUser.name, durationMin: 30 }] : [],
        attendees: [{ id: String(newUser._id), name: newUser.name, role: 'Admin', status: 'confirmed' }],
      });
    }

    // Establish authenticated session
    req.session.userId = newUser._id;
    req.session.workspaceId = newWorkspace._id;

    return res.status(201).json({
      message: 'Workspace successfully provisioned.',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: adminMembership.role,
        isApprover: adminMembership.isApprover,
      },
      workspace: {
        id: newWorkspace._id,
        name: newWorkspace.name,
        timezone: newWorkspace.timezone,
      },
    });
  } catch (err) {
    console.error('Setup error:', err);
    return res.status(500).json({ error: `Setup failed: ${err.message}` });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Check account lockout (5 failed attempts locks for 15 minutes)
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({
        error: 'Too many failed attempts. Try again in 15 minutes.',
        locked: true,
      });
    }

    if (!user) {
      // Same generic error message for security
      return res.status(401).json({ error: 'The email or password is incorrect.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await user.save();
        return res.status(429).json({
          error: 'Too many failed attempts. Try again in 15 minutes.',
          locked: true,
        });
      }
      await user.save();
      return res.status(401).json({ error: 'The email or password is incorrect.' });
    }

    // Reset failed attempts upon successful authentication
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    // Find active membership
    const membership = await Membership.findOne({ userId: user._id, status: 'active' });
    if (!membership) {
      return res.status(403).json({ error: 'No active workspace membership found for this account.' });
    }

    const workspace = await Workspace.findById(membership.workspaceId);

    // Save session
    req.session.userId = user._id;
    req.session.workspaceId = workspace._id;

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: membership.role,
        isApprover: membership.isApprover,
      },
      workspace: {
        id: workspace._id,
        name: workspace.name,
        timezone: workspace.timezone,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal login error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    return res.json({ message: 'Signed out successfully.' });
  });
});

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (user) {
        const rawToken = crypto.randomBytes(24).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
        user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins
        await user.save();

        console.log(`[PASSWORD_RESET] Token for ${user.email}: ${rawToken}`);
      }
    }
    // Prompt rule: always return the same message whether account exists or not
    return res.json({
      message: 'If an account exists for this email, password reset instructions have been dispatched.',
    });
  } catch (err) {
    return res.json({
      message: 'If an account exists for this email, password reset instructions have been dispatched.',
    });
  }
});

// POST /api/auth/reset
router.post('/reset', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(400).json({ error: 'A valid token and new password (min 8 characters) are required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'This password reset token is invalid or has expired.' });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    return res.json({ message: 'Password has been updated successfully. Please sign in.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ authenticated: false });
  }
  try {
    const user = await User.findById(req.session.userId).select('-passwordHash');
    const membership = await Membership.findOne({ userId: user._id, status: 'active' });
    const workspace = await Workspace.findById(membership?.workspaceId);

    return res.json({
      authenticated: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: membership?.role,
        isApprover: membership?.isApprover,
      },
      workspace: workspace
        ? { id: workspace._id, name: workspace.name, timezone: workspace.timezone }
        : null,
    });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
});

export default router;

