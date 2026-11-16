// server/src/models/Action.js
import mongoose from 'mongoose';

const ActionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  title: { type: String, required: true },
  dri: { type: String, required: true }, // Single Directly Responsible Individual mandate
  driId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  deadline: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'blocked', 'overdue', 'cancelled'],
    default: 'pending',
  },
  progressPercent: { type: Number, default: 0 },
  sourceMeeting: { type: String },
  notes: { type: String },
  blocker: {
    isBlocked: { type: Boolean, default: false },
    reason: { type: String },
    reportedAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Action || mongoose.model('Action', ActionSchema);

