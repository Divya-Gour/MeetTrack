// server/src/models/Attendance.js
const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'not_marked'],
      default: 'not_marked',
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

// Attendance unique on meetingId + userId per Section 3
attendanceSchema.index({ meetingId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema, 'attendance');
