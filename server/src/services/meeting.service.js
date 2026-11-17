// server/src/services/meeting.service.js
const { Meeting, AgendaItem, Attendance, MeetingTemplate, Minutes, Decision, Action, Notification, Membership, User } = require('../models');
const { generateSingleMeetingIcs, generateMultipleMeetingsIcs } = require('../utils/ics');

async function listMeetings({ workspaceId, from, to, status, type, organiser }) {
  const query = { workspaceId };

  if (status) query.status = status;
  if (type) query.type = type;
  if (organiser) query.organiserId = organiser;

  if (from || to) {
    query.startsAt = {};
    if (from) query.startsAt.$gte = new Date(from);
    if (to) query.startsAt.$lte = new Date(to);
  }

  const rawMeetings = await Meeting.find(query).sort({ startsAt: 1 }).populate('organiserId', 'name email');

  // Recurring meetings expansion inside range per Section 6.3
  const results = [];
  const rangeStart = from ? new Date(from) : null;
  const rangeEnd = to ? new Date(to) : null;

  for (const mtg of rawMeetings) {
    results.push(mtg.toObject());

    if (mtg.recurrence && mtg.recurrence !== 'none' && rangeEnd) {
      const durationMs = new Date(mtg.endsAt).getTime() - new Date(mtg.startsAt).getTime();
      let nextStart = new Date(mtg.startsAt);

      while (true) {
        if (mtg.recurrence === 'daily') {
          nextStart = new Date(nextStart.getTime() + 24 * 60 * 60 * 1000);
        } else if (mtg.recurrence === 'weekly') {
          nextStart = new Date(nextStart.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else if (mtg.recurrence === 'monthly') {
          const m = new Date(nextStart);
          m.setMonth(m.getMonth() + 1);
          nextStart = m;
        }

        if (nextStart > rangeEnd) break;

        if (!rangeStart || nextStart >= rangeStart) {
          const occurrence = {
            ...mtg.toObject(),
            _id: `${mtg._id}_occ_${nextStart.getTime()}`,
            startsAt: nextStart,
            endsAt: new Date(nextStart.getTime() + durationMs),
            occurrenceOf: mtg._id,
          };
          results.push(occurrence);
        }
      }
    }
  }

  return results;
}

async function createMeeting({
  workspaceId,
  userId,
  title,
  type = 'regular',
  startsAt,
  endsAt,
  venue = '',
  onlineLink = '',
  recurrence = 'none',
  templateId = null,
  agenda = [],
}) {
  if (!title || !title.trim()) {
    const err = new Error('Meeting title is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { title: 'Title is required.' };
    throw err;
  }

  const startDate = new Date(startsAt);
  const endDate = new Date(endsAt);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    const err = new Error('Valid start and end dates are required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { startsAt: 'Valid start date required', endsAt: 'Valid end date required' };
    throw err;
  }

  if (startDate >= endDate) {
    const err = new Error('Meeting start time must be before end time.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { startsAt: 'Start time must be before end time' };
    throw err;
  }

  const meeting = await Meeting.create({
    workspaceId,
    title: title.trim(),
    type: type || 'regular',
    startsAt: startDate,
    endsAt: endDate,
    venue: venue || '',
    onlineLink: onlineLink || '',
    organiserId: userId,
    recurrence: recurrence || 'none',
    templateId: templateId || null,
    createdBy: userId,
    status: 'scheduled',
  });

  // Handle template agenda items or custom agenda items
  if (templateId) {
    const template = await MeetingTemplate.findOne({ _id: templateId, workspaceId });
    if (template && Array.isArray(template.agenda)) {
      const itemsToCreate = template.agenda.map((ag, idx) => ({
        workspaceId,
        meetingId: meeting._id,
        title: ag.title,
        minutes: ag.minutes || 15,
        order: idx + 1,
      }));
      await AgendaItem.insertMany(itemsToCreate);
    }
  } else if (Array.isArray(agenda) && agenda.length > 0) {
    const itemsToCreate = agenda.map((ag, idx) => ({
      workspaceId,
      meetingId: meeting._id,
      title: typeof ag === 'string' ? ag : ag.title,
      presenterId: ag.presenterId || null,
      minutes: ag.minutes || 15,
      order: idx + 1,
    }));
    await AgendaItem.insertMany(itemsToCreate);
  }

  // Pre-seed attendance records with workspace active members
  const members = await Membership.find({ workspaceId, status: 'active' });
  const attendanceDocs = members.map((m) => ({
    workspaceId,
    meetingId: meeting._id,
    userId: m.userId,
    status: 'not_marked',
  }));
  if (attendanceDocs.length > 0) {
    await Attendance.insertMany(attendanceDocs);
  }

  return meeting;
}

async function getMeetingDetails({ meetingId, workspaceId }) {
  const meeting = await Meeting.findOne({ _id: meetingId, workspaceId }).populate('organiserId', 'name email');
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const agenda = await AgendaItem.find({ workspaceId, meetingId }).sort({ order: 1 }).populate('presenterId', 'name email');
  const attendance = await Attendance.find({ workspaceId, meetingId }).populate('userId', 'name email');
  const minutes = await Minutes.findOne({ workspaceId, meetingId });
  const decisionCount = await Decision.countDocuments({ workspaceId, sourceMeetingId: meetingId });
  const actionCount = await Action.countDocuments({ workspaceId, sourceMeetingId: meetingId });

  return {
    ...meeting.toObject(),
    agenda,
    attendance,
    minutesStatus: minutes ? minutes.status : null,
    minutesId: minutes ? minutes._id : null,
    decisionCount,
    actionCount,
  };
}

async function updateMeeting({ meetingId, workspaceId, userId, data }) {
  const meeting = await Meeting.findOne({ _id: meetingId, workspaceId });
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const timeChanged = data.startsAt && new Date(data.startsAt).getTime() !== new Date(meeting.startsAt).getTime();

  if (data.title) meeting.title = data.title.trim();
  if (data.startsAt) meeting.startsAt = new Date(data.startsAt);
  if (data.endsAt) meeting.endsAt = new Date(data.endsAt);
  if (data.venue !== undefined) meeting.venue = data.venue;
  if (data.onlineLink !== undefined) meeting.onlineLink = data.onlineLink;
  if (data.status) meeting.status = data.status;
  if (data.recurrence) meeting.recurrence = data.recurrence;

  await meeting.save();

  // If time changes, write notifications to every attendee per Section 6.3
  if (timeChanged) {
    const attendees = await Attendance.find({ meetingId });
    const notifs = attendees.map((a) => ({
      workspaceId,
      userId: a.userId,
      type: 'meeting_updated',
      title: `Meeting reschedule: ${meeting.title}`,
      body: `Meeting time has been adjusted to ${meeting.startsAt.toLocaleString()}`,
      link: `/meetings/${meeting._id}`,
    }));
    if (notifs.length > 0) {
      await Notification.insertMany(notifs);
    }
  }

  return meeting;
}

async function cancelMeeting({ meetingId, workspaceId, userId }) {
  const meeting = await Meeting.findOne({ _id: meetingId, workspaceId });
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  meeting.status = 'cancelled';
  meeting.cancelledAt = new Date();
  await meeting.save();

  // Notify attendees
  const attendees = await Attendance.find({ meetingId });
  const notifs = attendees.map((a) => ({
    workspaceId,
    userId: a.userId,
    type: 'meeting_cancelled',
    title: `Cancelled: ${meeting.title}`,
    body: `The meeting scheduled for ${meeting.startsAt.toLocaleString()} has been cancelled.`,
    link: `/meetings/${meeting._id}`,
  }));
  if (notifs.length > 0) {
    await Notification.insertMany(notifs);
  }

  return meeting;
}

// Agenda Management
async function addAgendaItem({ workspaceId, meetingId, title, presenterId, minutes }) {
  const count = await AgendaItem.countDocuments({ workspaceId, meetingId });
  const item = await AgendaItem.create({
    workspaceId,
    meetingId,
    title: title.trim(),
    presenterId: presenterId || null,
    minutes: minutes || 15,
    order: count + 1,
  });
  return item;
}

async function updateAgendaItem({ itemId, workspaceId, title, presenterId, minutes }) {
  const item = await AgendaItem.findOne({ _id: itemId, workspaceId });
  if (!item) {
    const err = new Error('Agenda item not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (title) item.title = title.trim();
  if (presenterId !== undefined) item.presenterId = presenterId;
  if (minutes !== undefined) item.minutes = minutes;
  await item.save();
  return item;
}

async function deleteAgendaItem({ itemId, workspaceId }) {
  const item = await AgendaItem.findOneAndDelete({ _id: itemId, workspaceId });
  if (!item) {
    const err = new Error('Agenda item not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { success: true };
}

async function reorderAgendaItems({ meetingId, workspaceId, order }) {
  if (!Array.isArray(order)) {
    const err = new Error('Order array of item IDs is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  const existingItems = await AgendaItem.find({ meetingId, workspaceId });
  if (existingItems.length !== order.length) {
    const err = new Error('Order array must include every agenda item exactly once.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  for (let i = 0; i < order.length; i++) {
    await AgendaItem.updateOne({ _id: order[i], meetingId, workspaceId }, { $set: { order: i + 1 } });
  }

  return await AgendaItem.find({ meetingId, workspaceId }).sort({ order: 1 });
}

// Attendance Management
async function updateAttendance({ meetingId, workspaceId, records }) {
  if (!Array.isArray(records)) {
    const err = new Error('Records array is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  const updated = [];
  for (const rec of records) {
    const doc = await Attendance.findOneAndUpdate(
      { meetingId, userId: rec.userId, workspaceId },
      { $set: { status: rec.status, updatedAt: new Date() } },
      { upsert: true, new: true }
    );
    updated.push(doc);
  }
  return updated;
}

// Calendar ICS
async function getMeetingIcs({ meetingId, workspaceId }) {
  const meeting = await Meeting.findOne({ _id: meetingId, workspaceId });
  if (!meeting) {
    const err = new Error('Meeting not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return generateSingleMeetingIcs(meeting);
}

async function getCalendarIcs({ workspaceId, from, to }) {
  const query = { workspaceId };
  if (from || to) {
    query.startsAt = {};
    if (from) query.startsAt.$gte = new Date(from);
    if (to) query.startsAt.$lte = new Date(to);
  }
  const meetings = await Meeting.find(query).sort({ startsAt: 1 });
  return generateMultipleMeetingsIcs(meetings);
}

module.exports = {
  listMeetings,
  createMeeting,
  getMeetingDetails,
  updateMeeting,
  cancelMeeting,
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  reorderAgendaItems,
  updateAttendance,
  getMeetingIcs,
  getCalendarIcs,
};
