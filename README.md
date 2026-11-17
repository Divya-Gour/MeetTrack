# MeetTrack

MeetTrack is an institutional meeting minutes, agenda coordination, and decision governance platform. It provides seamless tracking of committee meetings, quorum roll-calls, autosaving minutes with cryptographic versioning and diffs, action items with blocker escalation, decision ledgers with follow-up agendas, and an AI assistant powered by Google Gemini.

---

## Key Features

1. **Dual Entry Architecture**
   - **Explore the Demo**: Instant interactive demo mode loaded with sample **Engineering Fest 2026** data stored client-side in `localStorage` (`mt.demo.v1`). Zero network calls to the server; includes 7 committee members, 7 meetings, 4 minutes records, 12 action items, 5 decisions, and a 1-click "Reset demo data" button.
   - **Create Your Workspace / Live Mode**: Production-grade workspace creation with administrative account setup, scrypt password hashing, session management (`connect-mongo`), invitations, email notifications, role-based access control, and live MongoDB persistence.

2. **Meeting & Minutes Governance**
   - **Meetings & Agenda**: Real-time quorum roll calls, agenda item reordering, and direct `.ICS` calendar exports.
   - **Minutes Editor**: Markdown minutes editor with draft autosaving, version conflict resolution (`409 VERSION_CONFLICT` with `If-Match`), version comparison/diff, rollback, review/approval workflow, and executive PDF generation.
   - **Action Items & Blockers**: Single-DRI accountability, overdue tracking, reassignments with audit reasons, blocker logging, and SLA escalation.
   - **Decision Register**: Full-text searchable decisions linked to actions, with downstream follow-up agenda generators.
   - **AI Assistant**: Context-aware assistant powered server-side by Google Gemini API (`@google/genai`). All API keys are kept strictly in `server/.env`.

---

## Tech Stack Lock

- **Frontend**: JavaScript (ESM), React 18, Vite, React Router 6, Tailwind CSS, Lucide React, Recharts. *(No TypeScript)*
- **Backend**: JavaScript (CommonJS), Node.js, Express, MongoDB with Mongoose, `connect-mongo`, `scrypt` hashing. *(No TypeScript, no external helmet/cors/bcrypt)*
- **Testing**: Vitest, Supertest.

---

## Repository Structure

```
meettrack/
  .gitignore
  README.md
  server/
    .env.example
    .env                  (git-ignored)
    package.json
    scripts/
      inspect-db.js       (Database inspection script)
      seed-demo.js        (Seed script for Engineering Fest data)
    src/
      config.js           (Validated configuration)
      db.js               (MongoDB connection)
      server.js           (HTTP server entry point)
      app.js              (Express pipeline)
      models/             (20 Mongoose models)
      middleware/         (Auth, RBAC, Rate-limit, Security, Session, Errors)
      routes/             (Express API route handlers)
      services/           (Business logic & services)
      jobs/               (Meeting reminders & follow-up agenda scheduler)
    tests/                (15 test suites, 50 automated tests)
  client/
    .env.example
    .env                  (git-ignored)
    package.json
    vite.config.js        (Configured with /api proxy to localhost:4000)
    src/
      app/                (Theme provider & global tokens)
      auth/               (AuthContext, permissions, route guards)
      components/         (Shell, Navigation, DemoBanner, Cards, Buttons, Toasts)
      assistant/          (AssistantButton, AssistantPanel, DraftCards)
      pages/              (14 screens matching Stitch designs)
      services/           (api.js dual-mode client, assistant.js)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ running locally on `127.0.0.1:27017`

### 1. Environment Setup

Copy example environment files:

```powershell
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

Ensure `server/.env` contains your MongoDB URI, Session Secret, and optional Gemini key:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/meettrack
SESSION_SECRET=your-random-32-byte-secret-key-at-least-32-chars
GEMINI_API_KEY=your-gemini-api-key-here # Optional for AI assistant
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Install Dependencies

```powershell
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

---

## Running the Application

### Start the Backend Server

```powershell
cd server
npm run dev
# Starts backend on http://localhost:4000
```

### Start the Frontend Client

```powershell
cd client
npm run dev
# Starts Vite dev server on http://localhost:5173
```

Visit [http://localhost:5173](http://localhost:5173) in your browser:
- Click **"Explore the demo"** to explore the pre-populated Engineering Fest 2026 dataset without creating an account.
- Click **"Create your workspace"** to start the Live Mode setup wizard.

---

## Database Utilities

### Seed Database for Development

To seed the local database with sample Engineering Fest data:

```powershell
# Preview what will be inserted
node server/scripts/seed-demo.js

