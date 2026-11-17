// server/tests/02-login.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 2: Login and Sessions', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
    // Create initial admin
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
  });

  it('correct login returns user, workspace and sets mt.sid session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({
        email: 'aarav@fest.org',
        password: 'ValidPass@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('aarav@fest.org');
    expect(res.body.data.workspace.name).toBe('Engineering Fest 2026');

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('mt.sid='))).toBe(true);
  });

  it('wrong email and wrong password return the exact same 401 INVALID_CREDENTIALS message', async () => {
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({
        email: 'aarav@fest.org',
        password: 'WrongPassword@123',
      });
    expect(wrongPassRes.status).toBe(401);
    expect(wrongPassRes.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongPassRes.body.error.message).toBe('The email or password is incorrect.');

    const wrongEmailRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({
        email: 'nobody@fest.org',
        password: 'ValidPass@2026',
      });
    expect(wrongEmailRes.status).toBe(401);
    expect(wrongEmailRes.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(wrongEmailRes.body.error.message).toBe('The email or password is incorrect.');
  });

  it('locks account after 5 failed login attempts and returns 423 ACCOUNT_LOCKED', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('X-Requested-With', 'meettrack')
        .send({ email: 'aarav@fest.org', password: 'WrongPassword@123' });
      expect(res.status).toBe(401);
    }

    // 5th attempt triggers lockout
    const fifthRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'WrongPassword@123' });
    expect(fifthRes.status).toBe(423);
    expect(fifthRes.body.error.code).toBe('ACCOUNT_LOCKED');

    // 6th attempt with right password is still locked
    const lockedRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    expect(lockedRes.status).toBe(423);
    expect(lockedRes.body.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('logout destroys session and GET /api/auth/me returns 401', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });

    const cookie = loginRes.headers['set-cookie'];

    const meRes = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('aarav@fest.org');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', cookie);
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(meAfterLogout.status).toBe(401);
  });
});
