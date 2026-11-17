// server/src/routes/decisions.js
const express = require('express');
const router = express.Router();
const decisionService = require('../services/decision.service');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/decisions per Section 6.7
router.get('/decisions', requireAuth, async (req, res, next) => {
  try {
    const { q, from, to } = req.query;
    const decisions = await decisionService.listDecisions({
      workspaceId: req.workspaceId,
      q,
      from,
      to,
    });
    res.json({ data: decisions });
  } catch (err) {
    next(err);
  }
});

// POST /api/decisions per Section 6.7 (coordinator or admin)
router.post('/decisions', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { title, rationale, decisionDate, sourceMeetingId, linkedActionIds } = req.body;
    const decision = await decisionService.createDecision({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      title,
      rationale,
      decisionDate,
      sourceMeetingId,
      linkedActionIds,
    });
    res.status(201).json({ data: decision });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/decisions/:id per Section 6.7 (coordinator or admin)
router.patch('/decisions/:id', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const updated = await decisionService.updateDecision({
      decisionId: req.params.id,
      workspaceId: req.workspaceId,
      data: req.body,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/decisions/:id per Section 6.7 (coordinator or admin)
router.delete('/decisions/:id', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const result = await decisionService.deleteDecision({
      decisionId: req.params.id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/followup per Section 6.7
router.get('/followup', requireAuth, async (req, res, next) => {
  try {
    const items = await decisionService.getFollowUpItems(req.workspaceId);
    res.json({ data: items });
  } catch (err) {
    next(err);
  }
});

// POST /api/followup/:id/decide per Section 6.7
router.post('/followup/:id/decide', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { decision, text, targetMeetingId } = req.body;
    const result = await decisionService.decideFollowUp({
      followUpId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      decision,
      text,
      targetMeetingId,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/followup/save-to-agenda per Section 6.7
router.post('/followup/save-to-agenda', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { meetingId } = req.body;
    if (!meetingId) {
      return res.status(400).json({
        error: { code: 'VALIDATION_FAILED', message: 'meetingId is required to save follow-ups.' },
      });
    }
    const added = await decisionService.saveFollowUpToAgenda({
      workspaceId: req.workspaceId,
      meetingId,
    });
    res.json({ data: added });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
