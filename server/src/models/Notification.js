// server/src/models/Notification.js
import mongoose from 'mongoose';

const NotificationSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['blocker', 'review', 'reminder', 'approval', 'sla'],
    default: 'reminder',
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '/dashboard' },
  unread: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

