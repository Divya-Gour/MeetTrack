import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const setup = req('./setup.js');
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 14: Security Headers and CSRF', () => {
  beforeAll(async () => {
    await initTestDb();
    await clearTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it('rejects mutating POST request without X-Requested-With: meettrack with 403 CSRF_HEADER_MISSING', async () => {
    const res = await request(app)
      .post('/api/setup')
      // Note: deliberately omitting X-Requested-With
      .send({
        adminName: 'Attacker',
        email: 'attacker@evil.org',
        password: 'Pass@12345678',
        workspaceName: 'Hacked',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CSRF_HEADER_MISSING');
  });

  it('allows safe GET requests without X-Requested-With header', async () => {
    const res = await request(app).get('/api/setup/status');
    expect(res.status).toBe(200);
    expect(res.body.setupComplete).toBe(false);
  });

  it('all responses include strict security headers', async () => {
    const res = await request(app).get('/api/setup/status');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['content-security-policy']).toBe("default-src 'none'");
  });

  it('session cookie is set with HttpOnly, SameSite=Lax and proper name', async () => {
    const res = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        adminName: 'Aarav Menon',
        email: 'aarav@fest.org',
        password: 'SecurePassword@2026',
        workspaceName: 'Engineering Fest 2026',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(201);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();

    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
    expect(cookieStr).toContain('mt.sid=');
    expect(cookieStr.toLowerCase()).toContain('httponly');
    expect(cookieStr.toLowerCase()).toContain('samesite=lax');
  });
});
