// server/tests/01-setup.test.js
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import setup from './setup.js';
const { app, initTestDb, clearTestDb, closeTestDb } = setup;

describe('Suite 1: Setup', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();
  });

  it('GET /api/setup/status returns setupComplete: false when database is empty', async () => {
    const res = await request(app).get('/api/setup/status');
    expect(res.status).toBe(200);
    expect(res.body.setupComplete).toBe(false);
  });

  it('rejects weak password with WEAK_PASSWORD code and failing rules', async () => {
    const res = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        adminName: 'Aarav Menon',
        email: 'aarav@fest.org',
        password: 'weak',
        workspaceName: 'Engineering Fest 2026',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('WEAK_PASSWORD');
    expect(res.body.error.fields).toBeDefined();
    expect(res.body.error.fields.password).toContain('at least 8 characters');
  });

  it('creates the first admin, workspace and membership successfully', async () => {
    const res = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        adminName: 'Aarav Menon',
        email: 'aarav@fest.org',
        password: 'StrongPass@2026',
        workspaceName: 'Engineering Fest 2026',
        timezone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.name).toBe('Aarav Menon');
    expect(res.body.data.user.email).toBe('aarav@fest.org');
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Never returned
    expect(res.body.data.workspace.name).toBe('Engineering Fest 2026');
    expect(res.body.data.membership.role).toBe('admin');
    expect(res.body.data.membership.approver).toBe(true);

    // Setup status should now be complete
    const statusRes = await request(app).get('/api/setup/status');
    expect(statusRes.body.setupComplete).toBe(true);
  });

  it('returns 409 SETUP_ALREADY_DONE on second setup attempt', async () => {
    // First setup
    await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        adminName: 'Aarav Menon',
        email: 'aarav@fest.org',
        password: 'StrongPass@2026',
        workspaceName: 'Engineering Fest 2026',
        timezone: 'Asia/Kolkata',
      });

    // Second setup
    const secondRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        adminName: 'Intruder',
        email: 'intruder@fest.org',
        password: 'AnotherPass@2026',
        workspaceName: 'Hacked Workspace',
        timezone: 'UTC',
      });

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.error.code).toBe('SETUP_ALREADY_DONE');
  });
});
