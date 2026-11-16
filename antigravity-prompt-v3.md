# Antigravity Prompt v3: MeetTrack Frontend (connected to the backend)

Source of truth: `backend-prompt.md`. Every API path, status code, error code and role rule in this prompt matches that file. If the two ever disagree, stop and report it instead of guessing.

Build the backend first, confirm it runs, then build this frontend against it. Stitch MCP is connected, and the 14 Stitch screens are the visual reference.

---

## 1. Scope

Build the React frontend with two modes:
- **Demo mode:** runs entirely in the browser with Engineering Fest sample data (defined in section 9). It never calls the API, and never reads or writes the server database.
- **Live mode:** every read and write goes through the backend API. Data comes only from the server.

Build the floating AI assistant on every route. In live mode it calls `POST /api/assistant/chat`. In demo mode it answers from the demo data only.

Do not build any server code in this step.

---

## 2. Stack lock

- **JavaScript only** (no TypeScript). React, Vite, React Router, Tailwind CSS, Lucide React, Recharts.
- Fonts: Space Grotesk (headings and numbers), DM Sans (everything else).
- For tests: Vitest and React Testing Library (dev dependencies only).
- Do not add state libraries, form libraries, UI kits, date libraries or HTTP clients. Use the built-in `fetch` in the API client, and React Context for state.
- Do not add any dependency that talks to Gemini, SMTP, MongoDB or a password library. Those belong to the backend.

---

## 3. Environment

- `client/.env` contains only `VITE_API_URL` (for example `http://localhost:4000/api`) and `VITE_DEFAULT_MODE` (`ask`, `demo` or `live`).
- Never add secrets to `client/.env`. Vite exposes every `VITE_` variable to the browser.
- Use `client.env.example` as the template.

---

## 4. API client (required, one file)

Create `src/services/api.js`. Every live request goes through it.

Rules:
1. Base URL from `VITE_API_URL`.
2. Send `credentials: 'include'` so the `mt.sid` session cookie is sent and stored.
3. For **POST, PATCH, PUT and DELETE**, always add the header `X-Requested-With: meettrack`. The backend rejects these requests with `403 CSRF_HEADER_MISSING` without it.
4. Send `Content-Type: application/json` when there is a body.
5. For `PUT /api/minutes/:id/draft`, send `If-Match: <currentVersion>`.
6. Parse responses: success returns `data` (and `meta` for paginated lists). Failure returns `error` with `code`, `message` and optional `fields`.
7. Map error codes to UI behaviour:
   - `INVALID_CREDENTIALS`: "The email or password is incorrect." Keep the email, clear the password.
   - `ACCOUNT_LOCKED` (423): show the wait time from the response.
   - `RATE_LIMITED` (429) and `ASSISTANT_LIMIT` (429): show the retry time.
   - `VALIDATION_FAILED` (400): show each field message under its input.
   - `WEAK_PASSWORD` (400): show the rules that failed.
   - `ACCOUNT_SUSPENDED` (403): show the suspended message.
   - `FORBIDDEN` (403): show the 403 screen (Stitch) or a not-available card, depending on the page.
   - `NOT_FOUND` (404): show the 404 screen.
   - `VERSION_CONFLICT` (409): open the conflict dialog from Stitch.
   - `ALREADY_MEMBER` (409): "This person is already in the workspace."
   - `SETUP_ALREADY_DONE` (409): send the user to sign in.
   - `INVITE_NOT_FOUND` (404), `INVITE_EXPIRED`, `INVITE_USED`, `INVITE_REVOKED` (all 410): show the matching invitation screen.
   - `ASSISTANT_UNAVAILABLE` (503) and `ASSISTANT_ERROR` (502): show the assistant unavailable state.
   - `INPUT_TOO_LARGE` (413): show the input-too-long error.
   - Network failure or `500 INTERNAL`: show the offline or 500 state from Stitch. Include the `X-Request-Id` value as a reference code.
