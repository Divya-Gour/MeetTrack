// server/src/services/assistant.service.js
const { Action, Meeting, Decision, AssistantMessage, RateLimit } = require('../models');
const gemini = require('./gemini');
const config = require('../config');

async function checkAssistantRateLimit(userId, clientIp) {
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 30; // 30 messages per hour per Section 6.13
  const key = userId ? `rl:assist:${userId}` : `rl:assist:ip:${clientIp || 'anon'}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  const record = await RateLimit.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: { windowStart: now, expiresAt },
    },
    { upsert: true, new: true }
  );

  if (record.count > maxRequests) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((new Date(record.expiresAt).getTime() - now.getTime()) / 1000)
    );
    const err = new Error('Assistant hourly message limit exceeded.');
    err.status = 429;
    err.code = 'ASSISTANT_LIMIT';
    err.retryAfterSeconds = retryAfterSeconds;
    throw err;
  }
}

async function buildWorkspaceContextSummary(workspaceId, userId, isDemo) {
  if (!workspaceId || isDemo) {
    return {
      workspaceName: 'Engineering Fest 2026 — Organising Committee',
      mode: 'Engineering Fest Demo Workspace',
      timezone: 'Asia/Kolkata',
      currency: '₹',
      people: [
        { name: 'Aarav Menon', role: 'Admin', approver: false, responsibility: 'Workspace owner, budget sign-off support' },
        { name: 'Priya Nair', role: 'Coordinator', approver: true, responsibility: 'Sponsorships and budget' },
        { name: 'Rahul Shetty', role: 'Coordinator', approver: false, responsibility: 'Technical events and judging' },
        { name: 'Meera Joshi', role: 'Coordinator', approver: false, responsibility: 'Volunteers and schedule' },
        { name: 'Kiran Rao', role: 'Participant', approver: false, responsibility: 'Venue, power and logistics' },
        { name: 'Ananya Desai', role: 'Participant', approver: true, responsibility: 'Faculty approver for minutes' },
        { name: 'Dev Patil', role: 'Participant', approver: false, responsibility: 'Stalls, robotics and electronics' },
      ],
      upcomingMeetings: [
        { title: 'Engineering Fest kickoff', startsAt: '2026-11-18T10:00:00.000Z', venue: 'Seminar Hall B-2', recurrence: 'none' },
        { title: 'Sponsorship and budget review', startsAt: '2026-11-21T14:00:00.000Z', venue: 'Online', recurrence: 'none' },
        { title: 'Event logistics: venue and power', startsAt: '2026-11-24T11:30:00.000Z', venue: 'Electronics Lab', recurrence: 'none' },
        { title: 'Technical events and judging rubric', startsAt: '2026-11-26T15:00:00.000Z', venue: 'Online', recurrence: 'none' },
        { title: 'Hackathon rules and prize review', startsAt: '2026-11-28T10:00:00.000Z', venue: 'Seminar Hall B-2', recurrence: 'none' },
        { title: 'Volunteer coordination', startsAt: '2026-12-02T09:30:00.000Z', venue: 'Online', recurrence: 'weekly' },
        { title: 'Post-fest review', startsAt: '2026-12-15T16:00:00.000Z', venue: 'Seminar Hall B-2', recurrence: 'none' },
      ],
      actions: [
        { title: 'Collect three quotes for stage and banners', owner: 'Priya Nair', dueDate: '2026-11-14', priority: 'high', status: 'pending', isOverdue: true, note: 'StageCraft & EventPro received; awaiting Apex Media quote' },
        { title: 'Confirm 6 power outlets per robotics stall', owner: 'Dev Patil', dueDate: '2026-11-20', priority: 'high', status: 'blocked', blocker: 'Electronics lab approval pending' },
        { title: 'Print judging rubric (100 copies)', owner: 'Rahul Shetty', dueDate: '2026-11-25', priority: 'medium', status: 'in_progress', note: 'Weights 40-30-20-10' },
      ],
      recentDecisions: [
        { title: 'Hackathon runs for 24 hours, teams of 3 to 4 students', rationale: 'Standard intercollegiate hackathon format' },
        { title: 'Printing and stage budget capped at ₹1,20,000', rationale: 'Approved by organizing committee' },
        { title: 'Judging rubric weights: 40% code quality, 30% design & UX, 30% presentation', rationale: 'Agreed with technical event leads' },
        { title: 'All financial disbursements require 75% quorum and faculty approval', rationale: 'Institute audit compliance' },
      ],
      minutesStatus: [
        { meeting: 'Kickoff', status: 'draft', version: 2, author: 'Aarav Menon' },
        { meeting: 'Sponsorship and budget review', status: 'submitted', waitingApprover: 'Ananya Desai or Priya Nair' },
        { meeting: 'Technical events and judging rubric', status: 'returned', comment: 'Add the scoring weights for the robotics round.' },
        { meeting: 'Hackathon rules and prize review', status: 'approved', published: false },
      ],
    };
  }

  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [myActions, upcomingMeetings, openDecisions] = await Promise.all([
    Action.find({ workspaceId, ownerId: userId, status: { $ne: 'completed' } }).limit(10),
    Meeting.find({ workspaceId, startsAt: { $gte: now, $lte: nextWeek } }).sort({ startsAt: 1 }).limit(5),
    Decision.find({ workspaceId }).sort({ decisionDate: -1 }).limit(5),
  ]);

  return {
    actions: myActions.map((a) => ({
      title: a.title,
      priority: a.priority,
      status: a.status,
      dueDate: a.dueDate ? a.dueDate.toISOString().split('T')[0] : 'N/A',
    })),
    upcomingMeetings: upcomingMeetings.map((m) => ({
      title: m.title,
      startsAt: m.startsAt ? m.startsAt.toISOString() : 'N/A',
      venue: m.venue || m.onlineLink || 'TBD',
    })),
    recentDecisions: openDecisions.map((d) => ({
      title: d.title,
      rationale: d.rationale,
    })),
  };
}

function parseDraftsFromReply(text = '') {
  const drafts = [];

  // Look for JSON block like ```json [ { ... } ] ``` or ```json { ... } ```
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        drafts.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.drafts)) {
          drafts.push(...parsed.drafts);
        } else {
          drafts.push(parsed);
        }
      }
    } catch (e) {
      // Invalid JSON: return drafts: [] per Section 6.13
    }
  }

  // Strip code block from final clean prose reply if desired
  const cleanReply = text.replace(/```json[\s\S]*?```/g, '').trim() || text;

  return { cleanReply, drafts };
}

async function handleAssistantChat({ workspaceId, userId, userRole, messages = [], pageContext = '', isDemo = false, clientIp = '' }) {
  // Check assistant availability
  if (!config.isAssistantEnabled) {
    const err = new Error('AI assistant is currently unavailable.');
    err.status = 503;
    err.code = 'ASSISTANT_UNAVAILABLE';
    throw err;
  }

  // Input size check per Section 6.13: 20 messages & 5000 words
  if (!Array.isArray(messages) || messages.length > 20) {
    const err = new Error('Message limit exceeded (maximum 20 messages).');
    err.status = 413;
    err.code = 'INPUT_TOO_LARGE';
    throw err;
  }

  let totalWords = 0;
  for (const msg of messages) {
    if (msg.content) {
      totalWords += msg.content.trim().split(/\s+/).length;
    }
  }
  if (totalWords > 5000) {
    const err = new Error('Input word count exceeds 5,000 words.');
    err.status = 413;
    err.code = 'INPUT_TOO_LARGE';
    throw err;
  }

  // Rate limit check
  await checkAssistantRateLimit(userId, clientIp);

  // Build Context Summary
  const contextSummary = await buildWorkspaceContextSummary(workspaceId, userId, isDemo);

  const systemInstruction = `You are MeetTrack Assistant, an AI governance helper embedded inside the MeetTrack meeting, minutes, and decision management system.
Current User Role: ${userRole || 'Coordinator'}
Current Page Context: ${pageContext || 'Dashboard'}
Mode: ${isDemo ? 'Engineering Fest 2026 Demo Mode' : 'Live Workspace'}

Available Context Summary:
${JSON.stringify(contextSummary, null, 2)}

Instructions:
- Provide concise, polite, professional answers about governance, quorum, meeting minutes, actions, and decisions.
- When the user asks to create, extract, or draft action items or minutes, suggest them and include a JSON code block with a 'drafts' array containing objects with { type: 'action'|'minutes', title, description, priority, dueDate }.
- Never output passwords, credentials, tokens, or private user credentials.
- Adhere strictly to the data provided.`;

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content || '' }],
  }));

  const rawReply = await gemini.generateChatCompletion({ systemInstruction, contents });
  const { cleanReply, drafts } = parseDraftsFromReply(rawReply);

  // Optionally store in assistantMessages with 30-day TTL if workspaceId exists
  if (workspaceId && userId) {
    try {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg) {
        await AssistantMessage.create({
          workspaceId,
          userId,
          role: 'user',
          content: lastUserMsg.content,
          pageContext,
        });
      }
      await AssistantMessage.create({
        workspaceId,
        userId,
        role: 'assistant',
        content: cleanReply,
        pageContext,
      });
    } catch (e) {
      console.warn('[Assistant] Message log warning:', e.message);
    }
  }

  return {
    reply: cleanReply,
    drafts,
  };
}

module.exports = {
  handleAssistantChat,
};
