// server/src/utils/csv.js

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function generateActionsCsv(actions = []) {
  const headers = ['Action Title', 'Owner', 'Priority', 'Due Date', 'Status', 'Days Overdue'];
  const rows = [headers.map(escapeCsvField).join(',')];

  for (const act of actions) {
    const ownerName = act.owner?.name || act.ownerName || 'Unassigned';
    const dueDateStr = act.dueDate ? new Date(act.dueDate).toISOString().split('T')[0] : '';
    const daysOverdue = act.daysOverdue !== undefined ? act.daysOverdue : 0;

    const row = [
      escapeCsvField(act.title || ''),
      escapeCsvField(ownerName),
      escapeCsvField(act.priority || 'medium'),
      escapeCsvField(dueDateStr),
      escapeCsvField(act.status || 'pending'),
      escapeCsvField(daysOverdue),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\r\n') + '\r\n';
}

module.exports = {
  escapeCsvField,
  generateActionsCsv,
};
