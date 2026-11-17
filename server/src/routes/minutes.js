// server/src/routes/minutes.js
const express = require('express');
const router = express.Router();
const minutesService = require('../services/minutes.service');
const { requireAuth, requireRole, requireApprover } = require('../middleware/auth');
const { Minutes, Meeting, Attendance, MinutesVersion } = require('../models');

// GET /api/minutes per Section 6.5 & Frontend Approvals Queue
router.get('/minutes', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { workspaceId: req.workspaceId };

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      query.status = { $in: statuses };
    }

    const list = await Minutes.find(query)
      .populate('meetingId', 'title startsAt venue status')
      .populate('submittedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ updatedAt: -1 });

    res.json({ data: list });
  } catch (err) {
    next(err);
  }
});

// GET /api/meetings/:id/minutes per Section 6.5
router.get('/meetings/:id/minutes', requireAuth, async (req, res, next) => {
  try {
    const minutes = await minutesService.getMinutesForMeeting({
      meetingId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: minutes });
  } catch (err) {
    next(err);
  }
});

// PUT /api/minutes/:id/draft per Section 6.5 (Autosave)
router.put('/minutes/:id/draft', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const ifMatch = req.headers['if-match'];
    const { body, changeNote } = req.body;

    const result = await minutesService.saveDraft({
      minutesId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      body,
      changeNote,
      ifMatchVersion: ifMatch,
    });

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/minutes/:id/versions per Section 6.5
router.get('/minutes/:id/versions', requireAuth, async (req, res, next) => {
  try {
    const versions = await minutesService.listVersions({
      minutesId: req.params.id,
      workspaceId: req.workspaceId,
    });
    res.json({ data: versions });
  } catch (err) {
    next(err);
  }
});

// GET /api/minutes/:id/versions/:n per Section 6.5
router.get('/minutes/:id/versions/:n', requireAuth, async (req, res, next) => {
  try {
    const version = await minutesService.getVersionBody({
      minutesId: req.params.id,
      version: req.params.n,
      workspaceId: req.workspaceId,
    });
    res.json({ data: version });
  } catch (err) {
    next(err);
  }
});

// GET /api/minutes/:id/diff?from=n&to=m per Section 6.5
router.get('/minutes/:id/diff', requireAuth, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({
        error: { code: 'VALIDATION_FAILED', message: 'Query params from and to are required.' },
      });
    }
    const diff = await minutesService.diffVersions({
      minutesId: req.params.id,
      fromVersion: from,
      toVersion: to,
      workspaceId: req.workspaceId,
    });
    res.json({ data: diff });
  } catch (err) {
    next(err);
  }
});

// POST /api/minutes/:id/restore per Section 6.5
router.post('/minutes/:id/restore', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const { version } = req.body;
    const result = await minutesService.restoreVersion({
      minutesId: req.params.id,
      version,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/minutes/:id/submit per Section 6.5
router.post('/minutes/:id/submit', requireAuth, requireRole('admin', 'coordinator'), async (req, res, next) => {
  try {
    const submitted = await minutesService.submitMinutes({
      minutesId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: submitted });
  } catch (err) {
    next(err);
  }
});

// POST /api/minutes/:id/approve per Section 6.5 (approver flag or admin)
router.post('/minutes/:id/approve', requireAuth, requireApprover, async (req, res, next) => {
  try {
    const approved = await minutesService.approveMinutes({
      minutesId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: approved });
  } catch (err) {
    next(err);
  }
});

// POST /api/minutes/:id/return per Section 6.5
router.post('/minutes/:id/return', requireAuth, requireApprover, async (req, res, next) => {
  try {
    const { comment } = req.body;
    const returned = await minutesService.returnMinutes({
      minutesId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
      comment,
    });
    res.json({ data: returned });
  } catch (err) {
    next(err);
  }
});

// POST /api/minutes/:id/publish per Section 6.5 (approver flag or admin)
router.post('/minutes/:id/publish', requireAuth, requireApprover, async (req, res, next) => {
  try {
    const published = await minutesService.publishMinutes({
      minutesId: req.params.id,
      workspaceId: req.workspaceId,
      userId: req.user._id,
    });
    res.json({ data: published });
  } catch (err) {
    next(err);
  }
});

// GET /api/minutes/:id/pdf per Section 6.5
router.get('/minutes/:id/pdf', requireAuth, async (req, res, next) => {
  try {
    const minutes = await Minutes.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!minutes) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Minutes not found.' } });
    }

    // Permission check per Section 6.5: published for all members; drafts/submitted for coordinators, admins, approvers
    const isPrivileged = req.membership.role === 'admin' || req.membership.role === 'coordinator' || req.membership.approver;
    if (minutes.status !== 'published' && !isPrivileged) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only published minutes are accessible to participants.' },
      });
    }

    const meeting = await Meeting.findById(minutes.meetingId);
    const attendees = await Attendance.find({ meetingId: minutes.meetingId }).populate('userId', 'name');
    const latestVersion = await MinutesVersion.findOne({
      minutesId: minutes._id,
      version: minutes.currentVersion,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="minutes-${minutes._id}.pdf"`);

    const stream = minutesService.generateMinutesPdfStream(
      minutes,
      meeting,
      attendees,
      minutes.currentVersion,
      latestVersion ? latestVersion.body : ''
    );
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
