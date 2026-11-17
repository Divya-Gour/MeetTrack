// server/src/models/MinutesVersion.js
const mongoose = require('mongoose');

const minutesVersionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    minutesId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Minutes',
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
    },
    body: {
      type: String,
      default: '',
    },
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    changeNote: {
      type: String,
      default: '',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    restoredFrom: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

// Unique on minutesId, version per Section 3
minutesVersionSchema.index({ minutesId: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('MinutesVersion', minutesVersionSchema, 'minutesVersions');
