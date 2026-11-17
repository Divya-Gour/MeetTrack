// server/src/utils/ics.js

function escapeIcsText(str = '') {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\n|\r/g, '\\n');
}

function formatIcsDate(date) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function generateSingleMeetingIcs(meeting) {
  const uid = meeting._id ? meeting._id.toString() : `mtg-${Date.now()}@meettrack.org`;
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(meeting.startsAt || new Date());
  const dtEnd = formatIcsDate(meeting.endsAt || new Date(Date.now() + 3600000));
  const summary = escapeIcsText(meeting.title || 'Meeting');
  const location = escapeIcsText(meeting.venue || meeting.onlineLink || '');
  const description = escapeIcsText(meeting.description || '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MeetTrack Governance//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    location ? `LOCATION:${location}` : null,
    description ? `DESCRIPTION:${description}` : null,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n') + '\r\n';
}

function generateMultipleMeetingsIcs(meetings = []) {
  const dtStamp = formatIcsDate(new Date());
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MeetTrack Governance//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const eventBlocks = [];
  for (const meeting of meetings) {
    const uid = meeting._id ? meeting._id.toString() : `mtg-${Date.now()}@meettrack.org`;
    const dtStart = formatIcsDate(meeting.startsAt || new Date());
    const dtEnd = formatIcsDate(meeting.endsAt || new Date(Date.now() + 3600000));
    const summary = escapeIcsText(meeting.title || 'Meeting');
    const location = escapeIcsText(meeting.venue || meeting.onlineLink || '');
    const description = escapeIcsText(meeting.description || '');

    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      location ? `LOCATION:${location}` : null,
      description ? `DESCRIPTION:${description}` : null,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].filter(Boolean);

    eventBlocks.push(lines.join('\r\n'));
  }

  const footer = ['END:VCALENDAR'];

  return [...header, ...eventBlocks, ...footer].join('\r\n') + '\r\n';
}

module.exports = {
  escapeIcsText,
  formatIcsDate,
  generateSingleMeetingIcs,
  generateMultipleMeetingsIcs,
};
