// server/src/models/FollowUpItem.js
const mongoose = require('mongoose');

const followUpItemSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ['action', 'decision'],
      required: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['suggested', 'accepted', 'edited', 'dismissed'],
      default: 'suggested',
      index: true,
    },
    targetMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

followUpItemSchema.index({ workspaceId: 1, status: 1 });

module.exports = mongoose.model('FollowUpItem', followUpItemSchema, 'followUpItems');
