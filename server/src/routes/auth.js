// server/src/routes/auth.js
const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { requireAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimit');

// Rate limit login per IP: 20 per 15 min per Section 4
const loginRateLimiter = createRateLimiter({
  keyGenerator: (req) => `ip:${req.ip}:login`,
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  errorCode: 'RATE_LIMITED',
  errorMessage: 'Too many login attempts. Please try again in 15 minutes.',
});

// GET /api/setup/status per Section 4
router.get('/setup/status', async (req, res, next) => {
  try {
    const status = await authService.getSetupStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

// POST /api/setup per Section 4
router.post('/setup', async (req, res, next) => {
  try {
    const { adminName, email, password, workspaceName, timezone, description } = req.body;
    const result = await authService.setupFirstAdmin({
      adminName,
      email,
      password,
      workspaceName,
      timezone,
      description,
    });

    // Establish session
    req.session.userId = result.user._id.toString();
    req.session.workspaceId = result.workspace._id.toString();

    res.status(201).json({
      data: {
        user: result.user,
        workspace: result.workspace,
        membership: result.membership,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login per Section 4
router.post('/auth/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });

    // Regenerate session ID at login per Section 4
    req.session.regenerate((err) => {
      if (err) return next(err);

      req.session.userId = result.user._id.toString();
      req.session.workspaceId = result.workspace._id.toString();

      res.json({
        data: {
          user: result.user,
          workspace: result.workspace,
          membership: result.membership,
        },
      });
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout per Section 4
router.post('/auth/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('mt.sid');
    res.json({ data: { message: 'Signed out successfully.' } });
  });
});

// GET /api/auth/me per Section 4
router.get('/auth/me', requireAuth, (req, res) => {
  res.json({
    data: {
      user: req.user.toJSON(),
      workspace: req.workspace,
      membership: req.membership,
      role: req.membership.role,
      approver: req.membership.approver,
    },
  });
});

// POST /api/auth/forgot per Section 4
router.post('/auth/forgot', async (req, res, next) => {
  try {
    const { email } = req.body;
    await authService.requestPasswordReset({ email });
    // Always returns 202 with the exact same message per Section 4
    res.status(202).json({
      data: {
        message: 'If an account exists for this email, a reset link is on its way.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset per Section 4
router.post('/auth/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPasswordWithToken({ token, password });
    res.json({
      data: {
        message: 'Password has been reset successfully. Please sign in.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password per Section 4
router.post('/auth/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changeUserPassword({
      userId: req.user._id,
      currentPassword,
      newPassword,
    });
    res.json({
      data: {
        message: 'Password changed successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
