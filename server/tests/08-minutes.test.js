// server/tests/08-minutes.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { User, Membership } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 8: Minutes Workflow, Versions and PDF', () => {
  let adminCookie;
  let approverCookie;
  let coordinatorCookie;
  let meetingId;
  let minutesId;

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
    const wsRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({ adminName: 'Aarav Menon', email: 'aarav@fest.org', password: 'ValidPass@2026', workspaceName: 'Fest', timezone: 'UTC' });
    const workspaceId = wsRes.body.data.workspace._id;

    // Approver (Priya Nair, coordinator with approver: true)
    const appUser = await User.create({ name: 'Priya Nair', email: 'priya@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId, userId: appUser._id, role: 'coordinator', approver: true, status: 'active' });

    // Submitter Coordinator (Rahul Shetty, coordinator with approver: false)
    const coordUser = await User.create({ name: 'Rahul Shetty', email: 'rahul@fest.org', passwordHash: hash, passwordSalt: salt });
    await Membership.create({ workspaceId, userId: coordUser._id, role: 'coordinator', approver: false, status: 'active' });

    // Login cookies
    const l1 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    adminCookie = l1.headers['set-cookie'];

    const l2 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'priya@fest.org', password: 'ValidPass@2026' });
    approverCookie = l2.headers['set-cookie'];

    const l3 = await request(app).post('/api/auth/login').set('X-Requested-With', 'meettrack').send({ email: 'rahul@fest.org', password: 'ValidPass@2026' });
    coordinatorCookie = l3.headers['set-cookie'];

    // Create meeting
    const mtgRes = await request(app)
      .post('/api/meetings')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorCookie)
      .send({
        title: 'Technical Events & Judging Rubric',
        startsAt: '2026-11-26T15:00:00Z',
        endsAt: '2026-11-26T16:00:00Z',
      });
    meetingId = mtgRes.body.data._id;

    // Load minutes draft
    const minRes = await request(app)
      .get(`/api/meetings/${meetingId}/minutes`)
      .set('Cookie', coordinatorCookie);
    minutesId = minRes.body.data._id;
  });

  it('autosave creates sequential versions, and If-Match conflict returns 409', async () => {
    // Version 1 exists. Save update with If-Match: 1
    const saveRes = await request(app)
      .put(`/api/minutes/${minutesId}/draft`)
      .set('X-Requested-With', 'meettrack')
      .set('If-Match', '1')
      .set('Cookie', coordinatorCookie)
      .send({ body: '## Discussion Points\n1. 100-point rubric decided.' });

    expect(saveRes.status).toBe(200);
    expect(saveRes.body.data.version).toBe(2);

    // Save with stale If-Match: 1 returns 409 VERSION_CONFLICT
    const conflictRes = await request(app)
      .put(`/api/minutes/${minutesId}/draft`)
      .set('X-Requested-With', 'meettrack')
      .set('If-Match', '1')
      .set('Cookie', coordinatorCookie)
      .send({ body: 'Conflicting update attempt' });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('progresses through submit, return with comment, resubmit, approve, publish in order', async () => {
    // 1. Save draft with body
    await request(app)
      .put(`/api/minutes/${minutesId}/draft`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorCookie)
      .send({ body: 'Preliminary rubric details' });

    // 2. Submit
    const submitRes = await request(app)
      .post(`/api/minutes/${minutesId}/submit`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorCookie);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('submitted');

    // 3. Return without comment is rejected
    const emptyReturnRes = await request(app)
      .post(`/api/minutes/${minutesId}/return`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', approverCookie)
      .send({ comment: '' });
    expect(emptyReturnRes.status).toBe(400);

    // 4. Return with comment succeeds
    const returnRes = await request(app)
      .post(`/api/minutes/${minutesId}/return`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', approverCookie)
      .send({ comment: 'Add the scoring weights for the robotics round.' });
    expect(returnRes.status).toBe(200);
    expect(returnRes.body.data.status).toBe('returned');
    expect(returnRes.body.data.returnComment).toContain('Add the scoring weights');

    // 5. Revise and resubmit
    await request(app)
      .put(`/api/minutes/${minutesId}/draft`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorCookie)
      .send({ body: 'Revised rubric: 40 Innovation, 30 Implementation, 20 Presentation, 10 Impact.' });

    await request(app)
      .post(`/api/minutes/${minutesId}/submit`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorCookie);

    // 6. Approve by Approver
    const approveRes = await request(app)
      .post(`/api/minutes/${minutesId}/approve`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', approverCookie);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('approved');

    // 7. Publish
    const pubRes = await request(app)
      .post(`/api/minutes/${minutesId}/publish`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', approverCookie);
    expect(pubRes.status).toBe(200);
    expect(pubRes.body.data.status).toBe('published');

    // 8. Published minutes cannot be edited
    const editBlockedRes = await request(app)
      .put(`/api/minutes/${minutesId}/draft`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', coordinatorCookie)
      .send({ body: 'Should not allow editing published' });
    expect(editBlockedRes.status).toBe(400);
  });

  it('generates PDF stream with application/pdf header', async () => {
    // Put content and publish
    await request(app)
      .put(`/api/minutes/${minutesId}/draft`)
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({ body: 'Official Ratified Minutes Content for PDF' });

    const pdfRes = await request(app)
      .get(`/api/minutes/${minutesId}/pdf`)
      .set('Cookie', adminCookie);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    expect(pdfRes.headers['content-disposition']).toContain('minutes-');
  });
});
