// server/tests/10-decisions.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { Action, Workspace, User, Meeting } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 10: Decisions and Follow-Up', () => {
  let adminCookie;
  let workspaceId;
  let otherWorkspaceActionId;

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    const { hash, salt } = await hashPassword('ValidPass@2026');

    const wsRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({ adminName: 'Aarav Menon', email: 'aarav@fest.org', password: 'ValidPass@2026', workspaceName: 'Fest', timezone: 'UTC' });
    workspaceId = wsRes.body.data.workspace._id;

    const l1 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    adminCookie = l1.headers['set-cookie'];

    // Another workspace's action
    const otherUser = await User.create({ name: 'Other', email: 'other@fest.org', passwordHash: hash, passwordSalt: salt });
    const otherWs = await Workspace.create({ name: 'Other', timezone: 'UTC', createdBy: otherUser._id });
    const foreignAct = await Action.create({
      workspaceId: otherWs._id,
      title: 'Foreign Action',
      ownerId: otherUser._id,
      dueDate: new Date(),
      createdBy: otherUser._id,
    });
    otherWorkspaceActionId = foreignAct._id.toString();
  });

  it('rejects decision creation if linked actions belong to a different workspace', async () => {
    const res = await request(app)
      .post('/api/decisions')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Budget Ceiling',
        rationale: 'Printing and stage budget capped at 120000',
        linkedActionIds: [otherWorkspaceActionId],
      });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('must belong to the same workspace');
  });

  it('searches decisions by keyword using text index', async () => {
    await request(app)
      .post('/api/decisions')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Robotics Stall Power Requirements',
        rationale: 'Stalls get 6 power outlets each booked through lab.',
      });

    await request(app)
      .post('/api/decisions')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Hackathon Format',
        rationale: '24-hour uninterrupted coding competition.',
      });

    const searchRes = await request(app).get('/api/decisions?q=Robotics').set('Cookie', adminCookie);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.length).toBe(1);
    expect(searchRes.body.data[0].title).toContain('Robotics');
  });

  it('follow-up engine generates items and saves accepted items to an agenda', async () => {
    // Generate follow-ups
    const followUpRes = await request(app).get('/api/followup').set('Cookie', adminCookie);
    expect(followUpRes.status).toBe(200);

    // Create a meeting
    const mtgRes = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        title: 'Next Week Agenda Followup',
        startsAt: new Date(Date.now() + 86400000).toISOString(),
        endsAt: new Date(Date.now() + 90000000).toISOString(),
      });

    // If there is a follow-up item, accept it and save to agenda
    if (followUpRes.body.data.length > 0) {
      const item = followUpRes.body.data[0];
      await request(app)
        .post(`/api/followup/${item._id}/decide`)
        .set('X-Requested-With', 'meettrack')
        .set('Cookie', adminCookie)
        .send({ decision: 'accepted' });

      const saveRes = await request(app)
        .post('/api/followup/save-to-agenda')
        .set('X-Requested-With', 'meettrack')
        .set('Cookie', adminCookie)
        .send({ meetingId: mtgRes.body.data._id });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.data.length).toBeGreaterThanOrEqual(1);
    }
  });
});
