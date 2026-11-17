import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const setup = req('./setup.js');
const { app, initTestDb, clearTestDb, closeTestDb } = setup;
const config = req('../src/config');
const geminiModule = req('../src/services/gemini');
const { Action, RateLimit } = req('../src/models');

describe('Suite 13: Assistant and Gemini', () => {
  let adminCookie = null;
  let workspaceId = null;
  let adminUserId = null;

  beforeAll(async () => {
    await initTestDb();
    await clearTestDb();

    // 1. Setup workspace & admin
    const setupRes = await request(app)
      .post('/api/setup')
      .set('X-Requested-With', 'meettrack')
      .send({
        workspaceName: 'AI Testing Fest',
        adminName: 'Aarav AI',
        email: 'aiadmin@fest.org',
        password: 'SecurePassword@2026',
        timezone: 'Asia/Kolkata',
      });
    expect(setupRes.status).toBe(201);
    adminCookie = setupRes.headers['set-cookie'];
    workspaceId = setupRes.body.data.workspace._id;
    adminUserId = setupRes.body.data.user._id;
  });

  afterAll(async () => {
    await closeTestDb();
    vi.restoreAllMocks();
  });

  it('without GEMINI_API_KEY, endpoint returns 503 ASSISTANT_UNAVAILABLE', async () => {
    config.geminiApiKey = '';
    config.isAssistantEnabled = false;

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        messages: [{ role: 'user', content: 'What are my actions?' }],
      });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('ASSISTANT_UNAVAILABLE');
  });

  it('prompt includes workspace-scoped data only (mocked Gemini call)', async () => {
    config.geminiApiKey = 'mock-key';
    config.isAssistantEnabled = true;

    // Add action to workspace A
    await Action.create({
      workspaceId,
      title: 'Fix stage lighting for Fest A',
      ownerId: adminUserId,
      dueDate: new Date(),
      status: 'pending',
      createdBy: adminUserId,
    });

    let capturedInstruction = '';
    const spy = vi.spyOn(geminiModule, 'generateChatCompletion').mockImplementation(async ({ systemInstruction }) => {
      capturedInstruction = systemInstruction;
      return 'Here are your pending action items.';
    });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        messages: [{ role: 'user', content: 'What are my actions?' }],
        pageContext: 'Actions',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.reply).toBe('Here are your pending action items.');
    expect(capturedInstruction).toContain('Fix stage lighting for Fest A');

    spy.mockRestore();
  });

  it('malformed JSON in model response falls back gracefully without 500 error', async () => {
    config.geminiApiKey = 'mock-key';
    config.isAssistantEnabled = true;

    const malformedModelReply = `I found one task for you:
\`\`\`json
[ { "title": "Incomplete json", "status": 
\`\`\`
Please let me know if you want to add it.`;

    const spy = vi.spyOn(geminiModule, 'generateChatCompletion').mockImplementation(async () => {
      return malformedModelReply;
    });

    const res = await request(app)
      .post('/api/assistant/chat')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        messages: [{ role: 'user', content: 'Extract task' }],
      });

    expect(res.status).toBe(200);
    // Drafts fallback to empty array on malformed JSON
    expect(res.body.data.drafts).toEqual([]);
    expect(res.body.data.reply).toContain('I found one task for you:');

    spy.mockRestore();
  });

  it('rate limiter returns 429 ASSISTANT_LIMIT after exceeding 30 messages in 1 hour', async () => {
    config.geminiApiKey = 'mock-key';
    config.isAssistantEnabled = true;

    const spy = vi.spyOn(geminiModule, 'generateChatCompletion').mockImplementation(async () => {
      return 'Ok';
    });

    // Simulate 30 messages already consumed
    const key = `rl:assist:${adminUserId}`;
    await RateLimit.findOneAndUpdate(
      { key },
      { count: 30, windowStart: new Date(), expiresAt: new Date(Date.now() + 3600000) },
      { upsert: true }
    );

    // 31st request should be rejected
    const res = await request(app)
      .post('/api/assistant/chat')
      .set('X-Requested-With', 'meettrack')
      .set('Cookie', adminCookie)
      .send({
        messages: [{ role: 'user', content: 'Another question' }],
      });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('ASSISTANT_LIMIT');
    expect(res.body.error.retryAfterSeconds).toBeGreaterThan(0);

    spy.mockRestore();
  });
});
