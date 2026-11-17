// server/src/routes/meetings.js
const express = require('express');
const router = express.Router();
const meetingService = require('../services/meeting.service');
const { requireAuth, requireRole } = require('../middleware/auth');
const { MeetingTemplate } = require('../models');

// GET /api/meetings per Section 6.3
router.get('/meetings', requireAuth, async (req, res, next) => {
  try {
    const { from, to, status, type, organiser } = req.query;
    const meetings = await meetingService.listMeetings({
      workspaceId: req.workspaceId,
      from,
      to,
      status,
      type,
      organiser,
    });
    res.json({ data: meetings });
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/calendar.ics per Section 6.4
router.get('/meetings/calendar.ics', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const icsContent = await meetingService.getCalendarIcs({
      workspaceId: req.workspaceId,
      from,
      to,
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
    res.send(icsContent);
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings per Section 6.3 (coordinator or admin)
router.post('/meetings', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { workspaceId: ignoredWorkspaceId, ...cleanBody } = req.body;
    const meeting = await meetingService.createMeeting({
      ...cleanBody,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.status(201).json({ data: meeting });
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id/ics per Section 6.4
router.get('/meetings/:id/ics', requireAuth, async (req, res, next) => {
  try {
    const icsContent = await meetingService.getMeetingIcs({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="meeting-${req.params.id}.ics"`);
    res.send(icsContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id per Section 6.3
router.get('/meetings/:id', requireAuth, async (req, res, next) => {
  try {
    const details = await meetingService.getMeetingDetails({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: details });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/meetings/:id per Section 6.3 (coordinator or admin)
router.patch('/meetings/:id', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const updated = await meetingService.updateMeeting({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      data: req.body,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/cancel per Section 6.3 (coordinator or admin)
router.post('/meetings/:id/cancel', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const cancelled = await meetingService.cancelMeeting({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: cancelled });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/agenda per Section 6.3
router.post('/meetings/:id/agenda', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { title, presenterId, minutes } = req.body;
    const item = await meetingService.addAgendaItem({
      workspaceId: req.workspaceId,
      meetingId: req.params.id,
      title,
      presenterId,
      minutes,
    });
    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/agenda/:itemId per Section 6.3
router.patch('/agenda/:itemId', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { title, presenterId, minutes } = req.body;
    const item = await meetingService.updateAgendaItem({
      itemId: req.params.itemId,
      workspaceId: req.workspaceId,
      title,
      presenterId,
      minutes,
    });
    res.json({ data: item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/agenda/:itemId per Section 6.3
router.delete('/agenda/:itemId', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const result = await meetingService.deleteAgendaItem({
      itemId: req.params.itemId,
      workspaceId: req.workspaceId,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/meetings/:id/agenda/reorder per Section 6.3
router.post('/meetings/:id/agenda/reorder', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { order } = req.body;
    const updated = await meetingService.reorderAgendaItems({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
      order,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// PUT /api/meetings/:id/attendance per Section 6.3
router.put('/meetings/:id/attendance', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { records } = req.body;
    const updated = await meetingService.updateAttendance({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
      records,
    });
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// Templates per Section 6.3
router.get('/templates', requireAuth, async (req, res, next) => {
  try {
    const list = await MeetingTemplate.find({ workspaceId: req.workspaceId });
    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

router.post('/templates', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { name, type, agenda } = req.body;
    const tpl = await MeetingTemplate.create({
      workspaceId: req.workspaceId,
      name,
      type: type || 'regular',
      agenda: agenda || [],
    });
    res.status(201).json({ data: tpl });
  } catch (err) {
    next(err);
  }
});

router.delete('/templates/:id', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    await MeetingTemplate.findOneAndDelete({ _id: req.params.id, workspaceId: req.workspaceId });
    res.json({ data: { message: 'Template removed.' } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
