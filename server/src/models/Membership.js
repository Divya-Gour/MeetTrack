// server/src/models/Membership.js
const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
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
    role: {
      type: String,
      enum: ['admin', 'coordinator', 'participant'],
      required: true,
      default: 'participant',
    },
    approver: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Unique on workspaceId + userId
membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Membership', membershipSchema, 'memberships');
