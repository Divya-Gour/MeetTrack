// server/src/models/Meeting.js
import mongoose from 'mongoose';

const MeetingSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  title: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, default: 'Seminar Hall B-2' },
  isOnline: { type: Boolean, default: false },
  recurring: { type: String, default: 'none' },
  description: { type: String, default: '' },
  status: { type: String, enum: ['Scheduled', 'In-Progress', 'Completed', 'Cancelled'], default: 'Scheduled' },
  quorumRequired: { type: Number, default: 4 },
  quorumMet: { type: Boolean, default: false },
  chairperson: { type: String },
  minutesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Minutes', default: null },
  attendees: [
    {
      id: String,
      name: String,
      role: String,
      status: { type: String, enum: ['confirmed', 'tentative', 'declined'], default: 'confirmed' },
    },
  ],
  agenda: [
    {
      id: String,
      title: String,
      presenter: String,
      durationMin: Number,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Meeting || mongoose.model('Meeting', MeetingSchema);

