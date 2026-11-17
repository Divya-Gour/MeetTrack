// server/tests/05-isolation.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { Workspace, Membership, User, Meeting, Action, Decision } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 5: Tenant Isolation', () => {
  let userACookie;
  let workspaceB;
  let meetingB;
  let actionB;
  let decisionB;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // Setup Workspace A with User A
    const { hash, salt } = await hashPassword('ValidPass@2026');
    const userA = await User.create({
      name: 'User A',
      email: 'usera@workspacea.org',
      passwordHash: hash,
      passwordSalt: salt,
    });
    const workspaceA = await Workspace.create({
      name: 'Workspace A',
      timezone: 'UTC',
      createdBy: userA._id,
    });
    await Membership.create({
      workspaceId: workspaceA._id,
      userId: userA._id,
      role: 'admin',
      status: 'active',
    });

    // Setup Workspace B with User B and B's records
    const userB = await User.create({
      name: 'User B',
      email: 'userb@workspaceb.org',
      passwordHash: hash,
      passwordSalt: salt,
    });
    workspaceB = await Workspace.create({
      name: 'Workspace B',
      timezone: 'UTC',
      createdBy: userB._id,
    });
    await Membership.create({
      workspaceId: workspaceB._id,
      userId: userB._id,
      role: 'admin',
      status: 'active',
    });

    meetingB = await Meeting.create({
      workspaceId: workspaceB._id,
      title: 'Secret Meeting B',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 3600000),
      organiserId: userB._id,
      createdBy: userB._id,
    });

    actionB = await Action.create({
      workspaceId: workspaceB._id,
      title: 'Secret Action B',
      ownerId: userB._id,
      dueDate: new Date(Date.now() + 86400000),
      createdBy: userB._id,
    });

    decisionB = await Decision.create({
      workspaceId: workspaceB._id,
      title: 'Secret Decision B',
      rationale: 'Confidential Rationale B',
      createdBy: userB._id,
    });

    // Sign in as User A
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'usera@workspacea.org', password: 'ValidPass@2026' });
    userACookie = loginRes.headers['set-cookie'];
  });

  it('User in workspace A receives 404 when attempting to access meeting, action or decision in workspace B', async () => {
    // Attempt to access meeting B
    const mtgRes = await request(app)
      .get(`/api/meetings/${meetingB._id}`)
      .set('Cookie', userACookie);
    expect(mtgRes.status).toBe(404);

    // Attempt to edit action B
    const actRes = await request(app)
      .patch(`/api/actions/${actionB._id}`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', userACookie)
      .send({ title: 'Hijacked Action' });
    expect(actRes.status).toBe(404);

    // Attempt to delete decision B
    const decRes = await request(app)
      .delete(`/api/decisions/${decisionB._id}`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', userACookie);
    expect(decRes.status).toBe(404);
  });

  it('workspaceId in request body is ignored and records are assigned to authenticated workspace', async () => {
    const res = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', userACookie)
      .send({
        workspaceId: workspaceB._id.toString(), // Attempt to forge workspaceId
        title: 'Meeting in Workspace A',
        startsAt: new Date().toISOString(),
        endsAt: new Date(Date.now() + 3600000).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.workspaceId).not.toBe(workspaceB._id.toString());
  });
});
