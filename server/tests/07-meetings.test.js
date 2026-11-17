// server/tests/07-meetings.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { Notification } from '../src/models/index.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 7: Meetings, Recurring, and ICS', () => {
  let adminCookie;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        adminName: 'Aarav Menon',
        email: 'aarav@fest.org',
        password: 'ValidPass@2026',
        workspaceName: 'Engineering Fest 2026',
        timezone: 'Asia/Kolkata',
      });

    const l1 = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    adminCookie = l1.headers['set-cookie'];
  });

  it('rejects meeting creation if startsAt is not before endsAt', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Invalid Meeting Times',
        startsAt: '2026-11-20T14:00:00Z',
        endsAt: '2026-11-20T13:00:00Z', // before start
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('expands recurring weekly meeting occurrences inside the requested date range', async () => {
    await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Weekly Volunteer Coordination',
        startsAt: '2026-12-02T09:30:00Z',
        endsAt: '2026-12-02T10:30:00Z',
        recurrence: 'weekly',
      });

    // Request 3-week range
    const listRes = await request(app)
      .get('/api/meetings?from=2026-12-01T00:00:00Z&to=2026-12-25T00:00:00Z')
      .set('Cookie', adminCookie);

    expect(listRes.status).toBe(200);
    // 02 Dec, 09 Dec, 16 Dec, 23 Dec -> 4 occurrences
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(3);
    const weeklyOccurrences = listRes.body.data.filter((m) => m.title === 'Weekly Volunteer Coordination');
    expect(weeklyOccurrences.length).toBe(4);
  });

  it('ICS export contains valid CRLF endings, RFC 5545 headers and escaped text', async () => {
    const mtgRes = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Kickoff, Logistics; Prep',
        venue: 'Seminar Hall, B-2',
        startsAt: '2026-11-18T10:00:00Z',
        endsAt: '2026-11-18T11:30:00Z',
      });

    const icsRes = await request(app)
      .get(`/api/meetings/${mtgRes.body.data._id}/ics`)
      .set('Cookie', adminCookie);

    expect(icsRes.status).toBe(200);
    expect(icsRes.headers['content-type']).toContain('text/calendar');
    expect(icsRes.text).toContain('BEGIN:VCALENDAR\r\n');
    expect(icsRes.text).toContain('SUMMARY:Kickoff\\, Logistics\\; Prep\r\n');
    expect(icsRes.text).toContain('LOCATION:Seminar Hall\\, B-2\r\n');
    expect(icsRes.text).toContain('END:VCALENDAR\r\n');
  });

  it('cancelled meeting sets status cancelled and notifies attendees', async () => {
    const mtgRes = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Cancelled Fest Meeting',
        startsAt: '2026-11-20T10:00:00Z',
        endsAt: '2026-11-20T11:00:00Z',
      });

    const cancelRes = await request(app)
      .post(`/api/meetings/${mtgRes.body.data._id}/cancel`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');

    const notif = await Notification.findOne({ type: 'meeting_cancelled' });
    expect(notif).toBeDefined();
    expect(notif.title).toContain('Cancelled');
  });
});
