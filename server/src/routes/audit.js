// server/src/routes/audit.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { AuditEvent } = require('../models');

// GET /api/audit per Section 6.12 (Admin only)
router.get('/audit', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { event, actorId, from, to, page, pageSize } = req.query;
    const query = { workspaceId: req.workspaceId };

    if (event) query.event = event;
    if (actorId) query.actorId = actorId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 50)); // 50 per page default
    const skip = (p - 1) * ps;

    const [data, total] = await Promise.all([
      AuditEvent.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(ps)
        .populate('actorId', 'name email'),
      AuditEvent.countDocuments(query),
    ]);

    res.json({
      data,
      meta: {
        page: p,
        pageSize: ps,
        total,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
