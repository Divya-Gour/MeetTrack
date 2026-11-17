 # MeetTrack Backend Prompt (Node.js, Express, MongoDB only)

Paste this file into Antigravity to build the backend. It works with `antigravity-prompt-v2.md` for the frontend. Build the backend first, then connect the frontend to it.

---

## 0. Stack lock

Use **only** these technologies:
- **JavaScript** (CommonJS, `require`), running on **Node.js 20 LTS or newer**
- **Express.js** for routing
- **MongoDB** as the database, accessed with **Mongoose**
- **express-session** with **connect-mongo** for sessions, stored in MongoDB
- **Nodemailer** with an SMTP provider for email
- **PDFKit** for PDF exports
- **@google/genai** for the Gemini API
- **dotenv** for environment variables
- **Vitest** and **Supertest** for tests (dev dependencies only)

Install exactly these packages, with no others:

```
npm install express mongoose express-session connect-mongo nodemailer pdfkit @google/genai dotenv
npm install -D vitest supertest
```

Do **not** use TypeScript, Zod, Joi, bcrypt, bcryptjs, argon2, JWT libraries, Passport, Helmet, CORS packages, Nodemon, Winston, Morgan, Redis, Socket.io, GraphQL, Prisma, or any ORM other than Mongoose. Use only Node.js built-ins where a library would otherwise be needed:

- **Password hashing:** `crypto.scrypt` with a random 16-byte salt and a 64-byte key. Compare with `crypto.timingSafeEqual`.
- **Random tokens:** `crypto.randomBytes(32).toString('hex')`. Store only `crypto.createHash('sha256')` of the token.
- **Input validation:** write small validator functions in `src/utils/validate.js`.
- **CORS:** set headers manually in one middleware, allowing only `APP_URL`.
- **Security headers:** set `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Content-Security-Policy: default-src 'none'` in one middleware.
- **CSV and ICS:** generate as plain text in `src/utils/csv.js` and `src/utils/ics.js`.
- **Scheduler:** `setInterval` in `src/jobs/scheduler.js`, not cron packages.
- **Dev watch:** `node --watch src/server.js`, not nodemon.
- **Logging:** `console.log` and `console.error` with a request ID. No logging library.

Node.js built-ins used: `crypto`, `path`, `fs`, `url`, `http`.

---

## 1. Project layout

```
server/
  .env                       (local only, git-ignored)
  .env.example               (committed)
  package.json
  src/
    server.js                starts HTTP server and connects to MongoDB
    app.js                   builds the Express app and mounts routes
    config.js                reads and validates environment variables
    db.js                    Mongoose connection
    middleware/
      requestId.js
      security.js            headers and CORS
      session.js             express-session with connect-mongo
      auth.js                requireAuth, requireRole, requireApprover
      workspace.js           attaches req.workspaceId, tenant filter
      rateLimit.js           counts in MongoDB collection rate_limits
      errors.js              central error handler and notFound
    models/                  one file per collection (see section 3)
    routes/                  one file per feature
    services/                business logic called by routes
      auth.service.js
      invite.service.js
      meeting.service.js
      minutes.service.js
      action.service.js
      decision.service.js
      notification.service.js
      email.service.js
      report.service.js
      export.service.js
      assistant.service.js
      gemini.js
    jobs/
      scheduler.js           reminders, overdue checks, email retries
    utils/
      validate.js
      password.js            scrypt hashing
      tokens.js              random tokens and hashing
      csv.js
      ics.js
      diff.js                line-based diff for minutes versions
      ids.js
    tests/
      ...                    Vitest and Supertest suites (section 10)
  scripts/
    inspect-db.js            shows what is stored in the database
    seed-demo.js             loads Engineering Fest demo data (section 9)
```

---

## 2. Environment

Read these from `server/.env` with `dotenv`. In `config.js`, check the required values at startup and stop with a clear message if one is missing.

Required: `MONGODB_URI`, `SESSION_SECRET` (at least 32 characters), `APP_URL`, `GEMINI_API_KEY`.
Optional: `PORT` (default 4000), `GEMINI_MODEL` (default `gemini-2.5-flash`; confirm the model name in the current `@google/genai` docs), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

