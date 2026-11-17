import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const setup = req('./setup.js');
const { app, initTestDb, clearTestDb, closeTestDb } = setup;
const { AuditEvent, Invitation } = req('../src/models');
const { hashToken } = req('../src/utils/tokens');

describe('Suite 15: Audit Log and Immutability', () => {
  let adminCookie = null;
  let participantCookie = null;
  let workspaceId = null;
  let adminUserId = null;

  beforeAll(async () => {
    await initTestDb();
    await clearTestDb();

    // 1. Setup workspace & admin -> generates workspace_created audit event
    const setupRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        workspaceName: 'Audit Fest 2026',
        adminName: 'Aarav Auditor',
        email: 'auditor@fest.org',
        password: 'SecurePassword@2026',
        timezone: 'Asia/Kolkata',
      });
    expect(setupRes.status).toBe(201);
    adminCookie = setupRes.headers['set-cookie'];
    workspaceId = setupRes.body.data.workspace._id;
    adminUserId = setupRes.body.data.user._id;

    // 2. Invite and accept a participant user -> generates invite_sent & invite_accepted audit events
    const invRes = await request(app)
      .post('/api/invites')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        email: 'auditparticipant@fest.org',
        role: 'participant',
        approver: false,
      });

    const token = 'test-audit-token';
    const inv = await Invitation.findById(invRes.body.data._id);
    inv.tokenHash = hashToken(token);
    await inv.save();

    const acceptRes = await request(app)
      .post(`/api/invites/token/${token}/accept`)
      .set('X-Requested-With', 'meettrack')
      .send({
        name: 'Audit Participant',
        password: 'SecurePassword@2026',
      });
    expect(acceptRes.status).toBe(200);
    participantCookie = acceptRes.headers['set-cookie'];
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('generates AuditEvent records with correct actorId, targetId, and workspaceId', async () => {
    const events = await AuditEvent.find({ workspaceId }).sort({ createdAt: 1 });
    expect(events.length).toBeGreaterThanOrEqual(2);

    const wsEvent = events.find((e) => e.event === 'workspace_created');
    expect(wsEvent).toBeDefined();
    expect(wsEvent.actorId.toString()).toBe(adminUserId);
    expect(wsEvent.targetType).toBe('Workspace');
    expect(wsEvent.targetId.toString()).toBe(workspaceId);

    const inviteEvent = events.find((e) => e.event === 'invite_sent');
    expect(inviteEvent).toBeDefined();
    expect(inviteEvent.actorId.toString()).toBe(adminUserId);
    expect(inviteEvent.targetType).toBe('Invitation');
  });

  it('audit log is queryable by admin with pagination', async () => {
    const res = await request(app)
      .get('/api/audit?page=1&pageSize=10')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    expect(res.body.data[0].actorId).toBeDefined();
    expect(res.body.data[0].actorId.name).toBeDefined();
  });

  it('audit log returns 403 FORBIDDEN for participant role', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Cookie', participantCookie);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('audit collection is append-only with no update or delete routes', async () => {
    // Attempting to POST to audit returns 404
    const postRes = await request(app)
      .post('/api/audit')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({ event: 'fake' });
    expect(postRes.status).toBe(404);

    // Attempting to PUT to audit returns 404
    const putRes = await request(app)
      .put('/api/audit/12345')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({ event: 'fake' });
    expect(putRes.status).toBe(404);

    // Attempting to DELETE from audit returns 404
    const delRes = await request(app)
      .delete('/api/audit/12345')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie);
    expect(delRes.status).toBe(404);
  });
});
