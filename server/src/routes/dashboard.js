// server/src/routes/dashboard.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { Meeting, Action, Notification, AuditEvent } = require('../models');

// GET /api/dashboard per Section 6.11
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const workspaceId = req.workspaceId;
    const userId = req.user._id;
    const role = req.membership.role;

    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [upcomingMeetings, myActions, unreadCount, recentActivity] = await Promise.all([
      // Upcoming meetings in next 7 days
      Meeting.find({
        workspaceId,
        startsAt: { $gte: now, $lte: next7Days },
        status: { $ne: 'cancelled' },
      })
        .sort({ startsAt: 1 })
        .populate('organiserId', 'name email'),

      // Current user's actions and deadlines in next 7 days
      Action.find({
        workspaceId,
        ownerId: userId,
        status: { $ne: 'completed' },
      })
        .sort({ dueDate: 1 })
        .populate('sourceMeetingId', 'title'),

      // Unread notification count
      Notification.countDocuments({
        workspaceId,
        userId,
        readAt: null,
      }),

      // Activity: auditEvents for admins, notifications for others
      role === 'admin'
        ? AuditEvent.find({ workspaceId }).sort({ createdAt: -1 }).limit(10).populate('actorId', 'name email')
        : Notification.find({ workspaceId, userId }).sort({ createdAt: -1 }).limit(10),
    ]);

    // Role-based summary metric counts
    const totalMeetings = await Meeting.countDocuments({ workspaceId });
    const openActionsCount = await Action.countDocuments({ workspaceId, status: { $ne: 'completed' } });
    const overdueActionsCount = await Action.countDocuments({
      workspaceId,
      status: { $ne: 'completed' },
      dueDate: { $lt: now },
    });

    res.json({
      data: {
        metrics: {
          totalMeetings,
          openActions: openActionsCount,
          overdueActions: overdueActionsCount,
          unreadNotifications: unreadCount,
        },
        upcomingMeetings,
        myActions,
        recentActivity,
        unreadNotificationCount: unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
