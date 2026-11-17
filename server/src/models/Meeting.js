// server/src/models/Meeting.js
const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
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
    type: {
      type: String,
      default: 'regular',
      trim: true,
    },
    startsAt: {
      type: Date,
      required: true,
      index: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      default: '',
    },
    onlineLink: {
      type: String,
      default: '',
    },
    organiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly'],
      default: 'none',
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeetingTemplate',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    reminderSentAt: {
      type: Date,
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

// Meetings index on workspaceId, startsAt per Section 3
meetingSchema.index({ workspaceId: 1, startsAt: 1 });

module.exports = mongoose.model('Meeting', meetingSchema, 'meetings');
