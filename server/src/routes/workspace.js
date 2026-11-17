// server/src/routes/workspace.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { Workspace } = require('../models');

// GET /api/workspace per Section 6.2
router.get('/workspace', requireAuth, async (req, res, next) => {
  try {
    const ws = await Workspace.findById(req.workspaceId);
    if (!ws) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
    }
    res.json({
      data: {
        _id: ws._id,
        name: ws.name,
        description: ws.description,
        timezone: ws.timezone,
        createdAt: ws.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/workspace per Section 6.2 (Admin only)
router.patch('/workspace', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { name, description, timezone } = req.body;
    const ws = await Workspace.findById(req.workspaceId);
    if (!ws) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found.' } });
    }

    if (name) ws.name = name.trim();
    if (description !== undefined) ws.description = description.trim();
    if (timezone) ws.timezone = timezone.trim();
    await ws.save();

    res.json({
      data: {
        _id: ws._id,
        name: ws.name,
        description: ws.description,
        timezone: ws.timezone,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
