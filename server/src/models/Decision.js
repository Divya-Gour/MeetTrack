// server/src/models/Decision.js
import mongoose from 'mongoose';

const DecisionSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
  meetingTitle: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  category: { type: String, default: 'General' },
  impact: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  voteSummary: {
    for: { type: Number, default: 0 },
    against: { type: Number, default: 0 },
    abstain: { type: Number, default: 0 },
  },
  sealedHash: { type: String },
  status: { type: String, default: 'Active' },
  followUps: [
    {
      id: String,
      title: String,
      assignedTo: String,
      status: String,
    },
  ],
  recordedAt: { type: String, default: () => new Date().toISOString().split('T')[0] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Decision || mongoose.model('Decision', DecisionSchema);

