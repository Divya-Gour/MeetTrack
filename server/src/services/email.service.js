// server/src/services/email.service.js
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (config.isTest) {
    // Fake transport for Vitest/Supertest suites per Section 10
    transporter = {
      sendMail: async (options) => {
        return { messageId: `test-${Date.now()}`, accepted: [options.to], response: '250 Test OK' };
      },
    };
    return transporter;
  }

  if (config.isEmailEnabled && config.smtp.host) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  } else {
    // Disabled SMTP transport - logs as skipped per Section 2
    transporter = {
      sendMail: async (options) => {
        return { skipped: true, reason: 'SMTP not configured' };
      },
    };
  }

  return transporter;
}

// Plain text templates per Section 6.9
function buildInvitationEmail({ workspaceName, inviteLink, role, inviterName }) {
  return `Hello,

You have been invited by ${inviterName || 'an administrator'} to join the workspace "${workspaceName}" as a ${role} on MeetTrack.

To accept this invitation and set up your account, click the link below:
${inviteLink}

This invitation link is valid for 72 hours.

Best regards,
MeetTrack Governance Team`;
}

function buildPasswordResetEmail({ resetLink, userName }) {
  return `Hello ${userName || ''},

A password reset was requested for your MeetTrack account.
Click the link below to set a new password:
${resetLink}

This link is valid for 30 minutes and can only be used once. If you did not request this, you can safely ignore this email.

Best regards,
MeetTrack Governance Team`;
}

function buildMeetingUpdateEmail({ workspaceName, meetingTitle, startsAt, venue, action }) {
  return `Meeting ${action || 'Updated'}: ${meetingTitle}

Workspace: ${workspaceName}
Time: ${new Date(startsAt).toLocaleString()}
Venue/Link: ${venue || 'Online'}

Review details and quorum agenda in MeetTrack:
${config.appUrl}/meetings

Best regards,
MeetTrack Governance Team`;
}

function buildMinutesNotificationEmail({ workspaceName, meetingTitle, event, link }) {
  return `Minutes Update: ${meetingTitle}

Workspace: ${workspaceName}
Status: ${event}

View minutes document:
${link || config.appUrl}

Best regards,
MeetTrack Governance Team`;
}

function buildActionAssignedEmail({ workspaceName, actionTitle, dueDate, link }) {
  return `Action Item Assigned: ${actionTitle}

Workspace: ${workspaceName}
Due Date: ${new Date(dueDate).toLocaleDateString()}

Track and update status in MeetTrack:
${link || `${config.appUrl}/actions`}

Best regards,
MeetTrack Governance Team`;
}

function buildMeetingReminderEmail({ workspaceName, meetingTitle, startsAt, venue, link }) {
  return `Meeting Reminder: ${meetingTitle} starts in 24 hours

Workspace: ${workspaceName}
Time: ${new Date(startsAt).toLocaleString()}
Venue/Link: ${venue || 'Online'}

Agenda and quorum roll call:
${link || `${config.appUrl}/meetings`}

Best regards,
MeetTrack Governance Team`;
}

async function sendEmail({ to, subject, text }) {
  const trans = getTransporter();
  try {
    const info = await trans.sendMail({
      from: config.smtp.from,
      to,
      subject,
      text,
    });
    if (info && info.skipped) {
      return { status: 'skipped', details: info.reason };
    }
    return { status: 'sent', messageId: info.messageId };
  } catch (err) {
    console.warn(`[Email] Failed to send email to ${to}:`, err.message);
    return { status: 'failed', error: err.message };
  }
}

module.exports = {
  sendEmail,
  buildInvitationEmail,
  buildPasswordResetEmail,
  buildMeetingUpdateEmail,
  buildMinutesNotificationEmail,
  buildActionAssignedEmail,
  buildMeetingReminderEmail,
};
