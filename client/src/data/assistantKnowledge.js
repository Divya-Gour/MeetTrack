// client/src/data/assistantKnowledge.js
// Contextual intelligence and suggested prompt chips for MeetTrack AI Assistant

export const DEMO_SUGGESTED_CHIPS = [
  'What is still overdue for the fest?',
  'Summarise the budget decisions',
  'Which action is blocked and why?',
  'Draft action items from these notes: Rahul will print 100 rubric copies by Tuesday.',
];

export const PAGE_PROMPT_CHIPS = {
  dashboard: [
    'What is still overdue for the fest?',
    'Summarise the budget decisions',
    'Which action is blocked and why?',
  ],
  meetings: [
    'Draft an agenda for the Volunteer coordination sync',
    'Check quorum readiness for 21 Nov review',
    'Summarize kickoff meeting action outcomes',
  ],
  'meeting-details': [
    'Summarize attendance for this meeting',
    'Draft action items from discussion notes',
    'Verify quorum rules',
  ],
  minutes: [
    'Draft action items from these notes: Rahul will print 100 rubric copies by Tuesday.',
    'Format discussion points into structured outcomes',
    'Verify quorum attendance records',
  ],
  actions: [
    'Which action is blocked and why?',
    'Show all high priority actions due this week',
    'Draft an escalation note for power outlets in robotics',
  ],
  decisions: [
    'Summarise the budget decisions',
    'What is the hackathon prize breakdown?',
    'Explain the 100-point judging rubric distribution',
  ],
  reports: [
    'What is our current action item completion rate?',
    'Summarize quorum attendance by department',
    'Show SLA compliance breakdown',
  ],
  approvals: [
    'What minutes are pending faculty approval?',
    'Show returned minutes and reviewer feedback',
    'Verify SHA-256 seal integrity',
  ],
};

export const PAGE_SUGGESTIONS = PAGE_PROMPT_CHIPS;

export const DEMO_KNOWLEDGE_BASE = {
  festOverview: `Engineering Fest 2026 is governed by the 7-member Organising Committee chaired by Aarav Menon. Quorum threshold is 4/7 members (75% for budget decisions). All expenditure decisions require single-DRI signoff and faculty approval.`,
  budgetDecisions: `1. Stage and printing budget is capped at ₹1,20,000.\n2. Hackathon prize pool is ₹75,000 (1st: ₹40,000, 2nd: ₹25,000, 3rd: ₹10,000).\n3. Sponsorship tiers: Platinum (₹1,50,000), Gold (₹75,000), Silver (₹35,000). Stage vendor B recommended at ₹1,15,000.`,
  blockers: `Dev Patil reported a High-priority blocker on action #act-4 ("Confirm 6 power outlets per robotics stall"): "Electronics lab approval pending". Needs faculty intervention by Dr. Ananya Desai.`,
  overdue: `Action #act-2 ("Collect three quotes for stage and banners") assigned to Priya Nair had a deadline of 14 Nov 2026 and is currently Overdue (2 of 3 quotes collected).`,
  rubric: `Judging uses a 100-point rubric: 40 Innovation, 30 Implementation, 20 Presentation, 10 Impact. Awaiting scoring weights for obstacle clearing in robotics.`,
};
