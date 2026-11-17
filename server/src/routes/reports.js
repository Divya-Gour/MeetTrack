// server/src/routes/reports.js
const express = require('express');
const router = express.Router();
const reportService = require('../services/report.service');
const exportService = require('../services/export.service');
const { requireAuth, requireRole } = require('../middleware/auth');

// Role check per Section 6.10: Admins & Coordinators allowed; Participants receive 403
router.use(requireAuth, requireRole('admin', 'coordinator'));

// GET /api/reports/summary per Section 6.10
router.get('/reports/summary', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const summary = await reportService.getSummaryReport({
      workspaceId: req.workspaceId,
      from,
      to,
    });
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/owners per Section 6.10
router.get('/reports/owners', async (req, res, next) => {
  try {
    const report = await reportService.getOwnerReport({ workspaceId: req.workspaceId });
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/status per Section 6.10
router.get('/reports/status', async (req, res, next) => {
  try {
    const report = await reportService.getStatusReport({ workspaceId: req.workspaceId });
    res.json({ data: report });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/actions.csv per Section 6.10
router.get('/reports/actions.csv', async (req, res, next) => {
  try {
    const csvContent = await exportService.exportActionsCsv(req.workspaceId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="actions-report.csv"');
    res.send(csvContent);
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/actions.pdf per Section 6.10
router.get('/reports/actions.pdf', async (req, res, next) => {
  try {
    const actions = await exportService.getActionsForExport(req.workspaceId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="actions-report.pdf"');

    const stream = exportService.exportActionsPdfStream(actions);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
