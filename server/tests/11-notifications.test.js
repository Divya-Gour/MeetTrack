import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;
import { User, Workspace, Meeting, Attendance, Notification } from '../src/models';
import { runMeetingReminders, retryFailedEmails } from '../src/jobs/scheduler';

describe('Suite 11: Notifications and Scheduler', () => {
  let adminCookie = null;
  let workspaceId = null;
  let adminUserId = null;

  beforeAll(async () => {
    await initTestDb();
    await clearTestDb();

    // 1. Setup workspace & admin
    const setupRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        workspaceName: 'Scheduler Test Fest',
        adminName: 'Aarav Scheduler',
        email: 'schedadmin@fest.org',
        password: 'SecurePassword@2026',
        timezone: 'Asia/Kolkata',
      });
    expect(setupRes.status).toBe(201);
    adminCookie = setupRes.headers['set-cookie'];
    workspaceId = setupRes.body.data.workspace._id;
    adminUserId = setupRes.body.data.user._id;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('creates meeting reminder once and does not duplicate on next scheduler tick', async () => {
    // Create a meeting starting in 10 hours
    const startsAt = new Date(Date.now() + 10 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

    const mtg = await Meeting.create({
      workspaceId,
      title: 'Upcoming Fest Review',
      startsAt,
      endsAt,
      type: 'review',
      status: 'scheduled',
      venue: 'Main Hall',
      organiserId: adminUserId,
      createdBy: adminUserId,
    });

    await Attendance.create({
      workspaceId,
      meetingId: mtg._id,
      userId: adminUserId,
      role: 'chair',
      status: 'present',
    });

    // Run first scheduler tick
    await runMeetingReminders();

    const notifs1 = await Notification.find({
      workspaceId,
      userId: adminUserId,
      type: 'meeting_reminder',
    });
    expect(notifs1.length).toBe(1);

    // Run second scheduler tick
    await runMeetingReminders();

    const notifs2 = await Notification.find({
      workspaceId,
      userId: adminUserId,
      type: 'meeting_reminder',
    });
    expect(notifs2.length).toBe(1); // Not duplicated
  });

  it('retries failed emails and stops retrying after max attempts (3)', async () => {
    const failedNotif = await Notification.create({
      workspaceId,
      userId: adminUserId,
      type: 'action_assigned',
      title: 'Action Item Retry Test',
      body: 'Testing email retry logic',
      emailStatus: 'failed',
      emailAttempts: 0,
    });

    // Run retry once
    await retryFailedEmails();
    const updated1 = await Notification.findById(failedNotif._id);
    expect(updated1.emailAttempts).toBe(1);

    // Set to max attempts (3)
    updated1.emailAttempts = 3;
    updated1.emailStatus = 'failed';
    await updated1.save();

    // Run retry again -> should not attempt since emailAttempts >= 3
    await retryFailedEmails();
    const updated2 = await Notification.findById(failedNotif._id);
    expect(updated2.emailAttempts).toBe(3);
  });

  it('POST /api/notifications/read-all marks all unread notifications as read', async () => {
    // Check we have unread notifications
    const unreadBefore = await request(app)
      .get('/api/notifications?unread=true')
      .set('Cookie', adminCookie);
    expect(unreadBefore.status).toBe(200);
    expect(unreadBefore.body.meta.total).toBeGreaterThan(0);

    // Mark all as read
    const readAllRes = await request(app)
      .post('/api/notifications/read-all')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie);
    expect(readAllRes.status).toBe(200);

    // Check unread count is now 0
    const unreadAfter = await request(app)
      .get('/api/notifications?unread=true')
      .set('Cookie', adminCookie);
    expect(unreadAfter.body.meta.total).toBe(0);
  });
});
