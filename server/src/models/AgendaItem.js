// server/src/models/AgendaItem.js
const mongoose = require('mongoose');

const agendaItemSchema = new mongoose.Schema(
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
    title: {
      type: String,
      required: true,
      trim: true,
    },
    presenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    minutes: {
      type: Number,
      default: 15,
    },
    order: {
      type: Number,
      required: true,
      default: 1,
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

agendaItemSchema.index({ workspaceId: 1, meetingId: 1, order: 1 });

module.exports = mongoose.model('AgendaItem', agendaItemSchema, 'agendaItems');
