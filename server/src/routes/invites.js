// server/src/routes/invites.js
const express = require('express');
const router = express.Router();
const inviteService = require('../services/invite.service');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Membership, AuditEvent, User } = require('../models');

// POST /api/invites per Section 6.1 (admin or coordinator)
router.post('/invites', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { email, role, approver, message } = req.body;

    // Coordinators cannot invite an admin per Section 6.1
    if (role === 'admin' && req.membership.role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Only workspace administrators can invite new administrators.',
        },
      });
    }

    const invitation = await inviteService.createInvitation({
      workspaceId: req.workspaceId,
      inviterId: req.user._id,
      email,
      role: role || 'participant',
      approver: Boolean(approver),
      message,
    });

    res.status(201).json({ data: invitation });
  } catch (err) {
    next(err);
  }
});

// GET /api/invites per Section 6.1
router.get('/invites', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const invites = await inviteService.listInvitations(req.workspaceId);
    res.json({ data: invites });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/:id/resend per Section 6.1
router.post('/invites/:id/resend', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const result = await inviteService.resendInvitation({
      inviteId: req.params.id,
      workspaceId: req.workspaceId,
      inviterId: req.user._id,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/:id/revoke per Section 6.1
router.post('/invites/:id/revoke', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const result = await inviteService.revokeInvitation({
      inviteId: req.params.id,
      workspaceId: req.workspaceId,
      inviterId: req.user._id,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/invites/token/:token per Section 6.1 (Public endpoint)
router.get('/invites/token/:token', async (req, res, next) => {
  try {
    const result = await inviteService.getInviteByToken(req.params.token);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/invites/token/:token/accept per Section 6.1 (Public endpoint)
router.post('/invites/token/:token/accept', async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const result = await inviteService.acceptInvitation({
      token: req.params.token,
      name,
      password,
    });

    // Establish session for accepted user
    req.session.userId = result.user._id.toString();
    req.session.workspaceId = result.workspace._id.toString();

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/members per Section 6.1
router.get('/members', requireAuth, async (req, res, next) => {
  try {
    const members = await Membership.find({ workspaceId: req.workspaceId })
      .populate('userId', 'name email createdAt')
      .sort({ joinedAt: 1 });

    const formatted = members.map((m) => ({
      _id: m._id,
      userId: m.userId ? m.userId._id : null,
      name: m.userId ? m.userId.name : 'Unknown',
      email: m.userId ? m.userId.email : 'Unknown',
      role: m.role,
      approver: m.approver,
      status: m.status,
      joinedAt: m.joinedAt,
    }));

    res.json({ data: formatted });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/members/:id per Section 6.1 (Admin only)
router.patch('/members/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { role, approver, status } = req.body;
    const membership = await Membership.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!membership) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found.' } });
    }

    // Check last remaining admin rule per Section 6.1
    if (membership.role === 'admin' && (role !== 'admin' || status === 'suspended')) {
      const activeAdminCount = await Membership.countDocuments({
        workspaceId: req.workspaceId,
        role: 'admin',
        status: 'active',
        _id: { $ne: membership._id },
      });
      if (activeAdminCount === 0) {
        return res.status(400).json({
          error: {
            code: 'LAST_ADMIN',
            message: 'Cannot demote or suspend the last active administrator of this workspace.',
          },
        });
      }
    }

    const oldRole = membership.role;
    if (role) membership.role = role;
    if (approver !== undefined) membership.approver = Boolean(approver);
    if (status) membership.status = status;
    await membership.save();

    await AuditEvent.create({
      workspaceId: req.workspaceId,
      actorId: req.user._id,
      event: 'role_changed',
      targetType: 'Membership',
      targetId: membership._id,
      details: { oldRole, newRole: membership.role, approver: membership.approver, status: membership.status },
    });

    res.json({ data: membership });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/members/:id per Section 6.1 (Admin only)
router.delete('/members/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const membership = await Membership.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!membership) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Member not found.' } });
    }

    // Check last remaining admin rule per Section 6.1
    if (membership.role === 'admin') {
      const activeAdminCount = await Membership.countDocuments({
        workspaceId: req.workspaceId,
        role: 'admin',
        status: 'active',
        _id: { $ne: membership._id },
      });
      if (activeAdminCount === 0) {
        return res.status(400).json({
          error: {
            code: 'LAST_ADMIN',
            message: 'Cannot remove the last active administrator of this workspace.',
          },
        });
      }
    }

    await Membership.findByIdAndDelete(membership._id);

    await AuditEvent.create({
      workspaceId: req.workspaceId,
      actorId: req.user._id,
      event: 'member_removed',
      targetType: 'Membership',
      targetId: membership._id,
      details: { userId: membership.userId, role: membership.role },
    });

    res.json({ data: { message: 'Member removed successfully.' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
