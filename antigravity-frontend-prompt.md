# Antigravity Prompt — MeetTrack Frontend (with Stitch MCP and AI Chat Assistant)

Paste this whole file into Antigravity as the build prompt. Keep `00-theme-and-design-system.md` (or the Stitch theme from `MeetTrack-Stitch-Prompts-v4.md`) in the project folder as project info.

Assumes the Stitch MCP is connected to Antigravity and the Stitch project for MeetTrack already contains the 14 screens.

---

## Goal

Build the **frontend only** for MeetTrack, a meeting minutes and action tracker. Implement all 14 screens from the Stitch designs, with routing, responsive layout, light, dark and system themes, role-aware navigation, realistic mock data, and a **floating AI chat assistant available on every page** that answers questions.

Do not build a backend. Do not add Express, MongoDB, Mongoose, an auth server, SMTP, or PDF generation. The only server-side piece the frontend talks to is the assistant endpoint, and it is designed as a separate service described in the AI section below.

## Stitch designs (via MCP)

- Use the Stitch MCP to read the MeetTrack project and its 14 screens. Treat them as the visual source of truth for layout, spacing, components and all states.
- Match every fallback state listed in the Stitch prompts: wrong password, too many attempts, expired invitation, 404, 403, 500, offline, session expired, empty states, save failed, conflicts, and AI states.
- Keep the screen number in a code comment at the top of each page file (for example `// Stitch screen 03: Role-based dashboard`).
- If a Stitch screen and the prompts disagree, follow the Stitch screen and note the difference in the README.

## Stack

- React.js with Vite (pick JavaScript or TypeScript and be consistent)
- Tailwind CSS with theme values as CSS variables on `:root` and `[data-mode=dark]`
- React Router for routes and protected routes
- Lucide React for icons
- Recharts for charts (Reports and Admin)
- Fonts: Space Grotesk (headings and numbers), DM Sans (everything else), loaded from Google Fonts with system fallbacks
- Vitest and React Testing Library for component tests (recommended)

## Routes

| Route | Screen | Access |
|---|---|---|
| `/` | 01 Landing | Public |
| `/login` | 02 Authentication (sign in, join, forgot, reset) | Public |
| `/dashboard` | 03 Role-based dashboard | All signed-in roles |
| `/meetings` | 04 Meeting management | Coordinator edits; others view |
| `/calendar` | 05 Calendar and scheduling | Coordinator edits; others view |
| `/meetings/:id` | 06 Meeting details and agenda | Permitted users |
| `/minutes/:id` | 07 Minutes editor | Coordinator and explicitly allowed users |
| `/approvals` | 08 Minutes approval and publishing | Approver permission |
| `/actions` | 09 Action items and My Actions | All roles, with ownership rules |
| `/decisions` | 10 Decision register and follow-up agenda | All roles; edit for Coordinator |
| `/reports` | 11 Reports and analytics | Admin and Coordinator |
| `/notifications` | 12 Notifications and reminders | All signed-in roles |
| `/admin` | 13 Admin panel and workspace management | Admin only |
| `/profile` | 14 Profile and settings | All signed-in roles |

Unknown routes show the 404 screen. Denied routes show the 403 screen. Do not redirect silently.

## Shared shell

- Left sidebar with role-aware items. Hide items the role cannot use.
- Top bar: page title or breadcrumb, search, notification bell with unread count, appearance control (Light, Dark, System), profile menu.
- **AI chat assistant:** floating button on every route, including the public landing and sign-in pages. Details in the AI section.
- Sidebar becomes a drawer below 820px. Tables become stacked cards on narrow screens.
- Toast notifications for success and error feedback.

## Roles and permissions (frontend)

- Roles: Admin, Coordinator, Participant. Approver is a flag on a user.
- Keep all permission rules in one module (`src/auth/permissions.js`). The assistant uses the same module so it never shows data a user cannot open.
- Route guards and hidden controls improve navigation only. Add a code comment that the backend must enforce these rules.
- The login entry point (Admin or Teammate) does not set the role. The role comes from the user record. A demo role switcher is allowed in development only and must be labelled "Demo".

## Mock data layer