# Confirm insertion
node server/scripts/seed-demo.js --confirm

# Reset existing database and seed
node server/scripts/seed-demo.js --confirm --reset
```

### Inspect Database Collections

To inspect MongoDB collections and verify data integrity (passwords and hashes are redacted automatically):

```powershell
# List all 21 collections and record counts
node server/scripts/inspect-db.js

# Inspect the most recent documents in a collection
node server/scripts/inspect-db.js actions 5
node server/scripts/inspect-db.js meetings 3
node server/scripts/inspect-db.js invitations
```

---

## Running Automated Tests

Run the complete 15-suite test suite covering setup, authentication, lockout, invitations, RBAC, tenant isolation, meetings, minutes, actions, decisions, reports, security headers, and audit trails:

```powershell
npm --prefix server test
```

All 15 test suites and 50 automated tests run against an isolated test database (`meettrack_test`).

---

## Security Specifications

1. **CSRF Protection**: All mutating HTTP requests (POST, PUT, PATCH, DELETE) require the `X-Requested-With: meettrack` header.
2. **Session Cookies**: Handled via `connect-mongo` under cookie name `mt.sid`, with `httpOnly: true` and `sameSite: 'lax'`.
3. **Password Security**: Passwords hashed using native Node.js `crypto.scrypt` with a per-user 16-byte cryptographically secure salt.
4. **Account Lockout**: 5 consecutive failed login attempts lock the account for 15 minutes (`423 ACCOUNT_LOCKED`).
5. **Tenant Isolation**: Every database query scopes automatically to `req.workspaceId`. Accessing a record from another workspace returns `404 NOT_FOUND`.
6. **Gemini AI Safety**: The Gemini API key resides strictly in `server/.env` and is never exposed to the frontend or git.

MeetTrack is an institutional meeting minutes, agenda coordination, and decision governance platform. It provides seamless tracking of committee meetings, quorum roll-calls, autosaving minutes with cryptographic versioning and diffs, action items with blocker escalation, decision ledgers with follow-up agendas, and an AI assistant powered by Google Gemini.

---

## Key Features

1. **Dual Entry Architecture**
   - **Explore the Demo**: Instant interactive demo mode loaded with sample **Engineering Fest 2026** data stored client-side in `localStorage` (`mt.demo.v1`). Zero network calls to the server; includes 7 committee members, 7 meetings, 4 minutes records, 12 action items, 5 decisions, and a 1-click "Reset demo data" button.
   - **Create Your Workspace / Live Mode**: Production-grade workspace creation with administrative account setup, scrypt password hashing, session management (`connect-mongo`), invitations, email notifications, role-based access control, and live MongoDB persistence.

2. **Meeting & Minutes Governance**
   - **Meetings & Agenda**: Real-time quorum roll calls, agenda item reordering, and direct `.ICS` calendar exports.
   - **Minutes Editor**: Markdown minutes editor with draft autosaving, version conflict resolution (`409 VERSION_CONFLICT` with `If-Match`), version comparison/diff, rollback, review/approval workflow, and executive PDF generation.
   - **Action Items & Blockers**: Single-DRI accountability, overdue tracking, reassignments with audit reasons, blocker logging, and SLA escalation.
   - **Decision Register**: Full-text searchable decisions linked to actions, with downstream follow-up agenda generators.
   - **AI Assistant**: Context-aware assistant powered server-side by Google Gemini API (`@google/genai`). All API keys are kept strictly in `server/.env`.

---

## Tech Stack Lock

- **Frontend**: JavaScript (ESM), React 18, Vite, React Router 6, Tailwind CSS, Lucide React, Recharts. *(No TypeScript)*
- **Backend**: JavaScript (CommonJS), Node.js, Express, MongoDB with Mongoose, `connect-mongo`, `scrypt` hashing. *(No TypeScript, no external helmet/cors/bcrypt)*
- **Testing**: Vitest, Supertest.

---

## Repository Structure

```
meettrack/
  .gitignore
  README.md
  server/
    .env.example
    .env                  (git-ignored)
    package.json
    scripts/
      inspect-db.js       (Database inspection script)
      seed-demo.js        (Seed script for Engineering Fest data)
    src/
      config.js           (Validated configuration)
      db.js               (MongoDB connection)
      server.js           (HTTP server entry point)
      app.js              (Express pipeline)
      models/             (20 Mongoose models)
      middleware/         (Auth, RBAC, Rate-limit, Security, Session, Errors)
      routes/             (Express API route handlers)
      services/           (Business logic & services)
      jobs/               (Meeting reminders & follow-up agenda scheduler)
    tests/                (15 test suites, 50 automated tests)
  client/
    .env.example
    .env                  (git-ignored)
    package.json
    vite.config.js        (Configured with /api proxy to localhost:4000)
    src/
      app/                (Theme provider & global tokens)
      auth/               (AuthContext, permissions, route guards)
      components/         (Shell, Navigation, DemoBanner, Cards, Buttons, Toasts)
      assistant/          (AssistantButton, AssistantPanel, DraftCards)
      pages/              (14 screens matching Stitch designs)
      services/           (api.js dual-mode client, assistant.js)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+ running locally on `127.0.0.1:27017`

