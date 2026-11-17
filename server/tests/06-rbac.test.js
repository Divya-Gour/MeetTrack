// server/tests/06-rbac.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { Workspace, Membership, User, Meeting, Minutes } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 6: Role-Based Access Control (RBAC)', () => {
  let adminCookie;
  let participantCookie;
  let coordinatorNoApproverCookie;
  let coordinatorApproverCookie;
  let workspace;
  let meeting;
  let minutes;

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
    const adminUser = await User.create({ name: 'Admin', email: 'admin@fest.org', passwordHash: hash, passwordSalt: salt });
    workspace = await Workspace.create({ name: 'Fest', timezone: 'UTC', createdBy: adminUser._id });
    const adminMem = await Membership.create({ workspaceId: workspace._id, userId: adminUser._id, role: 'admin', status: 'active' });

    // Participant
    const partUser = await User.create({ name: 'Participant', email: 'part@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId: workspace._id, userId: partUser._id, role: 'participant', status: 'active' });

    // Coordinator without approver
    const coordNoAppUser = await User.create({ name: 'Coord NoApp', email: 'coordno@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId: workspace._id, userId: coordNoAppUser._id, role: 'coordinator', approver: false, status: 'active' });

    // Coordinator with approver
    const coordAppUser = await User.create({ name: 'Coord App', email: 'coordapp@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId: workspace._id, userId: coordAppUser._id, role: 'coordinator', approver: true, status: 'active' });

    meeting = await Meeting.create({
      workspaceId: workspace._id,
      title: 'Governance Review',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600000),
      organiserId: adminUser._id,
      createdBy: adminUser._id,
    });

    minutes = await Minutes.create({
      workspaceId: workspace._id,
      meetingId: meeting._id,
      status: 'submitted',
      submittedBy: coordAppUser._id, // Submitted by Coordinator with Approver flag
    });

    // Login cookies
    const l1 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'admin@fest.org', password: 'ValidPass@2026' });
    adminCookie = l1.headers['set-cookie'];

    const l2 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'part@fest.org', password: 'ValidPass@2026' });
    participantCookie = l2.headers['set-cookie'];

    const l3 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'coordno@fest.org', password: 'ValidPass@2026' });
    coordinatorNoApproverCookie = l3.headers['set-cookie'];

    const l4 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'coordapp@fest.org', password: 'ValidPass@2026' });
    coordinatorApproverCookie = l4.headers['set-cookie'];
  });

  it('participant cannot create meetings, approve minutes or see audit events (403)', async () => {
    const mtgRes = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', participantCookie)
      .send({ title: 'Illegal Meeting', startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 3600000).toISOString() });
    expect(mtgRes.status).toBe(403);

    const appRes = await request(app)
      .post(`/api/minutes/${minutes._id}/approve`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', participantCookie);
    expect(appRes.status).toBe(403);

    const auditRes = await request(app).get('/api/audit').set('Cookie', participantCookie);
    expect(auditRes.status).toBe(403);
  });

  it('coordinator without approver flag cannot approve minutes (403)', async () => {
    const res = await request(app)
      .post(`/api/minutes/${minutes._id}/approve`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorNoApproverCookie);
    expect(res.status).toBe(403);
  });

  it('approver cannot approve their own submitted minutes (403)', async () => {
    const res = await request(app)
      .post(`/api/minutes/${minutes._id}/approve`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorApproverCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain('submitter cannot approve their own minutes');
  });

  it('admin cannot be removed or demoted when they are the last admin (400 LAST_ADMIN)', async () => {
    const adminMem = await Membership.findOne({ workspaceId: workspace._id, role: 'admin' });
    const deleteRes = await request(app)
      .delete(`/api/members/${adminMem._id}`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie);
    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error.code).toBe('LAST_ADMIN');
  });
});