If `SMTP_HOST` is missing, email is disabled: invitations and reset links are still created, the email is logged as `skipped` in `notifications`, and the API response tells the admin to copy the link.

If `GEMINI_API_KEY` is missing, the server still starts, the assistant endpoint returns `503 ASSISTANT_UNAVAILABLE`, and everything else works.

Never log, return, or include any of these values in an error message.

---

## 3. Data model: what is stored and where

All collections live in one MongoDB database named in `MONGODB_URI`, for example `meettrack`. Tests use `meettrack_test`. Each collection below has a Mongoose model in `src/models/`. Every tenant-owned collection has a `workspaceId` field and an index that starts with it.

| Collection | Stores | Key fields | Notes |
|---|---|---|---|
| `users` | People who can sign in | `_id`, `name`, `email` (unique, lowercase), `passwordHash`, `passwordSalt`, `failedLogins`, `lockedUntil`, `createdAt` | Password fields are never returned by the API. |
| `workspaces` | One record per organisation | `_id`, `name`, `description`, `timezone`, `createdBy`, `createdAt` | Created by the setup endpoint. |
| `memberships` | Links a user to a workspace with a role | `workspaceId`, `userId`, `role` (admin, coordinator, participant), `approver` (boolean), `status` (active, suspended), `joinedAt` | Unique on `workspaceId + userId`. Role is always read from here, never from the login form. |
| `invitations` | Pending and past invitations | `workspaceId`, `email`, `role`, `approver`, `tokenHash`, `status` (pending, accepted, expired, revoked), `invitedBy`, `message`, `expiresAt`, `acceptedAt` | Only the hash of the token is stored. Index on `tokenHash`. |
| `passwordResets` | Reset tokens | `userId`, `tokenHash`, `expiresAt`, `usedAt` | Expires after 30 minutes and works once. |
| `meetings` | Scheduled meetings | `workspaceId`, `title`, `type`, `startsAt`, `endsAt`, `venue`, `onlineLink`, `organiserId`, `status` (scheduled, in_progress, completed, cancelled), `recurrence` (none, daily, weekly, monthly), `templateId`, `createdBy`, `cancelledAt` | Recurring meetings store one rule, not one document per occurrence. |
| `agendaItems` | Items of a meeting agenda | `workspaceId`, `meetingId`, `title`, `presenterId`, `minutes` (duration), `order` | Reordering updates `order`. |
| `attendance` | Attendance per meeting per person | `workspaceId`, `meetingId`, `userId`, `status` (present, absent, late, not_marked) | Unique on `meetingId + userId`. |
| `meetingTemplates` | Reusable agenda templates | `workspaceId`, `name`, `type`, `agenda` (array of title and minutes) | |
| `minutes` | The current minutes record for a meeting | `workspaceId`, `meetingId`, `status` (draft, submitted, returned, approved, published), `currentVersion`, `submittedBy`, `submittedAt`, `approvedBy`, `approvedAt`, `publishedAt`, `returnComment` | One per meeting. |
| `minutesVersions` | Full history of each version | `workspaceId`, `minutesId`, `version`, `body` (HTML or text), `editedBy`, `changeNote`, `createdAt`, `restoredFrom` | Never updated or deleted. Restore creates a new version. |
| `actions` | Action items | `workspaceId`, `title`, `description`, `sourceMeetingId`, `decisionId`, `ownerId`, `priority` (high, medium, low), `dueDate`, `status` (pending, in_progress, completed), `createdBy`, `completedAt` | Overdue is calculated from `dueDate` and `status`, never stored. |
| `actionHistory` | Every status change and reassignment | `workspaceId`, `actionId`, `event` (created, status_changed, reassigned, blocker_reported, blocker_resolved, blocker_escalated), `from`, `to`, `reason`, `byUserId`, `createdAt` | Append-only. |
| `blockers` | Blockers reported on actions | `workspaceId`, `actionId`, `reason`, `status` (open, escalated, resolved), `reportedBy`, `resolvedBy`, `createdAt`, `resolvedAt` | A reason is required. |
| `decisions` | Decision register | `workspaceId`, `title`, `rationale`, `decisionDate`, `sourceMeetingId`, `linkedActionIds`, `createdBy`, `updatedAt` | Full-text index on `title` and `rationale`. |
| `followUpItems` | Suggested follow-up items for the next agenda | `workspaceId`, `kind` (action, decision), `refId`, `text`, `status` (suggested, accepted, edited, dismissed), `targetMeetingId`, `decidedBy` | Created by the follow-up job or on demand. |
| `notifications` | In-app notifications and their email status | `workspaceId`, `userId`, `type`, `title`, `body`, `link`, `readAt`, `emailStatus` (not_sent, sent, failed, skipped), `emailAttempts`, `createdAt` | `emailStatus` tracks delivery. |
| `auditEvents` | Audit trail of important changes | `workspaceId`, `actorId`, `event` (minutes_approved, minutes_published, role_changed, action_reassigned, version_restored, invite_sent, invite_revoked, member_removed), `targetType`, `targetId`, `details`, `createdAt` | Append-only. Visible to admins. |
| `assistantMessages` | Assistant chat log | `workspaceId`, `userId`, `role` (user, assistant), `content`, `pageContext`, `createdAt` | Optional to store. If stored, auto-delete after 30 days with a TTL index. |
| `rate_limits` | Counters for rate limiting | `key`, `count`, `windowStart`, `expiresAt` | TTL index on `expiresAt`. |
| `sessions` | Express sessions (created by connect-mongo) | `_id` (session ID), `session` (serialised data), `expires` | Do not edit by hand. Contains only the user ID and workspace ID. |

