// server/src/routes/decisions.js
import express from 'express';
import Decision from '../models/Decision.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// GET /api/decisions
router.get('/', async (req, res) => {
  try {
    const decisions = await Decision.find({ workspaceId: req.workspaceId }).sort({ createdAt: -1 });
    return res.json(decisions);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch decisions.' });
  }
});

// POST /api/decisions
router.post('/', async (req, res) => {
  try {
    const { title, description, category, impact, voteSummary, meetingTitle, followUps } = req.body;
    if (!title) return res.status(400).json({ error: 'Decision title is required.' });

    const decision = await Decision.create({
      workspaceId: req.workspaceId,
      title,
      description: description || '',
      category: category || 'General',
      impact: impact || 'Medium',
      voteSummary: voteSummary || { for: 4, against: 0, abstain: 0 },
      meetingTitle: meetingTitle || 'Live Governance Review',
      followUps: followUps || [],
    });

    return res.status(201).json(decision);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to record decision.' });
  }
});

export default router;

