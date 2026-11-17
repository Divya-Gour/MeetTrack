// server/src/services/export.service.js
const { Action } = require('../models');
const { generateActionsCsv } = require('../utils/csv');
const PDFDocument = require('pdfkit');

async function getActionsForExport(workspaceId) {
  const now = new Date();
  const rawActions = await Action.find({ workspaceId, status: { $ne: 'completed' } })
    .sort({ dueDate: 1 })
    .populate('ownerId', 'name email');

  return rawActions.map((act) => {
    const plain = act.toObject();
    const isOverdue = act.status !== 'completed' && new Date(act.dueDate) < now;
    const diffMs = now.getTime() - new Date(act.dueDate).getTime();
    const daysOverdue = isOverdue ? Math.max(1, Math.floor(diffMs / (24 * 60 * 60 * 1000))) : 0;

    plain.ownerName = act.ownerId ? act.ownerId.name : 'Unassigned';
    plain.daysOverdue = daysOverdue;
    return plain;
  });
}

async function exportActionsCsv(workspaceId) {
  const actions = await getActionsForExport(workspaceId);
  return generateActionsCsv(actions);
}

function exportActionsPdfStream(actions = []) {
  const doc = new PDFDocument({ margin: 40 });

  doc.fontSize(18).text('MEETTRACK OUTSTANDING ACTIONS REPORT', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(10);
  const startX = 40;
  let startY = doc.y;

  // Header row
  doc.font('Helvetica-Bold');
  doc.text('Action Title', startX, startY, { width: 180 });
  doc.text('Owner', startX + 185, startY, { width: 100 });
  doc.text('Priority', startX + 290, startY, { width: 60 });
  doc.text('Due Date', startX + 355, startY, { width: 80 });
  doc.text('Status', startX + 440, startY, { width: 70 });
  doc.font('Helvetica');

  doc.moveDown(0.5);
  doc.moveTo(startX, doc.y).lineTo(startX + 520, doc.y).stroke();
  doc.moveDown(0.5);

  for (const act of actions) {
    if (doc.y > 700) {
      doc.addPage();
    }
    const y = doc.y;
    doc.text(act.title || '', startX, y, { width: 180 });
    doc.text(act.ownerName || 'Unassigned', startX + 185, y, { width: 100 });
    doc.text(act.priority || 'medium', startX + 290, y, { width: 60 });
    doc.text(act.dueDate ? new Date(act.dueDate).toLocaleDateString() : '', startX + 355, y, { width: 80 });
    doc.text(act.status || 'pending', startX + 440, y, { width: 70 });
    doc.moveDown(0.5);
  }

  doc.end();
  return doc;
}

module.exports = {
  getActionsForExport,
  exportActionsCsv,
  exportActionsPdfStream,
};
