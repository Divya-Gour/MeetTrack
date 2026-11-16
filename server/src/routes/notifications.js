// server/src/routes/notifications.js
import express from 'express';
import Notification from '../models/Notification.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const notifications = await Notification.find({ workspaceId: req.workspaceId }).sort({ createdAt: -1 });
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (notif) {
      notif.unread = false;
      await notif.save();
    }
    return res.json(notif);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
});

export default router;