**Indexes to create**
- `users.email` unique.
- `memberships` unique on `workspaceId, userId`.
- `invitations.tokenHash` unique; `invitations` on `workspaceId, status`.
- `meetings` on `workspaceId, startsAt`.
- `minutes` unique on `meetingId`.
- `minutesVersions` unique on `minutesId, version`.
- `actions` on `workspaceId, ownerId, status, dueDate`.
- `decisions` text index on `title, rationale`.
- `notifications` on `userId, readAt, createdAt`.
- `auditEvents` on `workspaceId, createdAt`.
- `rate_limits.expiresAt` TTL with `expireAfterSeconds: 0`.
- `assistantMessages.createdAt` TTL with 30 days.

**Where to look at stored data**
- Run `node scripts/inspect-db.js` to see every collection and its document count.
- Run `node scripts/inspect-db.js users` to see sample documents from one collection. Sensitive fields are shown as `[redacted]`.
- Run `node scripts/inspect-db.js minutes 10 --json` to export ten documents as JSON.
- In MongoDB Compass, connect with the same `MONGODB_URI`, open the database, then open a collection to browse, filter and edit documents.
- In `mongosh`, run `use meettrack` and then `db.meetings.find().pretty()`.

---

## 4. Authentication and accounts

**Endpoints**
- `GET /api/setup/status` returns `{ setupComplete: boolean }`. Setup is complete when at least one workspace exists.
- `POST /api/setup` creates the first admin, the workspace and the admin membership. Body: `{ adminName, email, password, workspaceName, timezone, description }`. Returns 409 `SETUP_ALREADY_DONE` if a workspace exists.
- `POST /api/auth/login` body `{ email, password }`. Sets the session. Returns the current user and workspace.
- `POST /api/auth/logout` destroys the session.
- `GET /api/auth/me` returns the current user, workspace and role. Returns 401 when signed out.
- `POST /api/auth/forgot` body `{ email }`. Always returns `202` with the same message.
- `POST /api/auth/reset` body `{ token, password }`.
- `POST /api/auth/change-password` body `{ currentPassword, newPassword }`. Requires a session.

**Password rules:** at least 8 characters, one number, one symbol, not containing the email address. Reject with `400 WEAK_PASSWORD` and a list of the rules that failed.

**Hashing:** `scrypt` with a random salt. Store `passwordHash` and `passwordSalt` as hex. Verify with `timingSafeEqual`. Never store or log the plain password.

**Login behaviour**
- Wrong email and wrong password return the same `401 INVALID_CREDENTIALS` with the message "The email or password is incorrect."
- After 5 failed attempts for one account, set `lockedUntil` to 15 minutes later. Return `423 ACCOUNT_LOCKED` with the time remaining. Reset the counter on success.
- Also limit login attempts per IP with `rateLimit.js` (for example 20 per 15 minutes) and return `429 RATE_LIMITED`.
- A suspended membership returns `403 ACCOUNT_SUSPENDED`.
- Sessions use a cookie named `mt.sid` with `httpOnly`, `sameSite: 'lax'`, `secure` in production, and a 7-day lifetime. Regenerate the session ID at login.

