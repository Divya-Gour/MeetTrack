// server/src/services/assistant.service.js
const { Action, Meeting, Decision, AssistantMessage, RateLimit } = require('../models');
const gemini = require('./gemini');
const config = require('../config');

async function checkAssistantRateLimit(userId) {
  const windowMs = 60 * 60 * 1000; // 1 hour
  const maxRequests = 30; // 30 messages per hour per Section 6.13
  const key = `rl:assist:${userId}`;
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

async function buildWorkspaceContextSummary(workspaceId, userId) {
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

  // Strip code block from final clean prose reply if desired or keep
  const cleanReply = text.replace(/```json[\s\S]*?```/g, '').trim() || text;

  return { cleanReply, drafts };
}

async function handleAssistantChat({ workspaceId, userId, userRole, messages = [], pageContext = '' }) {
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
  await checkAssistantRateLimit(userId);

  // Build Context Summary (never includes private passwords/tokens per Section 6.13)
  const contextSummary = await buildWorkspaceContextSummary(workspaceId, userId);

  const systemInstruction = `You are MeetTrack Assistant, an AI governance helper embedded inside the MeetTrack meeting, minutes, and decision management system.
Current User Role: ${userRole}
Current Page Context: ${pageContext || 'Dashboard'}

Available Workspace Summary (User Accessible):
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

  // Optionally store in assistantMessages with 30-day TTL per Section 6.13
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

  return {
    reply: cleanReply,
    drafts,
  };
}

module.exports = {
  handleAssistantChat,
};
