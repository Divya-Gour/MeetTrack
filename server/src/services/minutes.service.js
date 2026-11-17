// server/src/services/minutes.service.js
const { Minutes, MinutesVersion, Meeting, Attendance, Notification, AuditEvent, Membership } = require('../models');
const { computeDiff } = require('../utils/diff');
const PDFDocument = require('pdfkit');

async function getMinutesForMeeting({ meetingId, workspaceId, userId }) {
  let minutes = await Minutes.findOne({ meetingId, workspaceId })
    .populate('submittedBy', 'name email')
    .populate('approvedBy', 'name email');

  if (!minutes) {
    minutes = await Minutes.create({
      workspaceId,
      meetingId,
      status: 'draft',
      currentVersion: 1,
    });

    await MinutesVersion.create({
      workspaceId,
      minutesId: minutes._id,
      version: 1,
      body: '',
      editedBy: userId,
      changeNote: 'Initial draft created',
    });
  }

  const latestVersion = await MinutesVersion.findOne({
    minutesId: minutes._id,
    version: minutes.currentVersion,
  });

  return {
    ...minutes.toObject(),
    body: latestVersion ? latestVersion.body : '',
  };
}

async function saveDraft({ minutesId, workspaceId, userId, body = '', changeNote = '', ifMatchVersion }) {
  const minutes = await Minutes.findOne({ _id: minutesId, workspaceId });
  if (!minutes) {
    const err = new Error('Minutes record not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (minutes.status !== 'draft' && minutes.status !== 'returned') {
    const err = new Error(`Minutes in status '${minutes.status}' cannot be edited.`);
    err.status = 400;
    err.code = 'CANNOT_EDIT';
    throw err;
  }

  // Concurrency check per Section 6.5: If-Match header
  if (ifMatchVersion !== undefined && ifMatchVersion !== null) {
    const parsedVersion = parseInt(ifMatchVersion, 10);
    if (!isNaN(parsedVersion) && parsedVersion !== minutes.currentVersion) {
      const err = new Error(`Version conflict: current version is ${minutes.currentVersion}.`);
      err.status = 409;
      err.code = 'VERSION_CONFLICT';
      err.currentVersion = minutes.currentVersion;
      throw err;
    }
  }

  const latestVersion = await MinutesVersion.findOne({
    minutesId: minutes._id,
    version: minutes.currentVersion,
  });

  const currentBody = latestVersion ? latestVersion.body : '';
  const hasChanged = body.trim() !== currentBody.trim();

  let newVersionNumber = minutes.currentVersion;
  if (hasChanged) {
    newVersionNumber = minutes.currentVersion + 1;
    await MinutesVersion.create({
      workspaceId,
      minutesId: minutes._id,
      version: newVersionNumber,
      body,
      editedBy: userId,
      changeNote: changeNote || 'Autosaved revision',
    });
    minutes.currentVersion = newVersionNumber;
    await minutes.save();
  }

  return {
    version: newVersionNumber,
    savedAt: new Date().toISOString(),
  };
}

async function listVersions({ minutesId, workspaceId }) {
  return await MinutesVersion.find({ minutesId, workspaceId })
    .select('-body')
    .sort({ version: -1 })
    .populate('editedBy', 'name email');
}

async function getVersionBody({ minutesId, version, workspaceId }) {
  const ver = await MinutesVersion.findOne({
    minutesId,
    version: parseInt(version, 10),
    workspaceId,
  }).populate('editedBy', 'name email');

  if (!ver) {
    const err = new Error('Version not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return ver;
}

async function diffVersions({ minutesId, fromVersion, toVersion, workspaceId }) {
  const vFrom = await MinutesVersion.findOne({ minutesId, version: parseInt(fromVersion, 10), workspaceId });
  const vTo = await MinutesVersion.findOne({ minutesId, version: parseInt(toVersion, 10), workspaceId });

  if (!vFrom || !vTo) {
    const err = new Error('Specified versions not found for diff.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return computeDiff(vFrom.body, vTo.body);
}

async function restoreVersion({ minutesId, version, workspaceId, userId }) {
  const minutes = await Minutes.findOne({ _id: minutesId, workspaceId });
  if (!minutes) {
    const err = new Error('Minutes not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (minutes.status === 'published') {
    const err = new Error('Published minutes cannot be restored or modified.');
    err.status = 400;
    err.code = 'CANNOT_EDIT';
    throw err;
  }

  const targetVersion = await MinutesVersion.findOne({
    minutesId: minutes._id,
    version: parseInt(version, 10),
    workspaceId,
  });

  if (!targetVersion) {
    const err = new Error('Target version to restore not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const newVersion = minutes.currentVersion + 1;
  await MinutesVersion.create({
    workspaceId,
    minutesId: minutes._id,
    version: newVersion,
    body: targetVersion.body,
    editedBy: userId,
    changeNote: `Restored from version ${targetVersion.version}`,
    restoredFrom: targetVersion.version,
  });

  minutes.currentVersion = newVersion;
  await minutes.save();

  // Audit event version_restored per Section 6.5
  await AuditEvent.create({
    workspaceId,
    actorId: userId,
    event: 'version_restored',
    targetType: 'Minutes',
    targetId: minutes._id,
    details: { restoredFromVersion: targetVersion.version, newVersion },
  });

  return {
    version: newVersion,
    restoredFrom: targetVersion.version,
  };
}

async function submitMinutes({ minutesId, workspaceId, userId }) {
  const minutes = await Minutes.findOne({ _id: minutesId, workspaceId });
  if (!minutes) {
    const err = new Error('Minutes not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const latestVersion = await MinutesVersion.findOne({
    minutesId: minutes._id,
    version: minutes.currentVersion,
  });

  if (!latestVersion || !latestVersion.body.trim()) {
    const err = new Error('Cannot submit minutes without content.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  minutes.status = 'submitted';
  minutes.submittedBy = userId;
  minutes.submittedAt = new Date();
  await minutes.save();

  // Notify approvers per Section 6.5
  const approvers = await Membership.find({
    workspaceId,
    status: 'active',
    $or: [{ approver: true }, { role: 'admin' }],
  });

  const notifs = approvers
    .filter((m) => String(m.userId) !== String(userId))
    .map((m) => ({
      workspaceId,
      userId: m.userId,
      type: 'minutes_submitted',
      title: 'Minutes submitted for approval',
      body: 'Meeting minutes have been submitted and await your formal sign-off.',
      link: `/approvals`,
    }));

  if (notifs.length > 0) {
    await Notification.insertMany(notifs);
  }

  return minutes;
}

async function approveMinutes({ minutesId, workspaceId, userId }) {
  const minutes = await Minutes.findOne({ _id: minutesId, workspaceId });
  if (!minutes) {
    const err = new Error('Minutes not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Submitter cannot approve their own minutes per Section 6.5
  if (minutes.submittedBy && String(minutes.submittedBy) === String(userId)) {
    const err = new Error('The submitter cannot approve their own minutes.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  minutes.status = 'approved';
  minutes.approvedBy = userId;
  minutes.approvedAt = new Date();
  await minutes.save();

  await AuditEvent.create({
    workspaceId,
    actorId: userId,
    event: 'minutes_approved',
    targetType: 'Minutes',
    targetId: minutes._id,
    details: { meetingId: minutes.meetingId, approvedAt: minutes.approvedAt },
  });

  return minutes;
}

async function returnMinutes({ minutesId, workspaceId, userId, comment }) {
  if (!comment || typeof comment !== 'string' || comment.trim().length === 0 || comment.length > 1000) {
    const err = new Error('A return comment between 1 and 1000 characters is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { comment: 'Comment is required (1-1000 characters).' };
    throw err;
  }

  const minutes = await Minutes.findOne({ _id: minutesId, workspaceId });
  if (!minutes) {
    const err = new Error('Minutes not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  minutes.status = 'returned';
  minutes.returnComment = comment.trim();
  await minutes.save();

  // Notify submitter per Section 6.5
  if (minutes.submittedBy) {
    await Notification.create({
      workspaceId,
      userId: minutes.submittedBy,
      type: 'minutes_returned',
      title: 'Minutes returned for revision',
      body: `Reason: ${minutes.returnComment}`,
      link: `/minutes/${minutes._id}`,
    });
  }

  return minutes;
}

async function publishMinutes({ minutesId, workspaceId, userId }) {
  const minutes = await Minutes.findOne({ _id: minutesId, workspaceId });
  if (!minutes) {
    const err = new Error('Minutes not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (minutes.status !== 'approved') {
    const err = new Error('Only approved minutes can be published.');
    err.status = 400;
    err.code = 'INVALID_STATE';
    throw err;
  }

  minutes.status = 'published';
  minutes.publishedAt = new Date();
  await minutes.save();

  await AuditEvent.create({
    workspaceId,
    actorId: userId,
    event: 'minutes_published',
    targetType: 'Minutes',
    targetId: minutes._id,
    details: { publishedAt: minutes.publishedAt },
  });

  // Notify all attendees per Section 6.5
  const attendees = await Attendance.find({ meetingId: minutes.meetingId, workspaceId });
  const notifs = attendees.map((a) => ({
    workspaceId,
    userId: a.userId,
    type: 'minutes_published',
    title: 'Official minutes published',
    body: 'The minutes for your meeting have been approved and officially published.',
    link: `/minutes/${minutes._id}`,
  }));
  if (notifs.length > 0) {
    await Notification.insertMany(notifs);
  }

  return minutes;
}

function generateMinutesPdfStream(minutes, meeting, attendees, version, body) {
  const doc = new PDFDocument({ margin: 50 });

  doc.fontSize(20).text('MEETTRACK GOVERNANCE MINUTES', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).text(meeting ? meeting.title : 'Meeting Minutes', { align: 'center' });
  doc.moveDown(1);

  doc.fontSize(10).text(`Date: ${meeting ? new Date(meeting.startsAt).toLocaleDateString() : 'N/A'}`);
  doc.text(`Version: ${version}`);
  doc.text(`Status: ${minutes.status.toUpperCase()}`);
  doc.moveDown(1);

  doc.fontSize(12).text('Attendees:');
  doc.fontSize(10);
  if (attendees && attendees.length) {
    const attList = attendees.map((a) => `${a.userId?.name || 'Member'} (${a.status})`).join(', ');
    doc.text(attList);
  } else {
    doc.text('No attendance records recorded.');
  }
  doc.moveDown(1.5);

  doc.fontSize(12).text('Minutes Body:');
  doc.fontSize(10);
  doc.text(body || '(Empty document)');

  doc.end();
  return doc;
}

module.exports = {
  getMinutesForMeeting,
  saveDraft,
  listVersions,
  getVersionBody,
  diffVersions,
  restoreVersion,
  submitMinutes,
  approveMinutes,
  returnMinutes,
  publishMinutes,
  generateMinutesPdfStream,
};
