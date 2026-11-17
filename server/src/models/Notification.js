// server/src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      default: '',
    },
    readAt: {
      type: Date,
      default: null,
      index: true,
    },
    emailStatus: {
      type: String,
      enum: ['not_sent', 'sent', 'failed', 'skipped'],
      default: 'not_sent',
    },
    emailAttempts: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Notifications index on userId, readAt, createdAt per Section 3
notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema, 'notifications');
