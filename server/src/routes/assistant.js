// server/src/routes/assistant.js
const express = require('express');
const router = express.Router();
const assistantService = require('../services/assistant.service');
const { User, Membership } = require('../models');

async function optionalAuth(req, res, next) {
  try {
    const userId = req.session ? req.session.userId : null;
    const sessionWorkspaceId = req.session ? req.session.workspaceId : null;
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        let membershipQuery = { userId: user._id };
        if (sessionWorkspaceId) membershipQuery.workspaceId = sessionWorkspaceId;
        const membership = await Membership.findOne(membershipQuery).populate('workspaceId');
        if (membership && membership.status !== 'suspended') {
          req.user = user;
          req.membership = membership;
          req.workspace = membership.workspaceId;
          req.workspaceId = membership.workspaceId?._id || membership.workspaceId;
        }
      }
    }
  } catch (_) {}
  next();
}

// POST /api/assistant/chat per Section 6.13
router.post('/assistant/chat', optionalAuth, async (req, res, next) => {
  try {
    const { messages, pageContext, isDemo } = req.body;
    const result = await assistantService.handleAssistantChat({
      workspaceId: req.workspaceId || null,
      userId: req.user ? req.user._id : null,
      userRole: req.membership ? req.membership.role : 'Coordinator (Demo)',
      messages: messages || [],
      pageContext: pageContext || '',
      isDemo: Boolean(isDemo || !req.workspaceId),
      clientIp: req.ip,
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
