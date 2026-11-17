// server/src/services/decision.service.js
const { Decision, Action, FollowUpItem, AgendaItem } = require('../models');

async function listDecisions({ workspaceId, q, from, to }) {
  const query = { workspaceId };

  if (from || to) {
    query.decisionDate = {};
    if (from) query.decisionDate.$gte = new Date(from);
    if (to) query.decisionDate.$lte = new Date(to);
  }

  if (q && q.trim()) {
    query.$text = { $search: q.trim() };
    return await Decision.find(query, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .populate('createdBy', 'name email')
      .populate('sourceMeetingId', 'title')
      .populate('linkedActionIds', 'title status priority');
  }

  return await Decision.find(query)
    .sort({ decisionDate: -1 })
    .populate('createdBy', 'name email')
    .populate('sourceMeetingId', 'title')
    .populate('linkedActionIds', 'title status priority');
}

async function createDecision({
  workspaceId,
  userId,
  title,
  rationale,
  decisionDate,
  sourceMeetingId = null,
  linkedActionIds = [],
}) {
  const fields = {};
  if (!title || !title.trim()) fields.title = 'Decision title is required.';
  if (!rationale || !rationale.trim()) fields.rationale = 'Rationale is required.';

  if (Object.keys(fields).length > 0) {
    const err = new Error('Some required decision fields are missing.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    err.fields = fields;
    throw err;
  }

  // Linked action IDs must belong to the workspace per Section 6.7
  if (Array.isArray(linkedActionIds) && linkedActionIds.length > 0) {
    const matchingCount = await Action.countDocuments({
      _id: { $in: linkedActionIds },
      workspaceId,
    });
    if (matchingCount !== linkedActionIds.length) {
      const err = new Error('All linked actions must belong to the same workspace.');
      err.status = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }
  }

  const decision = await Decision.create({
    workspaceId,
    title: title.trim(),
    rationale: rationale.trim(),
    decisionDate: decisionDate ? new Date(decisionDate) : new Date(),
    sourceMeetingId: sourceMeetingId || null,
    linkedActionIds: linkedActionIds || [],
    createdBy: userId,
  });

  return decision;
}

async function updateDecision({ decisionId, workspaceId, data }) {
  const decision = await Decision.findOne({ _id: decisionId, workspaceId });
  if (!decision) {
    const err = new Error('Decision not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (data.title) decision.title = data.title.trim();
  if (data.rationale) decision.rationale = data.rationale.trim();
  if (data.decisionDate) decision.decisionDate = new Date(data.decisionDate);
  if (data.linkedActionIds) decision.linkedActionIds = data.linkedActionIds;
  decision.updatedAt = new Date();

  await decision.save();
  return decision;
}

async function deleteDecision({ decisionId, workspaceId }) {
  const decision = await Decision.findOneAndDelete({ _id: decisionId, workspaceId });
  if (!decision) {
    const err = new Error('Decision not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }
  return { success: true };
}

// Follow-up Items Engine
async function getFollowUpItems(workspaceId) {
  // 1. Actions not completed in workspace
  const openActions = await Action.find({ workspaceId, status: { $ne: 'completed' } });

  for (const act of openActions) {
    await FollowUpItem.findOneAndUpdate(
      { workspaceId, kind: 'action', refId: act._id },
      {
        $setOnInsert: {
          text: `Follow-up on pending action: ${act.title} (due ${act.dueDate ? new Date(act.dueDate).toLocaleDateString() : 'N/A'})`,
          status: 'suggested',
        },
      },
      { upsert: true }
    );
  }

  // 2. Decisions with no linked completed actions
  const allDecisions = await Decision.find({ workspaceId }).populate('linkedActionIds');
  for (const dec of allDecisions) {
    const hasCompletedAction = dec.linkedActionIds && dec.linkedActionIds.some((a) => a.status === 'completed');
    if (!hasCompletedAction) {
      await FollowUpItem.findOneAndUpdate(
        { workspaceId, kind: 'decision', refId: dec._id },
        {
          $setOnInsert: {
            text: `Review progress on ratified decision: ${dec.title}`,
            status: 'suggested',
          },
        },
        { upsert: true }
      );
    }
  }

  return await FollowUpItem.find({ workspaceId }).sort({ createdAt: -1 });
}

async function decideFollowUp({ followUpId, workspaceId, userId, decision, text, targetMeetingId }) {
  const validDecisions = ['accepted', 'edited', 'dismissed'];
  if (!validDecisions.includes(decision)) {
    const err = new Error('Invalid follow-up decision. Must be accepted, edited, or dismissed.');
    err.status = 400;
    err.code = 'VALIDATION_FAILED';
    throw err;
  }

  const item = await FollowUpItem.findOne({ _id: followUpId, workspaceId });
  if (!item) {
    const err = new Error('Follow-up item not found.');
    err.status = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (decision === 'edited') {
    if (!text || !text.trim()) {
      const err = new Error('Edited follow-up requires updated text.');
      err.status = 400;
      err.code = 'VALIDATION_FAILED';
      throw err;
    }
    item.text = text.trim();
  }

  item.status = decision;
  item.decidedBy = userId;
  if (targetMeetingId) item.targetMeetingId = targetMeetingId;
  await item.save();

  return item;
}

async function saveFollowUpToAgenda({ workspaceId, meetingId }) {
  const acceptedItems = await FollowUpItem.find({ workspaceId, status: 'accepted' });
  const startOrder = await AgendaItem.countDocuments({ workspaceId, meetingId });

  const added = [];
  for (let i = 0; i < acceptedItems.length; i++) {
    const item = acceptedItems[i];
    const agendaItem = await AgendaItem.create({
      workspaceId,
      meetingId,
      title: item.text,
      minutes: 15,
      order: startOrder + i + 1,
    });
    added.push(agendaItem);
  }

  return added;
}

module.exports = {
  listDecisions,
  createDecision,
  updateDecision,
  deleteDecision,
  getFollowUpItems,
  decideFollowUp,
  saveFollowUpToAgenda,
};
