// server/src/models/Decision.js
const mongoose = require('mongoose');

const decisionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    rationale: {
      type: String,
      required: true,
      trim: true,
    },
    decisionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sourceMeetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      default: null,
    },
    linkedActionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Action',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Decisions full-text index on title and rationale per Section 3
decisionSchema.index({ title: 'text', rationale: 'text' });
decisionSchema.index({ workspaceId: 1, decisionDate: -1 });

module.exports = mongoose.model('Decision', decisionSchema, 'decisions');