- `src/data/`: sample users, workspaces, meetings with agenda and attendance, minutes with versions and statuses (Draft, Submitted, Returned, Approved, Published), actions with priority, due date, status and blockers, decisions, notifications, and a short FAQ file for the assistant.
- `src/services/`: functions such as `getMeetings()`, `updateActionStatus(id, status)`, `approveMinutes(id)`, `publishMinutes(id)`. Each returns a Promise and updates in-memory state. Mark each with `// TODO(backend):` so the real API can replace it.
- Keep state in React context or a small store.
- Overdue is calculated in the UI from the due date and completion state. Do not store it.
- Loading skeletons for async data, empty states, and error states with retry.

## AI chat assistant (floating, on every page)

**Button.** Fixed bottom-right, 24px from the edges (16px on mobile, clear of safe areas). Lime pill with a sparkle icon and the text "AI assistant" on desktop. A 52px round icon button on mobile with the accessible name "Open AI assistant". It hides when a modal or bottom sheet is open.

**Panel.** Opens above the button. Desktop: 380px wide, up to 620px tall. Mobile: bottom sheet up to 80% of viewport height with a drag handle. Entry is a fade and scale over 220ms. Reduced motion uses fades only.

**Panel contents.** Header with the title "MeetTrack assistant", a context chip showing the current page name, and a close button. Intro line. Suggested prompt chips for the current page. Conversation list. Composer with a labelled textarea "Ask anything" (auto-grows to five rows), a send button, and the note "Drafts are not saved until you confirm them."

**What it answers.** The assistant answers any question the user asks, including general questions, questions about MeetTrack features and how to use each page, and questions about the user's own meetings, actions and decisions that the user is allowed to see. It can explain a page, draft meeting notes or action items, summarise a record, and suggest the next step.

**Suggested prompts per page** (show as chips, each one sends the message):
- Landing: "What is MeetTrack?", "How does the assistant work?", "Show me a demo"
- Sign-in: "I forgot my password", "Why can't I sign in?", "How do invitations work?"
- Dashboard: "What needs my attention today?", "Summarise my overdue actions"
- Meetings: "Set up a weekly recurring meeting", "Which meetings have no agenda?"
- Calendar: "What is on my calendar this week?", "Find a free slot tomorrow"
- Meeting details: "Summarise this meeting's agenda", "Who has not marked attendance?"
- Minutes editor: "Draft a summary from my notes", "Suggest action items from these notes"
- Approvals: "What changed since the last version?", "List points the approver should check"
- Action items: "Which actions are overdue?", "Help me word a blocker reason"
- Decisions: "Find decisions about the budget", "Suggest follow-up items"
- Reports: "Explain the completion rate", "Which owner has the most overdue actions?"
- Notifications: "Summarise my unread notifications", "What do I need to act on?"
- Admin: "Who has the Approver permission?", "Summarise recent audit events"
- Profile: "How do I change my appearance?", "Help me set notification preferences"

**Connection modes.** Set with `VITE_ASSISTANT_MODE`.
- `api` (target for a complete build): `src/services/assistant.js` sends the conversation, the current route, the user's role and the page name to `${VITE_API_URL}/assistant/chat` and streams or returns the reply. The backend calls the Gemini API through `@google/genai` with a server-side key. **Never put the Gemini key or any AI credential in frontend code or in `.env` files that Vite exposes.**
- `local` (demo fallback, no backend): answers from `src/data/assistantKnowledge.js` (FAQ and page guides) and from the mock data the user is allowed to see. Show a note in the panel: "Demo mode: answers come from built-in MeetTrack information. Connect the assistant service for general questions." Do not claim to answer general questions in this mode.

Pick the mode at startup. If the API call fails, fall back to the error state. Do not switch modes silently.

**Draft actions.** When the assistant proposes action items or a summary from notes, show draft cards with a "Draft" pill, the text, "Suggested owner: [name]. Confirm before assigning." where relevant, and Accept, Edit and Reject buttons. Accept adds the item through the normal service function, shows a toast, and links to the page where it now appears. Nothing is saved without Accept. Participants see Accept disabled on minutes and approvals, with the text "Only [role] can accept changes to this record."

