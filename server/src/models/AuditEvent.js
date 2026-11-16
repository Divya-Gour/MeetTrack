// server/src/models/AuditEvent.js
import mongoose from 'mongoose';

const AuditEventSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, required: true },
  hash: { type: String },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.models.AuditEvent || mongoose.model('AuditEvent', AuditEventSchema);

