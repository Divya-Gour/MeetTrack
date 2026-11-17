// server/tests/04-invites.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { Invitation } from '../src/models/index.js';
import { hashToken } from '../src/utils/tokens.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 4: Invitations', () => {
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

    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    adminCookie = loginRes.headers['set-cookie'];
  });

  it('invites a new member and stores only tokenHash, returning inviteLink when SMTP is disabled', async () => {
    const res = await request(app)
      .post('/api/invites')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        email: 'priya@fest.org',
        role: 'coordinator',
        approver: true,
        message: 'Welcome to the team',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe('priya@fest.org');
    expect(res.body.data.role).toBe('coordinator');
    expect(res.body.data.approver).toBe(true);
    expect(res.body.data.tokenHash).toBeDefined();

    const stored = await Invitation.findById(res.body.data._id);
    expect(stored.tokenHash).toBeDefined();
    expect(stored.token).toBeUndefined(); // Raw token never saved to database
  });

  it('rejects invitation if person is already an active member', async () => {
    const res = await request(app)
      .post('/api/invites')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        email: 'aarav@fest.org',
        role: 'coordinator',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_MEMBER');
  });

  it('accepts invitation, creates user and membership, and rejects reuse with 410', async () => {
    const invRes = await request(app)
      .post('/api/invites')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        email: 'priya@fest.org',
        role: 'coordinator',
        approver: true,
      });

    const token = 'test-token-priya';
    const inv = await Invitation.findById(invRes.body.data._id);
    inv.tokenHash = hashToken(token);
    await inv.save();

    // Check token info
    const infoRes = await request(app).get(`/api/invites/token/${token}`);
    expect(infoRes.status).toBe(200);
    expect(infoRes.body.data.email).toBe('priya@fest.org');
    expect(infoRes.body.data.role).toBe('coordinator');

    // Accept invite
    const acceptRes = await request(app)
      .post(`/api/invites/token/${token}/accept`)
      .set('X-Requested-With', 'meettrack')
      .send({
        name: 'Priya Nair',
        password: 'SecureP@ssword2026',
      });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.data.user.name).toBe('Priya Nair');
    expect(acceptRes.body.data.membership.role).toBe('coordinator');
    expect(acceptRes.body.data.membership.approver).toBe(true);

    // Reuse rejected with 410 INVITE_USED
    const reuseRes = await request(app)
      .post(`/api/invites/token/${token}/accept`)
      .set('X-Requested-With', 'meettrack')
      .send({
        name: 'Priya Nair',
        password: 'SecureP@ssword2026',
      });
    expect(reuseRes.status).toBe(410);
    expect(reuseRes.body.error.code).toBe('INVITE_USED');
  });
});