**Password reset behaviour**
- `forgot` always returns "If an account exists for this email, a reset link is on its way." It never reveals whether the account exists.
- A reset token is valid for 30 minutes and works once. Creating a new token invalidates earlier unused tokens for that user.
- After a successful reset, end all sessions for that user.

**Setup behaviour**
- Setup creates the user with `role: admin` in `memberships`, the workspace, and an audit event `workspace_created`.
- Setup is blocked once a workspace exists. Setup cannot be repeated to change the admin.

---

## 5. Authorisation and tenant isolation

- `requireAuth` loads the session user and the active membership on every request. A change to a role takes effect on the next request.
- `requireRole('admin', 'coordinator')` returns `403 FORBIDDEN` when the role is not allowed.
- `requireApprover` allows the request only when `membership.approver` is true (admins always pass).
- `workspace.js` sets `req.workspaceId` from the membership. Every query for a tenant-owned collection includes `workspaceId: req.workspaceId`. Never accept `workspaceId` from the request body or query.
- An ID from another workspace returns `404 NOT_FOUND`, not `403`, so the existence of records is not revealed.

**Permission matrix**

| Action | Admin | Coordinator | Approver flag | Participant |
|---|---|---|---|---|
| Workspace settings, users, roles | Yes | No | No | No |
| Invite users | Yes | Yes | No | No |
| Create and edit meetings, agenda, attendance | Yes | Yes | No | No |
| Create and edit minutes (draft, submit) | Yes | Yes | No | No |
| Approve, return, publish minutes | Yes | No | Yes (coordinator with flag, or admin) | No |
| Create and assign actions | Yes | Yes | No | No |
| Update own action status, report blockers | Yes | Yes | No | Yes |
| Resolve or escalate blockers | Yes | Yes | No | No |
| Create and edit decisions | Yes | Yes | No | No |
| View reports | Yes (organisation) | Yes (workspace) | No | No |
| View audit log | Yes | No | No | No |
| View published minutes | Yes | Yes | Yes | Yes |
| Use the assistant | Yes | Yes | Yes | Yes |

Note: Approver is a flag. It is allowed on a Coordinator membership and cannot be set on an admin-only action such as user management.

---

## 6. Feature endpoints and rules

All endpoints are under `/api`. Each request body is validated before any database call.

### 6.1 Invitations and team members

- `POST /api/invites` (admin, or coordinator). Body `{ email, role, approver, message }`.
  - Email is required and normalised to lowercase. Role must be `coordinator` or `participant`. Only admins can invite another admin in this version.
  - If the email already has an active membership, return `409 ALREADY_MEMBER`.
  - If a pending invitation exists for the same email, revoke it and create a new one.
  - Generate a token, store the SHA-256 hash, set `expiresAt` 72 hours ahead, store the invitation, and send the email.
  - Response: the invitation details, with `emailStatus`. If email is disabled, include `inviteLink` in the response, shown only to the sender.
- `GET /api/invites` lists invitations in the workspace. Compute `status` as `expired` when `expiresAt` has passed and the status is still `pending`.
- `POST /api/invites/:id/resend` creates a new token, invalidates the old one, and sends a new email.
- `POST /api/invites/:id/revoke` sets status to `revoked`. Only pending invitations can be revoked.
- `GET /api/invites/token/:token` returns `{ workspaceName, role, email, status }` only. Returns `404 INVITE_NOT_FOUND` for unknown tokens and `410 INVITE_EXPIRED`, `410 INVITE_USED` or `410 INVITE_REVOKED` for the other states.
- `POST /api/invites/token/:token/accept` body `{ name, password }`. Creates the user (or reuses an existing user with the same email and signs them in after password check), creates the membership with the invited role and approver flag, marks the invitation accepted, writes audit event `invite_accepted`, and starts a session.
- `GET /api/members` lists memberships with name, email, role, approver flag and status.
- `PATCH /api/members/:id` body `{ role, approver, status }`. Admin only. Writes audit event `role_changed`. An admin cannot demote or suspend the last remaining admin.
- `DELETE /api/members/:id` removes a membership. Admin only. Writes `member_removed`.

