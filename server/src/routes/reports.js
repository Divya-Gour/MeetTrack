// server/src/routes/reports.js
import express from 'express';
import Meeting from '../models/Meeting.js';
import Action from '../models/Action.js';
import Minutes from '../models/Minutes.js';
import Decision from '../models/Decision.js';
import { requireAuth, requireRole, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// GET /api/reports — Computes live governance counts & KPIs
router.get('/', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const totalMeetings = await Meeting.countDocuments({ workspaceId: req.workspaceId });
    const quorumMetMeetings = await Meeting.countDocuments({ workspaceId: req.workspaceId, quorumMet: true });
    const totalActions = await Action.countDocuments({ workspaceId: req.workspaceId });
    const completedActions = await Action.countDocuments({ workspaceId: req.workspaceId, status: 'completed' });
    const blockedActions = await Action.countDocuments({ workspaceId: req.workspaceId, status: 'blocked' });
    const totalDecisions = await Decision.countDocuments({ workspaceId: req.workspaceId });
    const publishedMinutes = await Minutes.countDocuments({ workspaceId: req.workspaceId, status: 'published' });

    const quorumRate = totalMeetings > 0 ? Math.round((quorumMetMeetings / totalMeetings) * 100) : 100;
    const actionCompletionRate = totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 100;

    return res.json({
      totalMeetings,
      quorumMetMeetings,
      quorumRate,
      totalActions,
      completedActions,
      blockedActions,
      actionCompletionRate,
      totalDecisions,
      publishedMinutes,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate governance report.' });
  }
});

export default router;

