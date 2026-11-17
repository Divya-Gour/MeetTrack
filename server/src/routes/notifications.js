// server/src/routes/notifications.js
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notification.service');
const { requireAuth } = require('../middleware/auth');

// GET /api/notifications per Section 6.8
router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { unread, type, page, pageSize } = req.query;
    const result = await notificationService.getUserNotifications({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      unread,
      type,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/:id/read per Section 6.8
router.post('/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const notif = await notificationService.markNotificationRead({
      notificationId: req.params.id,
      userId: req.user._id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: notif });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/:id/unread per Section 6.8
router.post('/notifications/:id/unread', requireAuth, async (req, res, next) => {
  try {
    const notif = await notificationService.markNotificationUnread({
      notificationId: req.params.id,
      userId: req.user._id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: notif });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/read-all per Section 6.8
router.post('/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsRead({
      userId: req.user._id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
