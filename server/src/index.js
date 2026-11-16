// server/src/index.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cors from 'cors';
import helmet from 'helmet';

// ---------------- 1. VERIFY CRITICAL SECRETS AT STARTUP ----------------
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
  console.error('\x1b[31m%s\x1b[0m', '══════════════════════════════════════════════════════════════');
  console.error('\x1b[31m%s\x1b[0m', 'FATAL ERROR: GEMINI_API_KEY is not set. Add it to server/.env.');
  console.error('\x1b[31m%s\x1b[0m', '══════════════════════════════════════════════════════════════');
  process.exit(1);
}

// ---------------- 2. ROUTE IMPORTS ----------------
import authRouter from './routes/auth.js';
import invitesRouter from './routes/invites.js';
import meetingsRouter from './routes/meetings.js';
import minutesRouter from './routes/minutes.js';
import actionsRouter from './routes/actions.js';
import decisionsRouter from './routes/decisions.js';
import notificationsRouter from './routes/notifications.js';
import reportsRouter from './routes/reports.js';
import adminRouter from './routes/admin.js';
import assistantRouter from './routes/assistant.js';

const app = express();
const PORT = process.env.PORT || 5000;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/meettrack';

// ---------------- 3. SECURITY & CORS MIDDLEWARE ----------------
app.use(helmet());
app.use(
  cors({
    origin: APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------- 4. MONGODB & SESSION STORE ----------------
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log(`[DATABASE] Connected to MongoDB at ${MONGODB_URI}`))
  .catch((err) => {
    console.warn(`[DATABASE] Notice: MongoDB connection failed (${err.message}). Ensure mongod or MongoDB Atlas is configured.`);
  });

let sessionStore;
try {
  sessionStore = MongoStore.create({
    mongoUrl: MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60, // 24 hours
  });
} catch (e) {
  console.warn('[SESSION] Using default in-memory session store.');
}

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'meettrack_session_secret_32_characters_long_min',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ---------------- 5. API ROUTES REGISTRATION ----------------
app.use('/api/auth', authRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/minutes', minutesRouter);
app.use('/api/actions', actionsRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/assistant', assistantRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Fallback 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER_ERROR]', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`[SERVER] MeetTrack API running on port ${PORT}`);
  console.log(`[SERVER] Client allowed origin: ${APP_URL}`);
});

