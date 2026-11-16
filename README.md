# MeetTrack — High-Trust Governance & Meeting Operations

MeetTrack is an enterprise-grade meeting governance, quorum tracking, and cryptographic minute sealing platform built from the ground up to enforce single-DRI (Directly Responsible Individual) accountability, live quorum health, and cryptographically sealed minutes.

---

## ⚡ Key Features

- **Dual Mode System:**
  - **Demo Mode:** Instant, zero sign-up exploration loaded with sample **Engineering Fest 2026** data. All edits persist in browser `localStorage` (`mt.demo.v1`) and never touch the live server database. A persistent banner provides a one-click **Reset demo data** button.
  - **Live Mode:** Clean, blank product with a 4-step setup wizard, real password provisioning (bcrypt), email invitations via SMTP, and full persistence via Node.js + Express + MongoDB.
- **Single DRI Mandate:** Every action item enforces one owner, SLA deadlines, and explicit blocker tracking with faculty/admin escalations.
- **Cryptographic Minutes Sealing:** Minutes move through Draft → Submitted → Approved → Published, generating an immutable SHA-256 seal. Published records are strictly read-only.
- **AI Assistant:**
  - In **Demo Mode:** Answers offline from the Engineering Fest sample dataset with no API key needed.
  - In **Live Mode:** Powered by Google's **Gemini API** (`gemini-2.5-flash`) via an authenticated backend endpoint. The API key lives exclusively on the server and is never exposed to the client.

---

## 🏗️ Architecture

