// server/src/routes/assistant.js
import express from 'express';
import { requireAuth, requireWorkspace } from '../middleware/auth.js';
import { generateAssistantChat } from '../services/gemini.js';
import Meeting from '../models/Meeting.js';
import Action from '../models/Action.js';
import Decision from '../models/Decision.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

// In-memory sliding window rate limiter: 30 messages per hour per user session
const rateLimitMap = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const limit = 30;

  const userHistory = rateLimitMap.get(userId) || [];
  const recentTimestamps = userHistory.filter((t) => now - t < windowMs);

  if (recentTimestamps.length >= limit) {
    return false;
  }

  recentTimestamps.push(now);
  rateLimitMap.set(userId, recentTimestamps);
  return true;
}

// POST /api/assistant/chat
router.post('/chat', async (req, res) => {
  try {
    const { messages, pageContext } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    // Limit messages to 20 items per turn
    if (messages.length > 20) {
      return res.status(400).json({ error: 'Conversation history exceeds maximum allowed limit of 20 messages.' });
    }

    // Limit total words to 5,000 words in total
    const totalWords = messages.reduce((acc, m) => acc + (m.content || '').split(/\s+/).length, 0);
    if (totalWords > 5000) {
      return res.status(400).json({ error: 'Message payload exceeds 5,000 words limit. Please trim your input.' });
    }

    // Enforce Rate Limit: 30 messages per hour per user
    if (!checkRateLimit(String(req.user._id))) {
      return res.status(429).json({
        error: 'Assistant query rate limit reached (30 messages per hour). Please try again shortly.',
      });
    }

    // Fetch visible workspace records for grounding
    const meetings = await Meeting.find({ workspaceId: req.workspaceId })
      .select('title date time location status quorumMet')
      .limit(10);

    const actions = await Action.find({ workspaceId: req.workspaceId })
      .select('title dri priority deadline status blocker')
      .limit(15);

    const decisions = await Decision.find({ workspaceId: req.workspaceId })
      .select('title category impact status')
      .limit(10);

    const workspaceData = {
      meetings,
      actions,
      decisions,
    };

    const { reply, drafts } = await generateAssistantChat({
      messages,
      pageContext,
      workspaceData,
      userRole: req.membership.role,
    });

    return res.json({ reply, drafts });
  } catch (err) {
    console.error('Assistant error:', err);
    return res.status(500).json({
      error: err.message || 'Error communicating with the Gemini AI Assistant.',
    });
  }
});

export default router;

