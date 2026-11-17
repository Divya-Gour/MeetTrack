// server/src/models/MeetingTemplate.js
const mongoose = require('mongoose');

const meetingTemplateSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      default: 'regular',
    },
    agenda: [
      {
        title: { type: String, required: true },
        minutes: { type: Number, default: 15 },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('MeetingTemplate', meetingTemplateSchema, 'meetingTemplates');
