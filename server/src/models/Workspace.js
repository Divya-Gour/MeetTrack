// server/src/models/Workspace.js
import mongoose from 'mongoose';

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  timezone: { type: String, default: 'Asia/Kolkata' },
  description: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  quorumThreshold: { type: Number, default: 4 },
  tamperSealEnabled: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Workspace || mongoose.model('Workspace', WorkspaceSchema);

