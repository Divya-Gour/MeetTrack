// server/src/routes/actions.js
const express = require('express');
const router = express.Router();
const actionService = require('../services/action.service');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/actions per Section 6.6
router.get('/actions', requireAuth, async (req, res, next) => {
  try {
    const { owner, status, priority, overdue, meetingId } = req.query;
    const actions = await actionService.listActions({
      workspaceId: req.workspaceId,
      owner,
      status,
      priority,
      overdue,
      meetingId,
    });
    res.json({ data: actions });
  } catch (err) {
    next(err);
  }
});

// POST /api/actions per Section 6.6 (coordinator or admin)
router.post('/actions', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { title, description, sourceMeetingId, decisionId, ownerId, priority, dueDate } = req.body;
    const action = await actionService.createAction({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      title,
      description,
      sourceMeetingId,
      decisionId,
      ownerId,
      priority,
      dueDate,
    });
    res.status(201).json({ data: action });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/actions/:id per Section 6.6 (coordinator or admin)
router.patch('/actions/:id', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const updated = await actionService.updateAction({
      actionId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      data: req.body,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/actions/:id/status per Section 6.6
router.post('/actions/:id/status', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await actionService.updateActionStatus({
      actionId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      userRole: req.membership.role,
      status,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/actions/:id/reassign per Section 6.6 (coordinator or admin)
router.post('/actions/:id/reassign', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { ownerId, reason } = req.body;
    const updated = await actionService.reassignAction({
      actionId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      ownerId,
      reason,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/actions/:id/blockers per Section 6.6
router.post('/actions/:id/blockers', requireAuth, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const blocker = await actionService.reportBlocker({
      actionId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      userRole: req.membership.role,
      reason,
    });
    res.status(201).json({ data: blocker });
  } catch (err) {
    next(err);
  }
});

// POST /api/blockers/:id/resolve per Section 6.6 (coordinator or admin)
router.post('/blockers/:id/resolve', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const resolved = await actionService.resolveBlocker({
      blockerId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: resolved });
  } catch (err) {
    next(err);
  }
});

// POST /api/blockers/:id/escalate per Section 6.6 (coordinator or admin)
router.post('/blockers/:id/escalate', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const escalated = await actionService.escalateBlocker({
      blockerId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: escalated });
  } catch (err) {
    next(err);
  }
});

// GET /api/actions/:id/history per Section 6.6
router.get('/actions/:id/history', requireAuth, async (req, res, next) => {
  try {
    const history = await actionService.getActionHistory({
      actionId: req.params.id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: history });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
