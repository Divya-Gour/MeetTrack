// server/src/app.js
const express = require('express');
const requestIdMiddleware = require('./middleware/requestId');
const securityMiddleware = require('./middleware/security');
const sessionMiddleware = require('./middleware/session');
const workspaceMiddleware = require('./middleware/workspace');
const { notFoundHandler, errorHandler } = require('./middleware/errors');

// Feature route modules
const authRoutes = require('./routes/auth');
const invitesRoutes = require('./routes/invites');
const workspaceRoutes = require('./routes/workspace');
const meetingsRoutes = require('./routes/meetings');
const minutesRoutes = require('./routes/minutes');
const actionsRoutes = require('./routes/actions');
const decisionsRoutes = require('./routes/decisions');
const notificationsRoutes = require('./routes/notifications');
const reportsRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const assistantRoutes = require('./routes/assistant');

const app = express();

// Trust proxy for rate limiting / secure cookies behind reverse proxies if needed
app.set('trust proxy', 1);

// Global middleware pipeline per Section 1 & 7
app.use(requestIdMiddleware);
app.use(securityMiddleware);
app.use(sessionMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(workspaceMiddleware);

// Mount feature routes under /api
app.use('/api', authRoutes);
app.use('/api', invitesRoutes);
app.use('/api', workspaceRoutes);
app.use('/api', meetingsRoutes);
app.use('/api', minutesRoutes);
app.use('/api', actionsRoutes);
app.use('/api', decisionsRoutes);
app.use('/api', notificationsRoutes);
app.use('/api', reportsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', auditRoutes);
app.use('/api', assistantRoutes);

// Central error handling per Section 7
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
