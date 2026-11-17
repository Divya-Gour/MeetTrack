// server/tests/03-reset.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
import { PasswordReset } from '../src/models/index.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 3: Password Reset', () => {
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
  });

  it('forgot password returns exact same 202 for known and unknown emails', async () => {
    const knownRes = await request(app)
      .post('/api/auth/forgot')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org' });
    expect(knownRes.status).toBe(202);
    expect(knownRes.body.data.message).toBe('If an account exists for this email, a reset link is on its way.');

    const unknownRes = await request(app)
      .post('/api/auth/forgot')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'nobody@fest.org' });
    expect(unknownRes.status).toBe(202);
    expect(unknownRes.body.data.message).toBe('If an account exists for this email, a reset link is on its way.');
  });

  it('reset token works once, rejects reused token, and allows login with new password', async () => {
    await request(app)
      .post('/api/auth/forgot')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org' });

    // Directly read token record to test reset endpoint
    const record = await PasswordReset.findOne({}).sort({ createdAt: -1 });
    expect(record).toBeDefined();

    // Reset with token
    const token = 'fake-test-token-direct';
    const { hashToken } = await import('../src/utils/tokens.js');
    record.tokenHash = hashToken(token);
    await record.save();

    const resetRes = await request(app)
      .post('/api/auth/reset')
      .set('X-Requested-With', 'meettrack')
      .send({
        token,
        password: 'NewStrongPass@2026',
      });
    expect(resetRes.status).toBe(200);

    // Second use of same token fails
    const reuseRes = await request(app)
      .post('/api/auth/reset')
      .set('X-Requested-With', 'meettrack')
      .send({
        token,
        password: 'AnotherPass@2026',
      });
    expect(reuseRes.status).toBe(410);

    // Old password fails, new password succeeds
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'ValidPass@2026' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login')
      .set('X-Requested-With', 'meettrack')
      .send({ email: 'aarav@fest.org', password: 'NewStrongPass@2026' });
    expect(newLogin.status).toBe(200);
  });
});
