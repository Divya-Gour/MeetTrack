// server/src/services/notification.service.js
const { Notification } = require('../models');

async function getUserNotifications({ workspaceId, userId, unread, type, page = 1, pageSize = 20 }) {
  const query = { workspaceId, userId };

  if (unread === 'true' || unread === true) {
    query.readAt = null;
  }
  if (type) {
    query.type = type;
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
  const skip = (p - 1) * ps;

  const [data, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(ps),
    Notification.countDocuments(query),
  ]);

  return {
    data,
    meta: {
      page: p,
      pageSize: ps,
      total,
    },
  };
}

async function markNotificationRead({ notificationId, userId, workspaceId }) {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, workspaceId },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notif) {
    const err = new Error('Notification not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return notif;
}

async function markNotificationUnread({ notificationId, userId, workspaceId }) {
  const notif = await Notification.findOneAndUpdate(
    { _id: notificationId, userId, workspaceId },
    { $set: { readAt: null } },
    { new: true }
  );
  if (!notif) {
    const err = new Error('Notification not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return notif;
}

async function markAllNotificationsRead({ userId, workspaceId }) {
  const res = await Notification.updateMany(
    { userId, workspaceId, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return { updatedCount: res.modifiedCount };
}

module.exports = {
  getUserNotifications,
  markNotificationRead,
  markNotificationUnread,
  markAllNotificationsRead,
};
