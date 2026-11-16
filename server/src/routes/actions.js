// server/src/routes/actions.js
import express from 'express';
import Action from '../models/Action.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// GET /api/actions
router.get('/', async (req, res) => {
  try {
    const actions = await Action.find({ workspaceId: req.workspaceId }).sort({ deadline: 1 });
    return res.json(actions);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch actions.' });
  }
});

// POST /api/actions
router.post('/', async (req, res) => {
  try {
    const { title, dri, deadline, priority, notes, sourceMeeting } = req.body;
    if (!title || !dri || !deadline) {
      return res.status(400).json({ error: 'Title, single DRI, and deadline are required.' });
    }

    const action = await Action.create({
      workspaceId: req.workspaceId,
      title,
      dri,
      deadline,
      priority: priority || 'Medium',
      notes: notes || '',
      sourceMeeting: sourceMeeting || '',
      status: 'pending',
    });

    return res.status(201).json(action);
  } catch (err) {
    return res.status(500).json({ error: `Create action failed: ${err.message}` });
  }
});

// PATCH /api/actions/:id
router.patch('/:id', async (req, res) => {
  try {
    const action = await Action.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!action) return res.status(404).json({ error: 'Action item not found.' });

    Object.assign(action, req.body);
    await action.save();

    return res.json(action);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update action.' });
  }
});

export default router;

