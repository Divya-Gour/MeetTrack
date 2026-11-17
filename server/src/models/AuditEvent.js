// server/src/models/AuditEvent.js
const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    event: {
      type: String,
      enum: [
        'workspace_created',
        'minutes_approved',
        'minutes_published',
        'role_changed',
        'action_reassigned',
        'version_restored',
        'invite_sent',
        'invite_revoked',
        'invite_accepted',
        'member_removed',
      ],
      required: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// AuditEvents index on workspaceId, createdAt per Section 3
auditEventSchema.index({ workspaceId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema, 'auditEvents');