### 6.2 Workspace

- `GET /api/workspace` returns name, description, timezone.
- `PATCH /api/workspace` admin only. Updates name, description, timezone.

### 6.3 Meetings, agenda, attendance, templates

- `GET /api/meetings?from=&to=&status=&type=&organiser=` returns meetings in the range. Recurring meetings expand into occurrences inside the range (computed, not stored) and each occurrence has `occurrenceOf` set.
- `POST /api/meetings` coordinator or admin. Validates title, startsAt before endsAt, and a recurrence value. Creates the meeting and the agenda items from `templateId` if provided. Creates an audit event.
- `GET /api/meetings/:id` returns the meeting, agenda, attendance, minutes status, linked decision count and action counts.
- `PATCH /api/meetings/:id` coordinator or admin. Changes details. If the time changes, write a notification to every attendee of type `meeting_updated`.
- `POST /api/meetings/:id/cancel` sets status cancelled and notifies attendees.
- `POST /api/meetings/:id/agenda` add an item. `PATCH /api/agenda/:itemId` edit. `DELETE /api/agenda/:itemId` remove. `POST /api/meetings/:id/agenda/reorder` body `{ order: [itemIds] }` must include every item exactly once.
- `PUT /api/meetings/:id/attendance` body `{ records: [{ userId, status }] }`. Users must be members of the workspace.
- `GET /api/templates`, `POST /api/templates`, `DELETE /api/templates/:id`.

### 6.4 Calendar export

- `GET /api/meetings/:id/ics` returns a valid `text/calendar` file. Use `src/utils/ics.js` to produce RFC 5545 output with CRLF line endings, escaped commas, semicolons and newlines, a UID per meeting, DTSTART and DTEND in UTC, the meeting title as SUMMARY and the venue or link as LOCATION.
- `GET /api/meetings/calendar.ics?from=&to=` returns all meetings in the range as one file.

### 6.5 Minutes workflow

- `GET /api/meetings/:id/minutes` returns the minutes record and its current version body. Create the minutes record with status `draft` and version 1 the first time it is requested by a coordinator.
- `PUT /api/minutes/:id/draft` body `{ body, changeNote }`. Autosave. Creates a new version each time the body changes by more than whitespace, so history stays complete. Only allowed when status is `draft` or `returned`. Returns the new version number and `savedAt`.
- `GET /api/minutes/:id/versions` lists versions without bodies. `GET /api/minutes/:id/versions/:n` returns one version body.
- `GET /api/minutes/:id/diff?from=n&to=m` returns added and removed lines computed in `diff.js`.
- `POST /api/minutes/:id/restore` body `{ version }`. Creates a new version with the old body and `restoredFrom` set. Audit event `version_restored`. Not allowed when published.
- `POST /api/minutes/:id/submit`: requires a body with at least one character. Status becomes `submitted`, `submittedBy` and `submittedAt` are stored, approvers get a notification.
- `POST /api/minutes/:id/approve`: requires approver permission. The submitter cannot approve their own minutes. Status becomes `approved`, audit event `minutes_approved`.
- `POST /api/minutes/:id/return` body `{ comment }`: comment is required, 1 to 1000 characters. Status becomes `returned`, the submitter is notified.
- `POST /api/minutes/:id/publish`: requires approver permission and status `approved`. Status becomes `published`, `publishedAt` set, audit event `minutes_published`, and notifications sent to all attendees. Published minutes cannot be edited.
- `GET /api/minutes/:id/pdf` returns the minutes as a PDF generated with PDFKit (title, meeting date, attendees, version, body). Allowed for published minutes for all members, and for any status for coordinators, admins and approvers.

Concurrency: `PUT draft` requires `If-Match: <currentVersion>`. If the version has changed, return `409 VERSION_CONFLICT` with the current version number.

### 6.6 Actions, history and blockers