### 1. Environment Setup

Copy example environment files:

```powershell
# Server configuration
cp server/.env.example server/.env

# Client configuration
cp client/.env.example client/.env
```

Ensure `server/.env` contains your MongoDB URI, Session Secret, and optional Gemini key:
```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/meettrack
SESSION_SECRET=your-random-32-byte-secret-key-at-least-32-chars
GEMINI_API_KEY=your-gemini-api-key-here # Optional for AI assistant
CLIENT_ORIGIN=http://localhost:5173
```

### 2. Install Dependencies

```powershell
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
cd ..
```

---

## Running the Application

### Start the Backend Server

```powershell
cd server
npm run dev
# Starts backend on http://localhost:4000
```

### Start the Frontend Client

```powershell
cd client
npm run dev
# Starts Vite dev server on http://localhost:5173
```

Visit [http://localhost:5173](http://localhost:5173) in your browser:
- Click **"Explore the demo"** to explore the pre-populated Engineering Fest 2026 dataset without creating an account.
- Click **"Create your workspace"** to start the Live Mode setup wizard.

---

## Database Utilities

### Seed Database for Development

To seed the local database with sample Engineering Fest data:

```powershell
# Preview what will be inserted
node server/scripts/seed-demo.js

# Confirm insertion
node server/scripts/seed-demo.js --confirm

# Reset existing database and seed
node server/scripts/seed-demo.js --confirm --reset
```

### Inspect Database Collections

To inspect MongoDB collections and verify data integrity (passwords and hashes are redacted automatically):

```powershell
# List all 21 collections and record counts
node server/scripts/inspect-db.js

# Inspect the most recent documents in a collection
node server/scripts/inspect-db.js actions 5
node server/scripts/inspect-db.js meetings 3
node server/scripts/inspect-db.js invitations
```

---

## Running Automated Tests

Run the complete 15-suite test suite covering setup, authentication, lockout, invitations, RBAC, tenant isolation, meetings, minutes, actions, decisions, reports, security headers, and audit trails:

```powershell
npm --prefix server test
```

All 15 test suites and 50 automated tests run against an isolated test database (`meettrack_test`).

---

## Security Specifications

1. **CSRF Protection**: All mutating HTTP requests (POST, PUT, PATCH, DELETE) require the `X-Requested-With: meettrack` header.
2. **Session Cookies**: Handled via `connect-mongo` under cookie name `mt.sid`, with `httpOnly: true` and `sameSite: 'lax'`.
3. **Password Security**: Passwords hashed using native Node.js `crypto.scrypt` with a per-user 16-byte cryptographically secure salt.
4. **Account Lockout**: 5 consecutive failed login attempts lock the account for 15 minutes (`423 ACCOUNT_LOCKED`).
5. **Tenant Isolation**: Every database query scopes automatically to `req.workspaceId`. Accessing a record from another workspace returns `404 NOT_FOUND`.
6. **Gemini AI Safety**: The Gemini API key resides strictly in `server/.env` and is never exposed to the frontend or git.