8. Never store the session cookie, tokens or passwords in localStorage or sessionStorage. The only browser storage allowed is the theme preference and the demo data (demo mode only).

---

## 5. Startup flow and mode choice

On launch, call `GET /api/setup/status` (live mode) and show one of these:
- **Setup not complete:** landing page with **Create your workspace** (goes to the setup wizard) and **Explore the demo**.
- **Setup complete:** landing page with **Sign in** and **Explore the demo**. The wizard is never shown again.

**Explore the demo** sets the mode to `demo`, shows the demo banner, and skips the API.

Live mode signs in with `POST /api/auth/login`. After that, call `GET /api/auth/me` on every page load to restore the session. If it returns 401, go to sign-in.

Switching modes: leaving demo mode or live mode requires signing out or confirming "Leave demo". Demo data is never copied into live mode.

---

## 6. Live-mode screens and their endpoints

**Setup wizard (Stitch screen 02, first-run variant)**
- Step 1, admin account: `POST /api/setup` with `{ adminName, email, password }` and the workspace fields from step 2.
- Submit everything in one request at the end of the wizard, or save steps locally and submit once. Use one request, since the endpoint creates the admin and the workspace together.
- Body: `{ adminName, email, password, workspaceName, timezone, description }`.
- Live password checklist matches the backend rules: at least 8 characters, one number, one symbol, not containing the email.

**Sign in (screen 02)**
- `POST /api/auth/login` with `{ email, password }`. Admin and Teammate tabs do not change the request. The server decides the role.
- "Forgot password?" calls `POST /api/auth/forgot` and always shows "If an account exists for this email, a reset link is on its way."
- `/reset/:token` form calls `POST /api/auth/reset` with `{ token, password }`.

**Join by invitation (screen 02, join variant, route `/join/:token`)**
- On load: `GET /api/invites/token/:token` shows the workspace name and role. Map `404`, `410` errors to the invitation screens.
- Submit: `POST /api/invites/token/:token/accept` with `{ name, password }`. On success the server signs the user in. Go to the dashboard.

**Dashboard (screen 03)**
- `GET /api/dashboard` for the summary cards, upcoming meetings, the user's actions and deadlines, and recent activity.

**Meetings (screens 04 and 05)**
- List: `GET /api/meetings?from=&to=&status=&type=&organiser=`.
- Create: `POST /api/meetings` (coordinator or admin).
- Edit: `PATCH /api/meetings/:id`. Cancel: `POST /api/meetings/:id/cancel`.
- Calendar: the same list call with a date range. Export: `GET /api/meetings/calendar.ics?from=&to=`, opened as a file download.
- Templates: `GET /api/templates`, `POST /api/templates`, `DELETE /api/templates/:id`.

**Meeting details (screen 06)**
- `GET /api/meetings/:id` for everything on the page.
- Agenda: `POST /api/meetings/:id/agenda`, `PATCH /api/agenda/:itemId`, `DELETE /api/agenda/:itemId`, `POST /api/meetings/:id/agenda/reorder` with `{ order: [itemIds] }`.
- Attendance: `PUT /api/meetings/:id/attendance` with `{ records: [{ userId, status }] }`.
- Single meeting ICS: `GET /api/meetings/:id/ics`.

**Minutes editor (screen 07)**
- Load: `GET /api/meetings/:id/minutes`. This creates the draft if it does not exist.
- Autosave: `PUT /api/minutes/:id/draft` with `{ body, changeNote }` and `If-Match` set to the version the editor loaded. On `VERSION_CONFLICT`, open the conflict dialog.
- Versions: `GET /api/minutes/:id/versions`, `GET /api/minutes/:id/versions/:n`.
- Compare: `GET /api/minutes/:id/diff?from=n&to=m`.
- Restore: `POST /api/minutes/:id/restore` with `{ version }`.
- Submit: `POST /api/minutes/:id/submit`. Submit is disabled until there is content.
- PDF: `GET /api/minutes/:id/pdf`, opened as a download.

