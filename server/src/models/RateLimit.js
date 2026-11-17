// server/src/models/RateLimit.js
const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    count: {
      type: Number,
      default: 1,
    },
    windowStart: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // TTL index per Section 3
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('RateLimit', rateLimitSchema, 'rate_limits');
