// server/src/models/Invitation.js
import mongoose from 'mongoose';

const InvitationSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['Coordinator', 'Participant'], default: 'Participant', required: true },
  isApprover: { type: Boolean, default: false },
  message: { type: String, maxlength: 300, default: '' },
  tokenHash: { type: String, required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'expired', 'revoked'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Invitation || mongoose.model('Invitation', InvitationSchema);

