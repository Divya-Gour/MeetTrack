// server/src/config.js
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = process.env.NODE_ENV === 'test'
  ? path.join(__dirname, '../.env.test')
  : path.join(__dirname, '../.env');

dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const PORT = parseInt(process.env.PORT, 10) || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Check required variables at startup
if (!MONGODB_URI) {
  console.error('[FATAL] Missing required environment variable: MONGODB_URI');
  process.exit(1);
}

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  console.error('[FATAL] Missing or invalid SESSION_SECRET: must be at least 32 characters long');
  process.exit(1);
}

const config = {
  port: PORT,
  nodeEnv: NODE_ENV,
  isProduction: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  mongodbUri: MONGODB_URI,
  sessionSecret: SESSION_SECRET,
  appUrl: APP_URL,

  // Gemini API
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  isAssistantEnabled: Boolean(process.env.GEMINI_API_KEY),

  // SMTP Settings
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '"MeetTrack Governance" <noreply@meettrack.org>',
  },
  isEmailEnabled: Boolean(process.env.SMTP_HOST),
};

module.exports = config;
