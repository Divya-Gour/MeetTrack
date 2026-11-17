// server/src/services/report.service.js
const { Action, Meeting } = require('../models');

async function getSummaryReport({ workspaceId, from, to }) {
  const now = new Date();
  const match = { workspaceId };

  if (from || to) {
    match.dueDate = {};
    if (from) match.dueDate.$gte = new Date(from);
    if (to) match.dueDate.$lte = new Date(to);
  }

  const [actions, meetingCount] = await Promise.all([
    Action.find(match),
    Meeting.countDocuments({ workspaceId }),
  ]);

  const totalActions = actions.length;
  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;

  for (const act of actions) {
    if (act.status === 'completed') {
      completed++;
    } else {
      if (act.status === 'in_progress') inProgress++;
      if (act.status === 'pending') pending++;
      if (act.dueDate && new Date(act.dueDate) < now) {
        overdue++;
      }
    }
  }

  const completionRate = totalActions > 0 ? Math.round((completed / totalActions) * 100) : 0;

  return {
    meetings: meetingCount,
    actions: totalActions,
    completed,
    inProgress,
    pending,
    overdue,
    completionRate,
  };
}

async function getOwnerReport({ workspaceId }) {
  const now = new Date();
  const actions = await Action.find({ workspaceId }).populate('ownerId', 'name email');

  const ownerMap = new Map();

  for (const act of actions) {
    const ownerId = act.ownerId ? act.ownerId._id.toString() : 'unassigned';
    const ownerName = act.ownerId ? act.ownerId.name : 'Unassigned';

    if (!ownerMap.has(ownerId)) {
      ownerMap.set(ownerId, {
        ownerId,
        name: ownerName,
        total: 0,
        completed: 0,
        pending: 0,
        inProgress: 0,
        overdue: 0,
      });
    }

    const stat = ownerMap.get(ownerId);
    stat.total++;
    if (act.status === 'completed') {
      stat.completed++;
    } else {
      if (act.status === 'in_progress') stat.inProgress++;
      if (act.status === 'pending') stat.pending++;
      if (act.dueDate && new Date(act.dueDate) < now) {
        stat.overdue++;
      }
    }
  }

  const list = Array.from(ownerMap.values()).map((o) => ({
    ...o,
    completionRate: o.total > 0 ? Math.round((o.completed / o.total) * 100) : 0,
  }));

  return list;
}

async function getStatusReport({ workspaceId }) {
  const now = new Date();
  const actions = await Action.find({ workspaceId });

  let completed = 0;
  let inProgress = 0;
  let pending = 0;
  let overdue = 0;

  for (const act of actions) {
    if (act.status === 'completed') {
      completed++;
    } else {
      if (act.status === 'in_progress') inProgress++;
      if (act.status === 'pending') pending++;
      if (act.dueDate && new Date(act.dueDate) < now) {
        overdue++;
      }
    }
  }

  return {
    completed,
    inProgress,
    pending,
    overdue,
    total: actions.length,
  };
}

module.exports = {
  getSummaryReport,
  getOwnerReport,
  getStatusReport,
};
