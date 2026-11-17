// server/src/models/AssistantMessage.js
const mongoose = require('mongoose');

const assistantMessageSchema = new mongoose.Schema(
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
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    pageContext: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 30 * 24 * 60 * 60, // 30 days TTL per Section 3
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('AssistantMessage', assistantMessageSchema, 'assistantMessages');
