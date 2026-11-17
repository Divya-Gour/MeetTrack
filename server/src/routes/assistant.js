// server/src/routes/assistant.js
const express = require('express');
const router = express.Router();
const assistantService = require('../services/assistant.service');
const { requireAuth } = require('../middleware/auth');

// POST /api/assistant/chat per Section 6.13
router.post('/assistant/chat', requireAuth, async (req, res, next) => {
  try {
    const { messages, pageContext } = req.body;
    const result = await assistantService.handleAssistantChat({
      workspaceId: req.workspaceId,
      userId: req.user._id,
      userRole: req.membership.role,
      messages: messages || [],
      pageContext: pageContext || '',
    });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
