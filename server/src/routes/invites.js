// server/src/routes/invites.js
import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import Workspace from '../models/Workspace.js';
import { requireAuth, requireRole, requireWorkspace } from '../middleware/auth.js';
import { sendInvitationEmail } from '../services/mailer.js';

const router = express.Router();

// GET /api/invites/token/:token — Public token verification for Join page
router.get('/token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const invite = await Invitation.findOne({ tokenHash });
    if (!invite) {
      return res.status(404).json({ error: 'Invitation not found.', status: 'invalid' });
    }

    if (invite.status === 'revoked') {
      return res.status(410).json({ error: 'This invitation was revoked.', status: 'revoked' });
    }

    if (invite.status === 'accepted') {
      return res.status(409).json({ error: 'This invitation has already been used.', status: 'accepted' });
    }

    if (invite.expiresAt < new Date()) {
      invite.status = 'expired';
      await invite.save();
      return res.status(410).json({ error: 'This invitation has expired.', status: 'expired' });
    }

    const ws = await Workspace.findById(invite.workspaceId);
    const inviter = await User.findById(invite.invitedBy);

    return res.json({
      workspaceName: ws?.name || 'MeetTrack Workspace',
      email: invite.email,
      role: invite.role,
      isApprover: invite.isApprover,
      inviterName: inviter?.name || 'Workspace Admin',
      status: 'valid',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error resolving invitation token.' });
  }
});

// POST /api/invites/token/:token/accept — Accepts invitation, provisions password, signs in
router.post('/token/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;

    if (!name || !password || password.length < 8) {
      return res.status(400).json({ error: 'Name and valid password (minimum 8 characters) are required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const invite = await Invitation.findOne({ tokenHash, status: 'pending' });

    if (!invite || invite.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This invitation is invalid or has expired.' });
    }

    // Check if user account already exists with this email
    let user = await User.findOne({ email: invite.email });
    if (user) {
      // User exists, update password if requested
      user.passwordHash = await bcrypt.hash(password, 12);
      user.name = name;
      await user.save();
    } else {
      user = await User.create({
        name,
        email: invite.email,
        passwordHash: await bcrypt.hash(password, 12),
      });
    }

    // Add or activate Membership
    let membership = await Membership.findOne({ userId: user._id, workspaceId: invite.workspaceId });
    if (membership) {
      membership.role = invite.role;
      membership.isApprover = invite.isApprover;
      membership.status = 'active';
      await membership.save();
    } else {
      membership = await Membership.create({
        userId: user._id,
        workspaceId: invite.workspaceId,
        role: invite.role,
        isApprover: invite.isApprover,
        status: 'active',
      });
    }

    // Mark invitation accepted
    invite.status = 'accepted';
    await invite.save();

    const ws = await Workspace.findById(invite.workspaceId);

    // Sign user in automatically
    req.session.userId = user._id;
    req.session.workspaceId = ws._id;

    return res.status(201).json({
      message: 'Invitation accepted successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: membership.role,
        isApprover: membership.isApprover,
      },
      workspace: {
        id: ws._id,
        name: ws.name,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: `Accepting invite failed: ${err.message}` });
  }
});

// Authenticated Invite Endpoints
router.use(requireAuth, requireWorkspace);

// GET /api/invites — Lists invitations for the current workspace
router.get('/', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const invites = await Invitation.find({ workspaceId: req.workspaceId })
      .sort({ createdAt: -1 })
      .populate('invitedBy', 'name');

    // Auto-update expired items
    const now = new Date();
    const updated = invites.map((inv) => {
      const obj = inv.toObject();
      if (obj.status === 'pending' && obj.expiresAt < now) {
        obj.status = 'expired';
      }
      return obj;
    });

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch invitations.' });
  }
});

// POST /api/invites — Dispatches new invitation
router.post('/', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const { email, role, approver, message } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user is already an active member of this workspace
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      const existingMembership = await Membership.findOne({
        userId: existingUser._id,
        workspaceId: req.workspaceId,
        status: 'active',
      });
      if (existingMembership) {
        return res.status(400).json({ error: 'This person is already in the workspace.' });
      }
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const newInvite = await Invitation.create({
      workspaceId: req.workspaceId,
      email: cleanEmail,
      role: role || 'Participant',
      isApprover: Boolean(approver),
      message: message || '',
      tokenHash,
      invitedBy: req.user._id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      status: 'pending',
    });

    const ws = await Workspace.findById(req.workspaceId);

    // Send email
    const mailResult = await sendInvitationEmail({
      toEmail: cleanEmail,
      workspaceName: ws?.name || 'MeetTrack Workspace',
      inviterName: req.user.name,
      role: newInvite.role,
      token: rawToken,
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const copyLink = `${appUrl}/join/${rawToken}`;

    return res.status(201).json({
      message: 'Invitation created successfully.',
      invite: newInvite,
      emailSent: mailResult.sent,
      copyLink, // Returned to allow admin to copy link directly if SMTP is not configured!
    });
  } catch (err) {
    return res.status(500).json({ error: `Invite failed: ${err.message}` });
  }
});

// POST /api/invites/:id/resend
router.post('/:id/resend', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const invite = await Invitation.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!invite) return res.status(404).json({ error: 'Invitation not found.' });

    const rawToken = crypto.randomBytes(24).toString('hex');
    invite.tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    invite.expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    invite.status = 'pending';
    await invite.save();

    const ws = await Workspace.findById(req.workspaceId);

    const mailResult = await sendInvitationEmail({
      toEmail: invite.email,
      workspaceName: ws?.name || 'MeetTrack Workspace',
      inviterName: req.user.name,
      role: invite.role,
      token: rawToken,
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    return res.json({
      message: 'Invitation resent.',
      copyLink: `${appUrl}/join/${rawToken}`,
      emailSent: mailResult.sent,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resend invitation.' });
  }
});

// POST /api/invites/:id/revoke
router.post('/:id/revoke', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const invite = await Invitation.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!invite) return res.status(404).json({ error: 'Invitation not found.' });

    invite.status = 'revoked';
    await invite.save();

    return res.json({ message: 'Invitation has been revoked immediately.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to revoke invitation.' });
  }
});

export default router;