- `GET /api/actions?owner=&status=&priority=&overdue=&meetingId=` returns actions. Compute `overdue` as `dueDate < now and status !== completed`, and `daysOverdue`.
- `POST /api/actions` coordinator or admin. Owner and dueDate are required. Creates an `actionHistory` entry `created`. Notifies the owner (`action_assigned`).
- `PATCH /api/actions/:id` edits title, description, priority, dueDate. Coordinator or admin.
- `POST /api/actions/:id/status` body `{ status }`. Owner, coordinator or admin. Participants can change only their own actions. Writes history. Setting completed sets `completedAt`.
- `POST /api/actions/:id/reassign` body `{ ownerId, reason }`. Coordinator or admin. Reason is required. Writes history and audit event `action_reassigned`, and notifies the new owner.
- `POST /api/actions/:id/blockers` body `{ reason }` by the owner or a coordinator. Reason is required. Creates a blocker with status open and notifies the coordinators.
- `POST /api/blockers/:id/resolve` coordinator or admin. Sets resolved and records `resolvedBy`.
- `POST /api/blockers/:id/escalate` coordinator or admin. Sets escalated and notifies admins.
- `GET /api/actions/:id/history` returns the history list in order.

### 6.7 Decisions and follow-up

- `GET /api/decisions?q=&from=&to=` uses the text index for keyword search, with `score` sorting when `q` is present.
- `POST /api/decisions` coordinator or admin. Title and rationale required. Optional `sourceMeetingId` and `linkedActionIds` (must belong to the workspace).
- `PATCH /api/decisions/:id` and `DELETE /api/decisions/:id` coordinator or admin.
- `GET /api/followup` returns suggested follow-up items: actions not completed and decisions with no linked completed action, both in the workspace. Create `followUpItems` rows with status `suggested` for any not yet recorded.
- `POST /api/followup/:id/decide` body `{ decision: accepted|edited|dismissed, text?, targetMeetingId? }`. Edited requires text.
- `POST /api/followup/save-to-agenda` body `{ meetingId }` adds every accepted item as an agenda item of that meeting.

### 6.8 Notifications and reminders

- `GET /api/notifications?unread=&type=&page=` returns the current user's notifications, 20 per page.
- `POST /api/notifications/:id/read` and `POST /api/notifications/:id/unread`.
- `POST /api/notifications/read-all`.
- `scheduler.js` runs every 15 minutes:
  - Send reminders for meetings starting in the next 24 hours to attendees, once per meeting (store `reminderSentAt` on the meeting).
  - Create `action_overdue` notifications for owners of overdue actions, once per day per action.
  - Create `blocker_open` notifications for coordinators when a blocker has been open for 2 days.
  - Retry failed emails up to 3 times with delays of 5, 15 and 60 minutes.

### 6.9 Email

- `email.service.js` wraps Nodemailer. Build the SMTP transport from config. Send to one recipient or a list.
- Templates are plain text functions for: invitation, password reset, meeting invitation or update, minutes submitted, minutes published, action assigned, reminder. Each includes the workspace name and a link to the app.
- Failures never crash a request. The result is written to `notifications.emailStatus`.

### 6.10 Reports and analytics

- `GET /api/reports/summary?from=&to=` returns totals: meetings, actions, completed, pending, in progress, overdue, completion rate. Use MongoDB aggregation with `$match` on `workspaceId`.
- `GET /api/reports/owners` returns per-owner totals and completion.
- `GET /api/reports/status` returns counts per status (including overdue).
- `GET /api/reports/actions.csv` returns outstanding actions as CSV with owner, priority, due date, status, days overdue. CSV escaping in `csv.js`.
- `GET /api/reports/actions.pdf` returns the same data as a PDF using PDFKit.
- Admins get workspace totals. Coordinators get the same workspace scope. Participants receive `403`.

### 6.11 Dashboard

- `GET /api/dashboard` returns the summary cards for the current role, upcoming meetings (next 7 days), the current user's actions and deadlines in the next 7 days, recent activity from `auditEvents` (admins) or notifications (others), and unread notification count.

### 6.12 Audit log

- `GET /api/audit?event=&actorId=&from=&to=&page=` admin only. Returns events in reverse time order, 50 per page. Read-only. There is no endpoint to edit or delete audit events.

### 6.13 AI assistant (Gemini)

