// server/src/routes/minutes.js
import express from 'express';
import crypto from 'crypto';
import Minutes from '../models/Minutes.js';
import Meeting from '../models/Meeting.js';
import { requireAuth, requireRole, requireWorkspace } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireWorkspace);

function computeHash(content) {
  const str = JSON.stringify(content);
  return crypto.createHash('sha256').update(str).digest('hex');
}

// GET /api/minutes/:id
router.get('/:id', async (req, res) => {
  try {
    const minutes = await Minutes.findOne({
      $or: [{ _id: req.params.id }, { meetingId: req.params.id }],
      workspaceId: req.workspaceId,
    });

    if (!minutes) {
      // If none exists, generate blank document with standard Stitch section headings
      return res.json({
        id: `draft-${Date.now()}`,
        meetingId: req.params.id,
        title: 'Draft Minutes',
        version: 1,
        status: 'draft',
        content: {
          attendanceSummary: '',
          discussionPoints: '',
          decisions: '',
          outcomes: '',
        },
      });
    }

    return res.json(minutes);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch minutes.' });
  }
});

// PUT /api/minutes/:id — Autosave draft
router.put('/:id', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const { content, title } = req.body;
    let minutes = await Minutes.findOne({ _id: req.params.id, workspaceId: req.workspaceId });

    if (minutes && minutes.status === 'published') {
      return res.status(403).json({ error: 'Published minutes are cryptographically locked and read-only.' });
    }

    const sha256Hash = computeHash(content);

    if (!minutes) {
      minutes = await Minutes.create({
        workspaceId: req.workspaceId,
        meetingId: req.params.id,
        title: title || 'Meeting Minutes',
        version: 1,
        status: 'draft',
        content,
        sha256Hash,
        submittedBy: req.user.name,
      });
    } else {
      minutes.content = content;
      minutes.version += 1;
      minutes.sha256Hash = sha256Hash;
      minutes.updatedAt = new Date();
      minutes.versions.push({
        version: minutes.version,
        content,
        modifiedBy: req.user.name,
        timestamp: new Date(),
        sha256Hash,
      });
      await minutes.save();
    }

    return res.json(minutes);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save minutes.' });
  }
});

// POST /api/minutes/:id/submit
router.post('/:id/submit', requireRole('Admin', 'Coordinator'), async (req, res) => {
  try {
    const minutes = await Minutes.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!minutes) return res.status(404).json({ error: 'Minutes record not found.' });

    minutes.status = 'submitted';
    minutes.submittedBy = req.user.name;
    minutes.submittedAt = new Date();
    await minutes.save();

    return res.json(minutes);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit minutes.' });
  }
});

// POST /api/minutes/:id/approve
router.post('/:id/approve', async (req, res) => {
  try {
    if (!req.membership.isApprover && req.membership.role !== 'Admin') {
      return res.status(403).json({ error: 'Only designated minutes approvers or admins can approve.' });
    }

    const { notes } = req.body;
    const minutes = await Minutes.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!minutes) return res.status(404).json({ error: 'Minutes record not found.' });

    minutes.status = 'approved';
    minutes.approvedBy = req.user.name;
    minutes.approvedAt = new Date();
    minutes.reviewNotes = notes || '';
    await minutes.save();

    return res.json(minutes);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to approve minutes.' });
  }
});

// POST /api/minutes/:id/return
router.post('/:id/return', async (req, res) => {
  try {
    if (!req.membership.isApprover && req.membership.role !== 'Admin') {
      return res.status(403).json({ error: 'Only designated minutes approvers or admins can return minutes.' });
    }

    const { comment } = req.body;
    const minutes = await Minutes.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!minutes) return res.status(404).json({ error: 'Minutes record not found.' });

    minutes.status = 'returned';
    minutes.returnedBy = req.user.name;
    minutes.returnedAt = new Date();
    minutes.reviewNotes = comment || 'Returned for revision.';
    await minutes.save();

    return res.json(minutes);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to return minutes.' });
  }
});

// POST /api/minutes/:id/publish
router.post('/:id/publish', async (req, res) => {
  try {
    if (!req.membership.isApprover && req.membership.role !== 'Admin') {
      return res.status(403).json({ error: 'Only authorized approvers or admins can publish and seal minutes.' });
    }

    const minutes = await Minutes.findOne({ _id: req.params.id, workspaceId: req.workspaceId });
    if (!minutes) return res.status(404).json({ error: 'Minutes record not found.' });

    minutes.status = 'published';
    minutes.publishedBy = req.user.name;
    minutes.publishedAt = new Date();
    minutes.sha256Hash = computeHash(minutes.content);
    await minutes.save();

    return res.json(minutes);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to publish minutes.' });
  }
});

export default router;

