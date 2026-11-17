// server/tests/09-actions.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { User, Membership, Action, ActionHistory, Blocker, Notification } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 9: Actions, History and Blockers', () => {
  let adminCookie;
  let participant1Cookie;
  let participant2Cookie;
  let user1;
  let user2;
  let workspaceId;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    const { hash, salt } = await hashPassword('ValidPass@2026');

    // Admin
    const wsRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({ adminName: 'Aarav Menon', email: 'aarav@fest.org', password: 'ValidPass@2026', workspaceName: 'Fest', timezone: 'UTC' });
    workspaceId = wsRes.body.data.workspace._id;

    // Participant 1: Dev Patil
    user1 = await User.create({ name: 'Dev Patil', email: 'dev@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId, userId: user1._id, role: 'participant', status: 'active' });

    // Participant 2: Kiran Rao
    user2 = await User.create({ name: 'Kiran Rao', email: 'kiran@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId, userId: user2._id, role: 'participant', status: 'active' });

    const l1 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    adminCookie = l1.headers['set-cookie'];

    const l2 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'dev@fest.org', password: 'ValidPass@2026' });
    participant1Cookie = l2.headers['set-cookie'];

    const l3 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'kiran@fest.org', password: 'ValidPass@2026' });
    participant2Cookie = l3.headers['set-cookie'];
  });

  it('calculates overdue and daysOverdue dynamically from dueDate and status', async () => {
    const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000); // 2 days ago

    const actRes = await request(app)
      .post('/api/actions')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Collect stage quotes',
        ownerId: user1._id.toString(),
        priority: 'high',
        dueDate: yesterday.toISOString(),
      });

    expect(actRes.status).toBe(201);

    const listRes = await request(app).get('/api/actions').set('Cookie', adminCookie);
    expect(listRes.status).toBe(200);
    const action = listRes.body.data.find((a) => a._id === actRes.body.data._id);
    expect(action.overdue).toBe(true);
    expect(action.daysOverdue).toBeGreaterThanOrEqual(1);
  });

  it('participant can update only their own action status, not another participant action', async () => {
    const actRes = await request(app)
      .post('/api/actions')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Dev Action',
        ownerId: user1._id.toString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });

    // Dev updates own action -> 200
    const devUpdate = await request(app)
      .post(`/api/actions/${actRes.body.data._id}/status`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', participant1Cookie)
      .send({ status: 'in_progress' });
    expect(devUpdate.status).toBe(200);

    // Kiran attempts to update Dev action -> 403
    const kiranUpdate = await request(app)
      .post(`/api/actions/${actRes.body.data._id}/status`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', participant2Cookie)
      .send({ status: 'completed' });
    expect(kiranUpdate.status).toBe(403);
  });

  it('reassign without reason is rejected, and blocker report, resolve and escalate work correctly', async () => {
    const actRes = await request(app)
      .post('/api/actions')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Confirm power outlets',
        ownerId: user1._id.toString(),
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      });

    // Reassign without reason fails
    const reassignNoReason = await request(app)
      .post(`/api/actions/${actRes.body.data._id}/reassign`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({ ownerId: user2._id.toString() });
    expect(reassignNoReason.status).toBe(400);

    // Reassign with reason succeeds
    const reassignRes = await request(app)
      .post(`/api/actions/${actRes.body.data._id}/reassign`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({ ownerId: user2._id.toString(), reason: 'Workload balancing for fest' });
    expect(reassignRes.status).toBe(200);

    // Report blocker without reason fails
    const blockerNoReason = await request(app)
      .post(`/api/actions/${actRes.body.data._id}/blockers`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', participant2Cookie)
      .send({ reason: '' });
    expect(blockerNoReason.status).toBe(400);

    // Report blocker with reason succeeds
    const blockerRes = await request(app)
      .post(`/api/actions/${actRes.body.data._id}/blockers`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', participant2Cookie)
      .send({ reason: 'Electronics lab approval pending' });
    expect(blockerRes.status).toBe(201);
    expect(blockerRes.body.data.status).toBe('open');

    // Escalate blocker
    const escRes = await request(app)
      .post(`/api/blockers/${blockerRes.body.data._id}/escalate`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie);
    expect(escRes.status).toBe(200);
    expect(escRes.body.data.status).toBe('escalated');

    // Resolve blocker
    const resRes = await request(app)
      .post(`/api/blockers/${blockerRes.body.data._id}/resolve`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie);
    expect(resRes.status).toBe(200);
    expect(resRes.body.data.status).toBe('resolved');

    // Action history lists all transitions
    const histRes = await request(app).get(`/api/actions/${actRes.body.data._id}/history`).set('Cookie', adminCookie);
    expect(histRes.status).toBe(200);
    expect(histRes.body.data.length).toBeGreaterThanOrEqual(4);
  });
});
