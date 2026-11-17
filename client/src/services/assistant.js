// client/src/services/assistant.js
// Handles communication with the AI chat assistant for both Demo and Live modes
//
// SECURITY: NEVER place the Gemini API key or any AI credentials in frontend code
// or Vite environment variables. All Gemini API calls are made server-side.

import { DEMO_KNOWLEDGE_BASE } from '../data/assistantKnowledge';
import { loadDemoState, isDemoActionOverdue } from '../data/demoStore';
import { apiRequest } from './api';

export function getAssistantMode() {
  const mode = localStorage.getItem('mt.mode') || 'demo';
  return mode === 'live' ? 'api' : 'demo-gemini';
}

export async function sendAssistantMessage({
  message,
  conversationHistory = [],
  currentRoute = '/dashboard',
  userRole = 'Coordinator',
  user = null,
}) {
  const mode = localStorage.getItem('mt.mode') || 'demo';

  // Input length validation (per prompt: reject inputs over 5,000 words)
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount > 5000) {
    throw new Error('Message is too long. Please shorten your prompt to under 5,000 words.');
  }

  // 1. First, attempt to call the backend Gemini endpoint in both Live and Demo modes
  try {
    const formattedHistory = conversationHistory.map((m) => ({
      role: m.sender === 'user' || m.role === 'user' ? 'user' : 'assistant',
      content: m.text || m.content || '',
    }));

    const res = await apiRequest('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [...formattedHistory, { role: 'user', content: message }],
        pageContext: `${currentRoute} (${userRole})`,
        isDemo: mode === 'demo',
      }),
    });

    const result = res.data || res;
    return {
      reply: result.reply,
      drafts: result.drafts || (result.draft ? [result.draft] : null),
      mode,
      notice: mode === 'demo' ? 'Powered by Google Gemini (Engineering Fest Context)' : null,
    };
  } catch (err) {
    // If rate-limited or input too large, bubble up error
    if (err.code === 'ASSISTANT_LIMIT') {
      throw new Error(`Assistant hourly rate limit reached. Please wait ${err.retryAfterSeconds || 60} seconds.`);
    }
    if (err.code === 'INPUT_TOO_LARGE') {
      throw err;
    }

    // In Live mode, report error directly
    if (mode === 'live') {
      if (err.code === 'ASSISTANT_UNAVAILABLE') {
        throw new Error('AI assistant is currently unavailable (GEMINI_API_KEY not configured on server).');
      }
      throw new Error(`AI Assistant error: ${err.message}`);
    }

    // In Demo mode, if server is unavailable or offline, gracefully fallback to local demo engine
    console.warn('[Assistant] Falling back to offline demo engine:', err.message);
  }

  // 2. Offline Demo Fallback Engine (runs only when offline or disconnected)
  await new Promise((resolve) => setTimeout(resolve, 400));

  const state = loadDemoState();
  const lowerMsg = message.toLowerCase();
  let reply = '';
  let drafts = null;

  if (lowerMsg.includes('overdue')) {
    const overdueActions = state.actions.filter((a) => isDemoActionOverdue(a));
    reply = `Currently, there is **1 overdue action item** for Engineering Fest 2026:\n\n` +
      `• **Collect three quotes for stage and banners**\n` +
      `  - **DRI:** Priya Nair (Finance & Corporate Relations)\n` +
      `  - **Deadline:** 14 Nov 2026 *(Overdue as of 15 Nov)*\n` +
      `  - **Progress:** Completed for 2 of 3 vendors (StageCraft & EventPro received; awaiting Apex Media quote).`;
  } else if (lowerMsg.includes('budget') || lowerMsg.includes('cost') || lowerMsg.includes('finance')) {
    reply = `Here is a summary of the **Fest Budget & Financial Decisions**:\n\n` +
      `1. **Stage & Printing Cap:** Budget is capped at **₹1,20,000** for all stage setup, flex banners, and signages.\n` +
      `2. **Hackathon Prize Pool:** **₹75,000** approved (1st: ₹40,000, 2nd: ₹25,000, 3rd: ₹10,000).\n` +
      `3. **Sponsorship Tiers:** Platinum (₹1,50,000), Gold (₹75,000), Silver (₹35,000).\n` +
      `4. **Quorum Mandate:** All financial disbursements require **75% quorum** (minimum 4 committee leads) and faculty advisor approval.`;
  } else if (lowerMsg.includes('block') || lowerMsg.includes('blocked')) {
    const blockedActions = state.actions.filter((a) => a.status === 'blocked' || a.blocker?.isBlocked);
    reply = `There is **1 blocked action item** requiring immediate attention:\n\n` +
      `• **Confirm 6 power outlets per robotics stall**\n` +
      `  - **DRI:** Dev Patil (Electronics Club)\n` +
      `  - **Reason:** *"Electronics lab approval pending"*\n` +
      `  - **Impact:** 20 robotics teams need 3-phase line access.\n` +
      `  - **Recommended Escalation:** Faculty advisor Dr. Ananya Desai can provide written clearance to the lab supervisor.`;
  } else if (lowerMsg.includes('rubric') || lowerMsg.includes('print 100') || lowerMsg.includes('draft action')) {
    reply = `I have parsed your notes and drafted an actionable item for the committee register:`;
    drafts = [
      {
        id: `draft-${Date.now()}`,
        type: 'action',
        title: 'Print judging rubric (100 copies)',
        dri: 'Rahul Shetty',
        driId: 'user-rahul',
        deadline: '2026-11-25',
        priority: 'Medium',
        notes: 'Print 100 double-sided color copies with 40-30-20-10 scoring weights.',
      },
    ];
  } else if (lowerMsg.includes('quorum') || lowerMsg.includes('kickoff')) {
    reply = `For the **Engineering Fest kickoff** on 18 Nov 2026:\n\n` +
      `• **Quorum:** 6/7 members confirmed (Quorum threshold is 4/7, so quorum is MET).\n` +
      `• **Excused:** Ananya Desai (Tentative/Excused).\n` +
      `• **Location:** Seminar Hall B-2 at 10:00 IST.`;
  } else {
    reply = `MeetTrack Governance Assistant (Demo Mode).\n\n` +
      `I can help you monitor Engineering Fest 2026 records. Try asking:\n` +
      `• *"What is still overdue for the fest?"*\n` +
      `• *"Summarise the budget decisions"*\n` +
      `• *"Which action is blocked and why?"*\n` +
      `• *"Draft action items from these notes: Rahul will print 100 rubric copies by Tuesday."*`;
  }

  return {
    reply,
    drafts,
    mode: 'demo',
    notice: 'Offline demo mode: answers come from sample Engineering Fest data.',
  };
}
