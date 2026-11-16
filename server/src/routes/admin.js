// server/src/routes/admin.js
import express from 'express';
import User from '../models/User.js';
import Membership from '../models/Membership.js';
import AuditEvent from '../models/AuditEvent.js';
import { requireAuth, requireRole, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// GET /api/admin/members — Lists members in workspace
router.get('/members', requireRole('Admin'), async (req, res) => {
  try {
    const memberships = await Membership.find({ workspaceId: req.workspaceId }).populate('userId', 'name email createdAt');
    const members = memberships.map((m) => ({
      id: m.userId?._id,
      name: m.userId?.name,
      email: m.userId?.email,
      role: m.role,
      isApprover: m.isApprover,
      status: m.status,
      joinedAt: m.joinedAt,
    }));
    return res.json(members);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch members.' });
  }
});

// PATCH /api/admin/members/:userId — Update role or approver clearance
router.patch('/members/:userId', requireRole('Admin'), async (req, res) => {
  try {
    const { role, isApprover } = req.body;
    const membership = await Membership.findOne({
      userId: req.params.userId,
      workspaceId: req.workspaceId,
    });
    if (!membership) return res.status(404).json({ error: 'Member not found.' });

    if (role) membership.role = role;
    if (typeof isApprover === 'boolean') membership.isApprover = isApprover;
    await membership.save();

    return res.json(membership);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update member.' });
  }
});

// GET /api/admin/audit — Immutable audit log
router.get('/audit', requireRole('Admin'), async (req, res) => {
  try {
    const logs = await AuditEvent.find({ workspaceId: req.workspaceId }).sort({ timestamp: -1 }).limit(100);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit log.' });
  }
});

export default router;

