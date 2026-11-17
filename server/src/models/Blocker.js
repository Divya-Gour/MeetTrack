// server/src/models/Blocker.js
const mongoose = require('mongoose');

const blockerSchema = new mongoose.Schema(
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
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'escalated', 'resolved'],
      default: 'open',
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

blockerSchema.index({ workspaceId: 1, actionId: 1, status: 1 });

module.exports = mongoose.model('Blocker', blockerSchema, 'blockers');