**States.** Empty (intro and chips only), typing indicator (three dots, opacity only), error card with "Try again" (the user's message is kept), assistant unavailable banner, offline banner (composer disabled), usage limit banner, input too long (over 5,000 words, with an error under the field), and "No draft could be made" reply.

**Conversation.** Keep the conversation in memory for the session. "Clear chat" resets it. Enter sends, Shift+Enter adds a line, Escape closes the panel and returns focus to the button, and focus stays inside the open panel.

**Privacy and safety.** Never send another user's data to the assistant beyond what the current user can see. Do not log message contents in the browser console. Show a short line "Don't share passwords or payment details in the chat." in the composer note.

## Theme

- Light, Dark and System. Save the explicit choice as `light`, `dark` or `system` in localStorage. Resolve System with `matchMedia('(prefers-color-scheme: dark)')` and listen for changes.
- Set the theme before the first render (for example in an inline script in `index.html`) to avoid a flash.
- Use the token values from the Stitch theme for both modes. No light or dark hex values inside components.
- Status pills always show an icon and a text label.
- The assistant panel uses the same tokens, and lime appears only on the floating button, Send and Accept.

## Typography, spacing and motion

- Headings: Space Grotesk. Body and UI: DM Sans. Body text at least 14px (13px for metadata only).
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96 px.
- Radius: inputs and small controls 10px, buttons 12px, cards 16px, modals 20px, pills fully rounded.
- Card hover lift 200ms, button press 150ms, page entry fade with 8px rise 220ms, modal and assistant entry 200–220ms.
- Respect `prefers-reduced-motion` with fades under 150ms only.

## Accessibility

- Every input has a visible label.
- Icon-only buttons have accessible names.
- Visible focus rings on all interactive elements.
- Modals and the assistant panel trap focus, close on Escape, and return focus to the trigger.
- Touch targets at least 44px on mobile.
- Keyboard navigation works across the sidebar, tables, tabs, dialogs and the assistant.

## Project structure (suggested)

```
src/
  app/          router, providers, theme, App shell
  components/   Button, Card, Pill, Table, Modal, Drawer, Toast, EmptyState, Skeleton, Shell
  assistant/    AssistantButton, AssistantPanel, MessageList, DraftCard, Composer
  pages/        one file per screen, numbered as in the Stitch prompts
  features/     minutes editor, approval stepper, action detail drawer, blocker panel
  auth/         permissions.js, RequireRole guard, demo role switcher (dev only)
  services/     mock API functions, assistant.js (api and local modes)
  data/         sample records, assistantKnowledge.js (FAQ and page guides)
  styles/       tokens.css, globals.css
```

## Build order

1. Project setup, Tailwind tokens, theme provider, fonts.
2. Shell, sidebar, top bar, route guards, 404 and 403 screens.
3. Shared components and fallback states (buttons, cards, pills, tables, modals, toasts, empty, loading, error).
4. Mock data and services.
5. Floating assistant (button, panel, local mode first, then api mode with the service interface).
6. Screens 01 to 05.
7. Screens 06 to 10, including the minutes editor, approvals, action detail with blockers, and decision follow-up.
8. Screens 11 to 14.
9. Responsive pass, accessibility pass, reduced-motion check, light and dark check on every screen and the assistant.

## Acceptance checklist

- [ ] All 14 routes render and match their Stitch screens.
- [ ] Every fallback state from the Stitch prompts is implemented with the same wording.
- [ ] The floating AI assistant appears on every route, opens and closes correctly, and keeps focus.
- [ ] The assistant answers questions in `api` mode through the service endpoint, and shows the demo notice in `local` mode.
- [ ] No AI key or credential appears in frontend code or in any `VITE_` variable.
- [ ] Assistant drafts never save without Accept, and Participants cannot accept changes to minutes or approvals.
- [ ] Navigation and actions change by role; denied screens show the 403 message.
- [ ] Minutes workflow works end to end: Draft → Submitted → Approved → Published, with Returned as a branch.
- [ ] Actions: create, assign, reassign, update status, overdue calculated from due date, blockers reported and resolved.
- [ ] Decisions: keyword search works; follow-up items can be accepted, edited or dismissed.
- [ ] Reports and charts derive from mock data only. No invented numbers.
- [ ] Forms validate with visible messages.
- [ ] Works at 390px, 820px and 1440px widths, in light and dark.
- [ ] `npm run build` passes with no errors.

## Output expectations

- A README with setup (`npm install`, `npm run dev`, `npm run build`), the route list, how to switch the demo role, and how to set `VITE_ASSISTANT_MODE` and `VITE_API_URL`.
- A short section in the README explaining that the assistant's general knowledge depends on the backend assistant service, which holds the Gemini key on the server.
- `// TODO(backend):` comments wherever the real backend will plug in.