**Approvals (screen 08, approver permission only)**
- Queue: `GET /api/minutes?status=submitted,returned,approved,published` (the backend's list route for minutes; if this route does not exist, use the meetings list and filter by minutes status and report the gap).
- Approve: `POST /api/minutes/:id/approve`.
- Return: `POST /api/minutes/:id/return` with `{ comment }`. The comment is required in the UI before the request is sent.
- Publish: `POST /api/minutes/:id/publish`. Show a confirmation dialog first.

**Action items (screen 09)**
- List: `GET /api/actions?owner=&status=&priority=&overdue=&meetingId=`.
- Create: `POST /api/actions`. Owner and due date required in the form.
- Edit: `PATCH /api/actions/:id`.
- Status: `POST /api/actions/:id/status` with `{ status }`.
- Reassign: `POST /api/actions/:id/reassign` with `{ ownerId, reason }`. Reason required.
- Blocker: `POST /api/actions/:id/blockers` with `{ reason }`. Resolve: `POST /api/blockers/:id/resolve`. Escalate: `POST /api/blockers/:id/escalate`.
- History: `GET /api/actions/:id/history`.
- Overdue and days overdue come from the response. Do not calculate them in the browser.

**Decisions and follow-up (screen 10)**
- Search: `GET /api/decisions?q=&from=&to=`.
- Create, edit, delete: `POST /api/decisions`, `PATCH /api/decisions/:id`, `DELETE /api/decisions/:id`.
- Follow-up list: `GET /api/followup`.
- Decide: `POST /api/followup/:id/decide` with `{ decision, text?, targetMeetingId? }`.
- Save accepted items: `POST /api/followup/save-to-agenda` with `{ meetingId }`.

**Reports (screen 11, admin and coordinator)**
- `GET /api/reports/summary`, `GET /api/reports/owners`, `GET /api/reports/status`.
- Export: `GET /api/reports/actions.csv` and `GET /api/reports/actions.pdf` as downloads.

**Notifications (screen 12)**
- List: `GET /api/notifications?unread=&type=&page=`.
- `POST /api/notifications/:id/read`, `POST /api/notifications/:id/unread`, `POST /api/notifications/read-all`.

**Admin (screen 13, admin only)**
- Workspace: `GET /api/workspace`, `PATCH /api/workspace`.
- Invites: `GET /api/invites`, `POST /api/invites` with `{ email, role, approver, message }`, `POST /api/invites/:id/resend`, `POST /api/invites/:id/revoke`.
- When the response contains `inviteLink` (email not configured), show the "Copy invite link" banner. Show the link only to this admin.
- Members: `GET /api/members`, `PATCH /api/members/:id` with `{ role, approver, status }`, `DELETE /api/members/:id`.
- Audit: `GET /api/audit?event=&actorId=&from=&to=&page=`.

**Profile (screen 14)**
- `POST /api/auth/change-password` with `{ currentPassword, newPassword }`.
- Logout: `POST /api/auth/logout`.

**Assistant (every page)**
- `POST /api/assistant/chat` with `{ messages, pageContext }`. Show the reply. Show drafts as draft cards. Accept calls the matching endpoint (for example `POST /api/actions` or the minutes draft). Nothing is saved until Accept.

---

## 7. Demo mode

- Demo data lives in `src/data/demo/` and in browser storage under the key `mt.demo.v1`.
- All service functions have a demo version and a live version with the same name. Pick the version by mode. Screens never check the mode themselves.
- The demo banner stays visible and includes "Reset demo data" (confirmation required) and "Create your workspace".
- The assistant in demo mode answers from demo data and built-in MeetTrack information. Show the notice "Demo mode: answers come from sample Engineering Fest data."

---

## 8. Roles in the UI

- Use the signed-in user's role from `GET /api/auth/me`. Never let the sign-in form set the role.
- Hide navigation items and buttons the role cannot use, using the permission matrix in `backend-prompt.md` section 5.
- The backend is the authority. A hidden button is not a security control. If the API returns `403`, show the 403 state even when the button was visible.
- Approver actions appear only when the response sets `approver: true` in the membership.

---

## 9. Engineering Fest demo data

Use this in demo mode only. The same data is available to the server through `backend-prompt.md` section 9 (`scripts/seed-demo.js`).

- Workspace: Engineering Fest 2026, Organising Committee, timezone Asia/Kolkata.
- People: Aarav Menon (Admin), Priya Nair (Coordinator, approver), Rahul Shetty (Coordinator), Meera Joshi (Coordinator), Kiran Rao (Participant), Ananya Desai (Participant, approver), Dev Patil (Participant). All demo passwords are `DemoPass@2026`.
- Set "today" to 15 Nov 2026 so overdue items show.
- Seven meetings: Kickoff (18 Nov), Sponsorship and budget review (21 Nov), Event logistics (24 Nov), Technical events and judging rubric (26 Nov), Hackathon rules and prize review (28 Nov), Volunteer coordination (2 Dec, weekly), Post-fest review (15 Dec).
- Minutes: one draft, one submitted, one returned with the comment "Add the scoring weights for the robotics round.", one approved, one published.
- Five decisions: 24-hour hackathon with teams of 3 to 4, a ₹1,20,000 printing and stage cap, 6 power outlets per robotics stall, a 100-point judging rubric (40/30/20/10), two-hour volunteer shifts.
- Twelve actions with owners, priorities, due dates and statuses, including one overdue item and one blocked item.
- Six notifications covering the blocker, the returned minutes, reminders and the approval.

---

## 10. Screens, states and accessibility

- Build all 14 screens from the Stitch project, with all fallback states listed in the Stitch prompts (wrong password, too many attempts, expired invitation, 404, 403, 500, offline, session expired, empty states, save failed, conflict, AI states).
- Light, dark and system themes on every screen. Tokens come from the Stitch theme.
- Responsive at 390px, 820px and 1440px.
- Visible labels on every input. Keyboard navigation works everywhere. Focus is visible. Modals and the assistant trap focus and return it on close.
- Respect reduced motion.

---

## 11. Acceptance checklist

- [ ] Only the approved libraries are installed. No TypeScript.
- [ ] Every write request sends `X-Requested-With: meettrack`, confirmed in the network tab.
- [ ] Setup uses `POST /api/setup`, and the setup status check uses `GET /api/setup/status`.
- [ ] Sign-in shows the same message for wrong email and wrong password, and shows the lockout time after 5 failures.
- [ ] Invitation link works from the join page, and expired, used and revoked links show the right screens.
- [ ] Minutes autosave sends `If-Match`, and a conflict opens the conflict dialog.
- [ ] Minutes workflow works in order: submit, return with comment, approve, publish. Published minutes are read-only.
- [ ] Actions: overdue comes from the API, status and blockers work, participants update only their own actions.
- [ ] Reports and exports download correctly.
- [ ] Demo mode works with no network and never calls `/api`.
- [ ] Live mode never shows demo names or numbers.
- [ ] No secret, password or key appears in `client/`, in any `VITE_` variable, or in the built `dist/` output.
- [ ] `npm run build` passes.

---

## 12. Build order

1. Project setup, theme, fonts, routes, the API client, and the error mapping in section 4.
2. App shell and the mode choice (section 5).
3. Live auth screens: setup, sign in, reset, join by invitation, 404, 403, 500.
4. Demo data and the demo banner.
5. Dashboard, meetings, calendar, meeting details.
6. Minutes editor, approvals.
7. Action items, decisions and follow-up.
8. Reports, notifications, admin, profile.
9. Assistant panel in both modes.
10. Accessibility, responsive and theme pass, then the acceptance checklist.

---

## 13. Checking the database

After a live action (for example creating a meeting), run `node scripts/inspect-db.js meetings` in the server folder. The new record should appear with its `workspaceId` and `createdBy`. Use this to confirm that the frontend and backend agree. Passwords and token hashes show as `[redacted]`.