- `POST /api/assistant/chat` requires a session. Body `{ messages: [{role, content}], pageContext }`. Limit to 20 messages and 5,000 words in total. Reject larger input with `413 INPUT_TOO_LARGE`.
- Rate-limit per user with `rate_limits`: 30 messages per hour. Return `429 ASSISTANT_LIMIT` with `retryAfterSeconds`.
- `assistant.service.js` builds the system prompt: what MeetTrack is, the current page, the user's role, and a compact summary of the workspace records that user can see (own actions, upcoming meetings, open decisions). It never includes another user's private data, passwords, tokens or session data.
- `gemini.js` creates the `@google/genai` client once with `GEMINI_API_KEY` from config. It calls the model in `GEMINI_MODEL`. It handles errors and returns `502 ASSISTANT_ERROR` with no provider details.
- Response: `{ reply, drafts }`. The model is asked to return action items or summaries as a JSON block, which the server parses. Invalid JSON means `drafts: []`, and the reply is still returned.
- The server never saves drafts. Saving happens only through the normal action or minutes endpoints when the user accepts.
- If `GEMINI_API_KEY` is missing, return `503 ASSISTANT_UNAVAILABLE`.
- Optionally store messages in `assistantMessages` with a 30-day TTL.

---

## 7. API conventions

- JSON in and out. Responses use `{ data }` on success and `{ error: { code, message, fields? } }` on failure.
- Status codes: 200 read or update, 201 created, 202 accepted for background work, 400 validation, 401 not signed in, 403 forbidden, 404 not found (also used for other workspaces), 409 conflict, 410 gone (for invitations), 413 too large, 423 locked, 429 rate limited, 500 unexpected, 503 service unavailable.
- Validation errors list every failing field: `{ "error": { "code": "VALIDATION_FAILED", "message": "Some fields need attention.", "fields": { "email": "Enter a valid email." } } }`.
- Pagination uses `page` and `pageSize` (max 100) and returns `{ data, meta: { page, pageSize, total } }`.
- Dates are ISO 8601 in UTC. The client converts to the workspace timezone.
- Every response includes an `X-Request-Id` header. Logs include the same ID.
- Central error handler: unknown errors return `500 INTERNAL` with a generic message and log the stack trace with the request ID. Never return stack traces to clients.
- `notFound` handler for unknown routes: `404 NOT_FOUND`.
- Mutating requests (POST, PATCH, PUT, DELETE) must include the header `X-Requested-With: meettrack` or they are rejected with `403 CSRF_HEADER_MISSING`. This protects against cross-site form posts.

---

## 8. Background work and data safety

- `scheduler.js` starts only when `NODE_ENV !== 'test'`.
- Jobs are idempotent: each job checks a stored timestamp before it sends or creates something, so restarting the server does not send duplicates.
- Database writes that change more than one collection (for example approving minutes and writing the audit event) use a Mongoose session transaction when the MongoDB deployment supports transactions. If it does not, write the primary record first and the audit event second, and log an error if the second write fails.
- Soft delete is not used for meetings. Cancelled meetings keep their history.
- Minutes versions and audit events are never updated or deleted by the API.

---

## 9. Demo data (Engineering Fest)

`scripts/seed-demo.js` loads the Engineering Fest data for testing and for a demo server:
- Run only with `node scripts/seed-demo.js --confirm`. Without `--confirm`, print what would be inserted and exit.
- The script refuses to run if the database already has a workspace unless `--reset` is also given.
- Use the same people, meetings, agenda, minutes, decisions, actions and notifications as the Engineering Fest demo in `antigravity-prompt-v2.md`.
- Demo accounts use the password `DemoPass@2026`. Hash it with the same `scrypt` function as real accounts.
- The frontend demo mode stays in the browser. This seed is for server testing and must never run automatically in live setup.

---

## 10. Testing (Vitest and Supertest)

Use a separate database `meettrack_test` (set `MONGODB_URI` in `.env.test`). Clear collections before each test file. Run with `npm test`.

Test suites and what each must prove:

