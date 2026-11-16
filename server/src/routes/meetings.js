// server/src/routes/meetings.js
import express from 'express';
import Meeting from '../models/Meeting.js';
import Minutes from '../models/Minutes.js';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// GET /api/meetings
router.get('/', async (req, res) => {
  try {
    const meetings = await Meeting.find({ workspaceId: req.workspaceId }).sort({ date: 1 });
    return res.json(meetings);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch meetings.' });
  }
});

// GET /api/meetings/:id
router.get('/:id', async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });
    return res.json(meeting);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch meeting.' });
  }
});

// POST /api/meetings
router.post('/', async (req, res) => {
  try {
    const { title, date, time, location, isOnline, recurring, description, agenda, attendees } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required.' });
    }

    const newMeeting = await Meeting.create({
      workspaceId: req.workspaceId,
      title,
      date,
      time: time || '10:00 - 11:30',
      location: location || 'Main Conference Hall',
      isOnline: Boolean(isOnline),
      recurring: recurring || 'none',
      description: description || '',
      chairperson: req.user.name,
      attendees: attendees || [{ id: String(req.user._id), name: req.user.name, role: req.membership.role, status: 'confirmed' }],
      agenda: agenda || [],
    });

    return res.status(201).json(newMeeting);
  } catch (err) {
    return res.status(500).json({ error: `Create meeting failed: ${err.message}` });
  }
});

// PATCH /api/meetings/:id/attendance
router.patch('/:id/attendance', async (req, res) => {
  try {
    const { attendeeId, status } = req.body;
    const meeting = await Meeting.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found.' });

    const att = meeting.attendees.find((a) => a.id === attendeeId || String(a._id) === attendeeId);
    if (att) {
      att.status = status;
    } else {
      meeting.attendees.push({ id: attendeeId, status });
    }

    // Recheck quorum
    const confirmedCount = meeting.attendees.filter((a) => a.status === 'confirmed').length;
    meeting.quorumMet = confirmedCount >= (meeting.quorumRequired || 4);

    await meeting.save();
    return res.json(meeting);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update attendance.' });
  }
});

export default router;