```
meet_track/
├── .gitignore              # Ignores server/.env, client/.env, node_modules, dist
├── .env.example            # Server configuration template
├── client.env.example      # Client configuration template
├── package.json            # Monorepo root scripts
├── README.md               # Documentation
│
├── client/                 # React + Vite Frontend (JS only)
│   ├── index.html          # Anti-flash theme bootstrapper & fonts
│   ├── package.json        # Frontend scripts & dependencies
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── app/            # ThemeProvider (Light / Dark / System sync)
│   │   ├── assistant/      # AssistantButton, AssistantPanel, DraftCard
│   │   ├── auth/           # AuthContext (Mode & Session), RequireRole, Permissions
│   │   ├── components/     # Shell, DemoBanner, Modal, Drawer, Toast, Pill, Button
│   │   ├── data/           # demoStore.js (mt.demo.v1), mockData.js (Engineering Fest)
│   │   ├── pages/          # 14 Stitch screens + SetupWizard + JoinInvite + 403/404
│   │   ├── services/       # Dual-mode api.js & assistant.js
│   │   └── styles/         # tokens.css & globals.css
│
└── server/                 # Node.js + Express + Mongoose Backend
    ├── package.json        # Express, Mongoose, @google/genai, bcryptjs, nodemailer
    ├── .env.example        # Server environment template
    ├── scripts/
    │   └── seed-demo.js    # Demo database seeder
    └── src/
        ├── index.js        # Express app, helmet, cors, session & startup guards
        ├── middleware/     # requireAuth, requireRole, requireWorkspace
        ├── models/         # User, Workspace, Membership, Invitation, Meeting, Minutes, Action, Decision
        ├── routes/         # auth, invites, meetings, minutes, actions, decisions, reports, admin, assistant
        └── services/       # gemini.js (GoogleGenAI), mailer.js (Nodemailer)
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+ or 20+
- MongoDB instance (local `mongodb://localhost:27017` or MongoDB Atlas URI)
- Google Gemini API Key (from [Google AI Studio](https://aistudio.google.com/))

### 2. Environment Configuration

#### A. Configure Server Secrets
```bash
# In meet_track root:
copy .env.example server\.env
```
Edit `server/.env` and add your real Gemini API key:
```env
PORT=5000
NODE_ENV=development
APP_URL=http://localhost:5173
MONGODB_URI=mongodb://localhost:27017/meettrack
SESSION_SECRET=a_very_long_secure_session_secret_min_32_characters

# Gemini API Key (Required for live mode assistant)
GEMINI_API_KEY=AIzaSy...your_real_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional SMTP Settings for Live Email Invitations
# If left empty, invite links will be surfaced in the UI for the admin to copy
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="MeetTrack Governance <noreply@meettrack.org>"
```

#### B. Verify Secret Files are Git Ignored
```bash
git check-ignore -v server/.env
# Output: .gitignore:14:server/.env    server/.env
```
`server/.env` is strictly ignored and will never be committed to source control.

#### C. Configure Client
```bash
copy client.env.example client\.env
```
Contains only the public backend URL:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🏃 Running the Application

### Development Mode (Client & Server)
```bash
# 1. Start the backend server (runs with node --watch)
npm run server

# 2. In another terminal, start the Vite frontend
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

### Production Build
```bash
# Builds the Vite client application into client/dist/
npm run build
```

---

## 🎭 Two Ways to Experience MeetTrack

### Option 1: Explore the Demo (Engineering Fest 2026)
Click **"Explore the demo with sample Engineering Fest data"** on the landing page or sign-in page:
- **Zero sign-up required:** Instantly loads the sample workspace for **Engineering Fest 2026 — Organising Committee**.
- **7 Pre-configured Personas** (all with password `DemoPass@2026`):
  1. **Aarav Menon** (Admin, Lead Convener, Workspace Owner)
  2. **Priya Nair** (Coordinator & Minutes Approver, Head of Sponsorship & Finance)
  3. **Rahul Shetty** (Coordinator, Technical Events & Judging)
  4. **Meera Joshi** (Coordinator, Volunteers & Schedule)
  5. **Kiran Rao** (Participant, Facilities & Logistics)
  6. **Ananya Desai** (Participant & Faculty Minutes Approver)
  7. **Dev Patil** (Participant, Robotics & Hardware Stalls DRI)
- **Overdue Action Item:** "Collect three quotes for stage and banners" assigned to Priya Nair is overdue based on the demo virtual date (15 Nov 2026).
- **Blocked Action Item:** Dev Patil's 6 power outlets per robotics stall is flagged with blocker: *"Electronics lab approval pending"*.
- **Resetting Demo Data:** The persistent top banner allows restoring the pristine Engineering Fest dataset in one click.

### Option 2: Create Your Workspace (Live Mode)
Click **"Create your workspace"** to start the 4-step wizard:
1. **Step 1: Admin Account:** Enter name, email, and choose a secure password (live checklist verifies >=8 chars, 1 number, 1 symbol, not email).
2. **Step 2: Workspace Name:** Set committee name (e.g. "Acme Governance Board") and timezone.
3. **Step 3: Invite Team:** Invite coordinators and participants with optional minutes approver permissions.
4. **Step 4: Kickoff Session:** Schedule your first meeting.
5. **Fresh Blank State:** Every list and dashboard card starts empty with clear guidance and primary actions.

---

## 📧 Team Invitations Workflow

1. An Admin or Coordinator visits **Workspace → Users and roles → Invite user**.
2. Fills in the invitee's email, selects role, and ticks the **Approver permission** checkbox.
3. If SMTP is configured in `server/.env`, Nodemailer sends a branded email containing the workspace name, role, and a secure 72-hour join link (`/join/<token>`).
4. If SMTP is not configured, the UI alerts the admin and provides a **Copy invite link** button.
5. The invitee opens `/join/<token>`, enters their name, sets their password, and joins the workspace immediately.
6. The Users table tracks invitation lifecycle states: **Invited (pending)**, **Accepted**, **Expired**, and **Revoked**.

---

## 🤖 Contextual Gemini AI Assistant

- **Desktop Floating Button:** Lime pill (`AI assistant`) in the bottom right corner.
- **Mobile Floating Button:** 52px circle button.
- **Live Scoped Prompts:** The server passes only the records visible to the user's role to Gemini and limits messages to 20 per turn (<5,000 words).
- **Rate Limiting:** Users are capped at 30 messages per hour.
- **Interactive Draft Proposals:** Any state modifications generated by the model (e.g. drafting action items or agendas) render interactive **Draft Cards** requiring user confirmation (`Accept Draft`, `Edit`, `Reject`). Nothing is saved without explicit approval.

---

## 🛡️ Security & Design Standards
- Passwords hashed with `bcryptjs` (salt factor 12).
- Failed sign-in lockout: 5 failed attempts locks authentication for 15 minutes.
- Same error message for invalid email or password: `"The email or password is incorrect."`
- Reset tokens expire in 30 minutes and are single-use.
- Tokenized Tailwind CSS system (`--bg`, `--surface`, `--accent: #B6E34A`).
- Typography: Space Grotesk (headings), DM Sans (body), JetBrains Mono (hashes/code).

All rights reserved © 2026 MeetTrack Governance Systems.