1. **Setup:** creates the first admin and workspace; second setup returns 409; weak password is rejected with the failing rules listed.
2. **Login and sessions:** correct login sets `mt.sid`; wrong email and wrong password return the same message; five failures lock the account; locked account returns 423 even with the right password; success resets the counter; logout ends the session; `/auth/me` returns 401 after logout.
3. **Password reset:** forgot returns the same response for known and unknown emails; reset token works once; expired token fails; sessions end after reset.
4. **Invitations:** invite creates a hashed token and emails the link (use a fake transport in tests); duplicate member is rejected; accept creates membership with the invited role and approver flag; accepted link cannot be reused; expired link returns 410; revoked link returns 410; resend invalidates the old link; without SMTP, `inviteLink` is returned to the sender only.
5. **Tenant isolation:** a user in workspace A cannot read, edit or delete meetings, actions or decisions in workspace B (each returns 404); `workspaceId` in a body is ignored.
6. **RBAC:** participant cannot create meetings, approve minutes or see audit events; coordinator without approver flag cannot approve; approver can approve but cannot approve their own submitted minutes; admin cannot be removed when they are the last admin.
7. **Meetings:** create validates start before end; recurring weekly meeting appears on each matching date in the requested range; ICS output contains correct CRLF endings and escaped text; cancelled meetings notify attendees.
8. **Minutes:** autosave creates versions; `If-Match` with an old version returns 409; submit, return with comment, resubmit, approve and publish happen in order; return without a comment is rejected; publish blocks further edits; restore creates a new version and does not change history; PDF returns `application/pdf`.
9. **Actions:** overdue is calculated from dueDate and status; participant can update only own action; reassign without reason is rejected; history records each change in order; blocker requires a reason; resolve and escalate change status and notify correctly.
10. **Decisions and follow-up:** keyword search returns matching decisions; linked action IDs must belong to the same workspace; accepted follow-up items can be saved to an agenda.
11. **Notifications and jobs:** reminder is sent once per meeting even if the job runs twice; email failure is recorded as `failed` and retried; `read-all` marks every unread item.
12. **Reports:** summary totals match seeded data; CSV escapes commas and quotes; participant gets 403.
13. **Assistant:** missing key returns 503; rate limit returns 429 after 30 messages; prompt builder excludes other users' data (assert on the generated prompt with a stubbed Gemini client); invalid JSON from the model returns `drafts: []`.
14. **Security headers and CSRF:** responses include the security headers; mutating request without `X-Requested-With` returns 403.
15. **Audit:** each listed event is written; audit endpoint is admin only; there is no route to modify audit events.

---

## 11. Scripts and running

`package.json` scripts:
- `start`: `node src/server.js`
- `dev`: `node --watch src/server.js`
- `test`: `vitest run`
- `seed:demo`: `node scripts/seed-demo.js`
- `db:inspect`: `node scripts/inspect-db.js`

`server/.env` is created from `.env.example`. It is git-ignored, so `GEMINI_API_KEY` and SMTP passwords are never committed.

---

## 12. Acceptance checklist

- [ ] `npm install` installs only the packages in section 0.
- [ ] `server` starts, connects to MongoDB, and fails clearly when a required variable is missing.
- [ ] Every endpoint in section 6 exists, validates input, and returns the documented status codes.
- [ ] Every collection in section 3 is created with its indexes.
- [ ] `node scripts/inspect-db.js` lists all collections and shows redacted samples.
- [ ] Setup, login, lockout, reset, invitations, minutes workflow, actions, blockers, decisions, follow-up, notifications, reports, audit and assistant all work end to end.
- [ ] Tenant isolation and role rules pass the Vitest suites in section 10.
- [ ] No password, token, session or API key appears in any response, log line or inspection output.
- [ ] Email failures do not break requests and are retried.
- [ ] `npm test` passes.
- [ ] Only the approved packages appear in `package.json`.

---

## 13. Build order

1. Project setup, `config.js`, `db.js`, `app.js`, security and request ID middleware, error handler.
2. Models and indexes (section 3). Run `inspect-db.js` to confirm connection.
3. Password and token utilities, setup, login, logout, `/auth/me`, sessions.
4. Authorisation middleware and tenant filter, then tests for isolation and RBAC.
5. Invitations and members, email service, reset flow.
6. Workspace, meetings, agenda, attendance, templates, ICS.
7. Minutes workflow, versions, diff, restore, PDF.
8. Actions, history, blockers.
9. Decisions and follow-up.
10. Notifications, scheduler, reminders and retries.
11. Reports, CSV and PDF, dashboard, audit log.
12. Assistant with Gemini, rate limit, drafts.
13. Demo seed script, full test run, acceptance pass.
