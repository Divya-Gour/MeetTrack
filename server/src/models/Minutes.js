// server/src/models/Minutes.js
import mongoose from 'mongoose';

const MinutesSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  title: { type: String, required: true },
  version: { type: Number, default: 1 },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'published', 'returned'],
    default: 'draft',
  },
  submittedBy: { type: String },
  submittedAt: { type: Date },
  approvedBy: { type: String },
  approvedAt: { type: Date },
  publishedBy: { type: String },
  publishedAt: { type: Date },
  returnedBy: { type: String },
  returnedAt: { type: Date },
  reviewNotes: { type: String },
  sha256Hash: { type: String },
  content: {
    attendanceSummary: { type: String, default: '' },
    discussionPoints: { type: String, default: '' },
    decisions: { type: String, default: '' },
    outcomes: { type: String, default: '' },
  },
  versions: [
    {
      version: Number,
      content: Object,
      modifiedBy: String,
      timestamp: { type: Date, default: Date.now },
      sha256Hash: String,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.models.Minutes || mongoose.model('Minutes', MinutesSchema);

