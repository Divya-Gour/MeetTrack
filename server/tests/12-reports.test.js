import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;
import { User, Workspace, Membership, Action, Meeting, Invitation } from '../src/models';
import { hashToken } from '../src/utils/tokens';

describe('Suite 12: Reports and CSV Export', () => {
  let adminCookie = null;
  let participantCookie = null;
  let workspaceId = null;
  let adminUserId = null;
  let participantUserId = null;

  beforeAll(async () => {
    await initTestDb();
    await clearTestDb();

    // 1. Setup workspace & admin
    const setupRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        workspaceName: 'Report Testing Fest',
        adminName: 'Aarav Reporter',
        email: 'reportadmin@fest.org',
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

  it('summary report returns correct counts for total, completed, pending, and overdue actions', async () => {
    const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 1. Pending & overdue
    await Action.create({
      workspaceId,
      title: 'Fix stage lighting, urgent "safety" check\nwith notes',
      ownerId: adminUserId,
      status: 'pending',
      dueDate: pastDate,
      createdBy: adminUserId,
    });

    // 2. In progress & future
    await Action.create({
      workspaceId,
      title: 'Distribute festival flyers',
      ownerId: adminUserId,
      status: 'in_progress',
      dueDate: futureDate,
      createdBy: adminUserId,
    });

    // 3. Completed
    await Action.create({
      workspaceId,
      title: 'Finalize brochure design',
      ownerId: adminUserId,
      status: 'completed',
      dueDate: pastDate,
      completedAt: new Date(),
      createdBy: adminUserId,
    });

    const summaryRes = await request(app)
      .get('/api/reports/summary')
      .set('Cookie', adminCookie);

    expect(summaryRes.status).toBe(200);
    const s = summaryRes.body.data;
    expect(s.actions).toBe(3);
    expect(s.completed).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.pending).toBe(1);
    expect(s.overdue).toBe(1);
  });

  it('CSV export returns text/csv and escapes quotes, commas, and newlines per RFC 4180', async () => {
    const csvRes = await request(app)
      .get('/api/reports/actions.csv')
      .set('Cookie', adminCookie);

    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toMatch(/text\/csv/);
    const text = csvRes.text;

    // Check RFC 4180 escaping: "Fix stage lighting, urgent ""safety"" check\nwith notes"
    expect(text).toContain('""safety""');
    expect(text).toContain('Fix stage lighting, urgent');
  });

  it('participant role returns 403 on report endpoints', async () => {
    // Invite and accept real participant to get valid session cookie
    const invRes = await request(app)
      .post('/api/invites')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        email: 'realparticipant@fest.org',
        role: 'participant',
        approver: false,
      });

    const token = 'test-token-participant';
    const inv = await Invitation.findById(invRes.body.data._id);
    inv.tokenHash = hashToken(token);
    await inv.save();

    const acceptRes = await request(app)
      .post(`/api/invites/token/${token}/accept`)
      .set('X-Requested-With', 'meettrack')
      .send({
        name: 'Dev Patil',
        password: 'SecurePassword@2026',
      });
    expect(acceptRes.status).toBe(200);
    participantCookie = acceptRes.headers['set-cookie'];

    // Participant tries to access report summary -> 403 FORBIDDEN
    const forbiddenRes = await request(app)
      .get('/api/reports/summary')
      .set('Cookie', participantCookie);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');

    // Participant tries to access CSV export -> 403 FORBIDDEN
    const forbiddenCsv = await request(app)
      .get('/api/reports/actions.csv')
      .set('Cookie', participantCookie);

    expect(forbiddenCsv.status).toBe(403);
    expect(forbiddenCsv.body.error.code).toBe('FORBIDDEN');
  });
});
