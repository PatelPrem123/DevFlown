import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Phase 1: Architecture & API Health Check Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('GET /api/v1/health - should return 200 and healthy status metadata', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.service).toBe('DevFlow API Gateway');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.status).toBe('healthy');
    expect(typeof res.body.data.uptimeSeconds).toBe('number');
    expect(res.body.data.database).toBeDefined();
    expect(res.body.data.database.readyState).toBe(1);
  });

  it('GET /api/v1/unmatched-endpoint - should return 404 with structured error', async () => {
    const res = await request(app).get('/api/v1/unmatched-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.error.message).toContain('does not exist');
  });

  it('POST with malformed JSON body - should return 400 with INVALID_JSON_BODY', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{ "malformedJson": ');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_JSON_BODY');
  });
});
