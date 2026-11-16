// server/src/models/Membership.js
import mongoose from 'mongoose';

const MembershipSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  role: {
    type: String,
    enum: ['Admin', 'Coordinator', 'Participant'],
    default: 'Participant',
    required: true,
  },
  isApprover: { type: Boolean, default: false },
  responsibility: { type: String, default: '' },
  status: { type: String, enum: ['active', 'invited', 'disabled'], default: 'active' },
  joinedAt: { type: Date, default: Date.now },
});

MembershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

export default mongoose.models.Membership || mongoose.model('Membership', MembershipSchema);

