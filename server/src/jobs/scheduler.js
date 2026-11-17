// server/src/jobs/scheduler.js
const { Meeting, Action, Blocker, Notification, Attendance, Membership } = require('../models');
const { sendEmail, buildMeetingReminderEmail } = require('../services/email.service');
const config = require('../config');

let intervalId = null;

async function runMeetingReminders() {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find meetings starting in next 24 hours where reminder hasn't been sent yet
  const meetings = await Meeting.find({
    status: 'scheduled',
    startsAt: { $gte: now, $lte: in24Hours },
    reminderSentAt: null,
  }).populate('workspaceId', 'name');

  for (const mtg of meetings) {
    const attendees = await Attendance.find({ meetingId: mtg._id }).populate('userId', 'name email');

    for (const att of attendees) {
      if (att.userId) {
        // Create in-app reminder notification
        await Notification.create({
          workspaceId: mtg.workspaceId._id,
          userId: att.userId._id,
          type: 'meeting_reminder',
          title: `Reminder: ${mtg.title}`,
          body: `Meeting starts at ${new Date(mtg.startsAt).toLocaleString()}`,
          link: `/meetings/${mtg._id}`,
        });

        // Send email reminder
        if (config.isEmailEnabled && att.userId.email) {
          const emailText = buildMeetingReminderEmail({
            workspaceName: mtg.workspaceId.name,
            meetingTitle: mtg.title,
            startsAt: mtg.startsAt,
            venue: mtg.venue || mtg.onlineLink,
            link: `${config.appUrl}/meetings/${mtg._id}`,
          });
          await sendEmail({
            to: att.userId.email,
            subject: `Meeting Reminder: ${mtg.title}`,
            text: emailText,
          });
        }
      }
    }

    mtg.reminderSentAt = now;
    await mtg.save();
  }
}

async function runOverdueActionChecks() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const overdueActions = await Action.find({
    status: { $ne: 'completed' },
    dueDate: { $lt: now },
  });

  for (const act of overdueActions) {
    // Check if overdue notification already sent in the last 24 hours
    const recentNotif = await Notification.findOne({
      workspaceId: act.workspaceId,
      userId: act.ownerId,
      type: 'action_overdue',
      link: `/actions`,
      createdAt: { $gte: oneDayAgo },
    });

    if (!recentNotif) {
      await Notification.create({
        workspaceId: act.workspaceId,
        userId: act.ownerId,
        type: 'action_overdue',
        title: 'Action Item Overdue',
        body: `Action item "${act.title}" is overdue. Please update its status or request a date extension.`,
        link: `/actions`,
      });
    }
  }
}

async function runOpenBlockerAlerts() {
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const staleBlockers = await Blocker.find({
    status: 'open',
    createdAt: { $lte: twoDaysAgo },
  }).populate('actionId', 'title');

  for (const b of staleBlockers) {
    const coordinators = await Membership.find({
      workspaceId: b.workspaceId,
      status: 'active',
      $or: [{ role: 'coordinator' }, { role: 'admin' }],
    });

    for (const c of coordinators) {
      const alreadyAlerted = await Notification.findOne({
        workspaceId: b.workspaceId,
        userId: c.userId,
        type: 'blocker_open',
        link: `/actions`,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });

      if (!alreadyAlerted) {
        await Notification.create({
          workspaceId: b.workspaceId,
          userId: c.userId,
          type: 'blocker_open',
          title: 'Unresolved Blocker Alert',
          body: `Blocker on "${b.actionId?.title || 'Action'}" has remained open for over 48 hours.`,
          link: `/actions`,
        });
      }
    }
  }
}

async function retryFailedEmails() {
  const failedNotifs = await Notification.find({
    emailStatus: 'failed',
    emailAttempts: { $lt: 3 },
  }).populate('userId', 'email');

  for (const notif of failedNotifs) {
    if (notif.userId && notif.userId.email) {
      notif.emailAttempts = (notif.emailAttempts || 0) + 1;
      const res = await sendEmail({
        to: notif.userId.email,
        subject: notif.title,
        text: notif.body,
      });
      notif.emailStatus = res.status;
      await notif.save();
    }
  }
}

async function runAllSchedulerJobs() {
  try {
    await runMeetingReminders();
    await runOverdueActionChecks();
    await runOpenBlockerAlerts();
    await retryFailedEmails();
  } catch (err) {
    console.warn('[Scheduler Error]:', err.message);
  }
}

function startScheduler() {
  if (config.isTest) return; // Do not start in test environment per Section 8
  if (intervalId) return;

  // Run every 15 minutes per Section 6.8
  intervalId = setInterval(runAllSchedulerJobs, 15 * 60 * 1000);
  console.log('[Scheduler] Background cron worker active (15m interval)');
}

function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  runMeetingReminders,
  runOverdueActionChecks,
  runOpenBlockerAlerts,
  retryFailedEmails,
  runAllSchedulerJobs,
};
