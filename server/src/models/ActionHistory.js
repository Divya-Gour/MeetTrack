// server/src/models/ActionHistory.js
const mongoose = require('mongoose');

const actionHistorySchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    actionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Action',
      required: true,
      index: true,
    },
    event: {
      type: String,
      enum: [
        'created',
        'status_changed',
        'reassigned',
        'blocker_reported',
        'blocker_resolved',
        'blocker_escalated',
      ],
      required: true,
    },
    from: {
      type: String,
      default: '',
    },
    to: {
      type: String,
      default: '',
    },
    reason: {
      type: String,
      default: '',
    },
    byUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

actionHistorySchema.index({ workspaceId: 1, actionId: 1, createdAt: 1 });

module.exports = mongoose.model('ActionHistory', actionHistorySchema, 'actionHistory');
