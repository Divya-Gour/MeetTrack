// server/src/services/action.service.js
const { Action, ActionHistory, Blocker, Notification, AuditEvent, Membership, User } = require('../models');

async function listActions({ workspaceId, owner, status, priority, overdue, meetingId }) {
  const query = { workspaceId };

  if (owner) query.ownerId = owner;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (meetingId) query.sourceMeetingId = meetingId;

  const now = new Date();
  if (overdue === 'true' || overdue === true) {
    query.dueDate = { $lt: now };
    query.status = { $ne: 'completed' };
  }

  const rawActions = await Action.find(query)
    .sort({ dueDate: 1 })
    .populate('ownerId', 'name email')
    .populate('createdBy', 'name email')
    .populate('sourceMeetingId', 'title');

  return rawActions.map((act) => {
    const plain = act.toObject();
    const isOverdue = act.status !== 'completed' && new Date(act.dueDate) < now;
    const diffMs = now.getTime() - new Date(act.dueDate).getTime();
    const daysOverdue = isOverdue ? Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000))) : 0;

    plain.owner = plain.ownerId; // alias for frontend convenience
    plain.overdue = isOverdue;
    plain.daysOverdue = daysOverdue;
    return plain;
  });
}

async function createAction({
  workspaceId,
  userId,
  title,
  description = '',
  sourceMeetingId = null,
  decisionId = null,
  ownerId,
  priority = 'medium',
  dueDate,
}) {
  const fields = {};
  if (!title || !title.trim()) fields.title = 'Title is required.';
  if (!ownerId) fields.ownerId = 'Owner assignment is required.';
  if (!dueDate) fields.dueDate = 'Due date is required.';

  if (Object.keys(fields).length > 0) {
    const err = new Error('Some required action fields are missing.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = fields;
    throw err;
  }

  const action = await Action.create({
    workspaceId,
    title: title.trim(),
    description: (description || '').trim(),
    sourceMeetingId: sourceMeetingId || null,
    decisionId: decisionId || null,
    ownerId,
    priority: priority || 'medium',
    dueDate: new Date(dueDate),
    status: 'pending',
    createdBy: userId,
  });

  // Action history entry 'created' per Section 6.6
  await ActionHistory.create({
    workspaceId,
    actionId: action._id,
    event: 'created',
    from: '',
    to: 'pending',
    reason: 'Initial assignment',
    byUserId: userId,
  });

  // Notify owner per Section 6.6
  if (ownerId && String(ownerId) !== String(userId)) {
    await Notification.create({
      workspaceId,
      userId: ownerId,
      type: 'action_assigned',
      title: 'New action item assigned',
      body: `You have been assigned: "${action.title}"`,
      link: `/actions`,
    });
  }

  return action;
}

async function updateAction({ actionId, workspaceId, userId, data }) {
  const action = await Action.findOne({ _id: actionId, workspaceId });
  if (!action) {
    const err = new Error('Action item not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (data.title) action.title = data.title.trim();
  if (data.description !== undefined) action.description = data.description.trim();
  if (data.priority) action.priority = data.priority;
  if (data.dueDate) action.dueDate = new Date(data.dueDate);

  await action.save();
  return action;
}

async function updateActionStatus({ actionId, workspaceId, userId, userRole, status }) {
  const action = await Action.findOne({ _id: actionId, workspaceId });
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Participants can change only their own actions per Section 6.6
  if (userRole === 'participant' && String(action.ownerId) !== String(userId)) {
    const err = new Error('Participants can only update their own assigned action items.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const oldStatus = action.status;
  action.status = status;
  if (status === 'completed') {
    action.completedAt = new Date();
  } else {
    action.completedAt = null;
  }
  await action.save();

  await ActionHistory.create({
    workspaceId,
    actionId: action._id,
    event: 'status_changed',
    from: oldStatus,
    to: status,
    reason: `Status transition to ${status}`,
    byUserId: userId,
  });

  return action;
}

async function reassignAction({ actionId, workspaceId, userId, ownerId, reason }) {
  if (!reason || !reason.trim()) {
    const err = new Error('A reason is required to reassign an action item.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { reason: 'Reason is required for audit.' };
    throw err;
  }

  const action = await Action.findOne({ _id: actionId, workspaceId });
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const oldOwnerId = action.ownerId;
  action.ownerId = ownerId;
  await action.save();

  await ActionHistory.create({
    workspaceId,
    actionId: action._id,
    event: 'reassigned',
    from: oldOwnerId ? oldOwnerId.toString() : 'unassigned',
    to: ownerId.toString(),
    reason: reason.trim(),
    byUserId: userId,
  });

  await AuditEvent.create({
    workspaceId,
    actorId: userId,
    event: 'action_reassigned',
    targetType: 'Action',
    targetId: action._id,
    details: { from: oldOwnerId, to: ownerId, reason },
  });

  // Notify new owner per Section 6.6
  if (ownerId && String(ownerId) !== String(userId)) {
    await Notification.create({
      workspaceId,
      userId: ownerId,
      type: 'action_assigned',
      title: 'Action reassigned to you',
      body: `"${action.title}" was reassigned to you. Reason: ${reason}`,
      link: `/actions`,
    });
  }

  return action;
}

async function reportBlocker({ actionId, workspaceId, userId, userRole, reason }) {
  if (!reason || !reason.trim()) {
    const err = new Error('A blocker reason is required.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = { reason: 'Reason is required.' };
    throw err;
  }

  const action = await Action.findOne({ _id: actionId, workspaceId });
  if (!action) {
    const err = new Error('Action not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (userRole === 'participant' && String(action.ownerId) !== String(userId)) {
    const err = new Error('Participants can only report blockers on their own actions.');
    err.status = 403;
    err.code = 'FORBIDDEN';
    throw err;
  }

  const blocker = await Blocker.create({
    workspaceId,
    actionId: action._id,
    reason: reason.trim(),
    status: 'open',
    reportedBy: userId,
  });

  await ActionHistory.create({
    workspaceId,
    actionId: action._id,
    event: 'blocker_reported',
    from: 'none',
    to: 'open',
    reason: reason.trim(),
    byUserId: userId,
  });

  // Notify coordinators per Section 6.6
  const coordinators = await Membership.find({
    workspaceId,
    status: 'active',
    $or: [{ role: 'coordinator' }, { role: 'admin' }],
  });

  const notifs = coordinators.map((c) => ({
    workspaceId,
    userId: c.userId,
    type: 'blocker_reported',
    title: 'Blocker reported on action item',
    body: `Action: "${action.title}". Reason: ${reason}`,
    link: `/actions`,
  }));

  if (notifs.length > 0) {
    await Notification.insertMany(notifs);
  }

  return blocker;
}

async function resolveBlocker({ blockerId, workspaceId, userId }) {
  const blocker = await Blocker.findOne({ _id: blockerId, workspaceId });
  if (!blocker) {
    const err = new Error('Blocker not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  blocker.status = 'resolved';
  blocker.resolvedBy = userId;
  blocker.resolvedAt = new Date();
  await blocker.save();

  await ActionHistory.create({
    workspaceId,
    actionId: blocker.actionId,
    event: 'blocker_resolved',
    from: 'open',
    to: 'resolved',
    reason: 'Blocker marked resolved',
    byUserId: userId,
  });

  return blocker;
}

async function escalateBlocker({ blockerId, workspaceId, userId }) {
  const blocker = await Blocker.findOne({ _id: blockerId, workspaceId });
  if (!blocker) {
    const err = new Error('Blocker not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  blocker.status = 'escalated';
  await blocker.save();

  await ActionHistory.create({
    workspaceId,
    actionId: blocker.actionId,
    event: 'blocker_escalated',
    from: 'open',
    to: 'escalated',
    reason: 'Blocker escalated to committee leadership',
    byUserId: userId,
  });

  // Notify admins per Section 6.6
  const admins = await Membership.find({ workspaceId, role: 'admin', status: 'active' });
  const notifs = admins.map((a) => ({
    workspaceId,
    userId: a.userId,
    type: 'blocker_escalated',
    title: 'Blocker Escalated',
    body: `An unresolved blocker on action has been escalated to committee admin.`,
    link: `/actions`,
  }));
  if (notifs.length > 0) {
    await Notification.insertMany(notifs);
  }

  return blocker;
}

async function getActionHistory({ actionId, workspaceId }) {
  return await ActionHistory.find({ actionId, workspaceId })
    .sort({ createdAt: 1 })
    .populate('byUserId', 'name email');
}

module.exports = {
  listActions,
  createAction,
  updateAction,
  updateActionStatus,
  reassignAction,
  reportBlocker,
  resolveBlocker,
  escalateBlocker,
  getActionHistory,
};
