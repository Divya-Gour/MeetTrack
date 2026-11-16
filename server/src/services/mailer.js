// server/src/services/mailer.js
import nodemailer from 'nodemailer';

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendInvitationEmail({ toEmail, workspaceName, inviterName, role, token }) {
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const joinUrl = `${appUrl}/join/${token}`;

  if (!transporter) {
    console.log(`[MAILER] SMTP not configured. Invite link generated for ${toEmail}: ${joinUrl}`);
    return { sent: false, joinUrl, reason: 'NO_SMTP' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || 'MeetTrack Governance <noreply@meettrack.org>',
    to: toEmail,
    subject: `Invitation to join ${workspaceName} on MeetTrack`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #DDE2DC; border-radius: 12px; background: #FFFFFF; color: #171B18;">
        <div style="margin-bottom: 20px;">
          <span style="font-weight: 800; font-size: 20px; color: #171B18;">meettrack<span style="color: #4d6700;">.</span></span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #171B18;">
          You've been invited to join ${workspaceName}
        </h2>
        <p style="font-size: 14px; line-height: 1.6; color: #626B63;">
          <strong>${inviterName}</strong> has invited you to collaborate on <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
        </p>
        <div style="margin: 28px 0;">
          <a href="${joinUrl}" style="background: #B6E34A; color: #171B18; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; display: inline-block;">
            Join Workspace →
          </a>
        </div>
        <p style="font-size: 12px; color: #8F9990; line-height: 1.5; border-top: 1px solid #ECEFEB; padding-top: 16px;">
          This secure cryptographic invitation link is valid for <strong>72 hours</strong>. If you were not expecting this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { sent: true, joinUrl };
  } catch (err) {
    console.error('[MAILER] Error dispatching SMTP message:', err);
    return { sent: false, joinUrl, error: err.message };
  }
}

