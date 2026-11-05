import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import WorkspaceMembership from '../src/models/WorkspaceMembership.js';

describe('Phase 2: Authentication & Account Management Suite', () => {
  beforeAll(async () => {
    await connectDB();
    // Clean test state
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await disconnectDB();
  });

  const testUser = {
    name: 'Alice Developer',
    email: 'alice.test@example.com',
    password: 'Password123!'
  };

  let authCookie = null;

  it('POST /api/v1/auth/register - should create user and auto-provision default workspace', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.defaultWorkspace).toBeDefined();
    expect(res.body.data.defaultWorkspace.role).toBe('admin');
    expect(res.body.data.token).toBeDefined();

    // Verify Set-Cookie header contains devflow_token with HttpOnly
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some(c => c.includes('devflow_token='))).toBe(true);
    expect(cookies.some(c => c.includes('HttpOnly'))).toBe(true);
  });

  it('POST /api/v1/auth/register - should reject duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('POST /api/v1/auth/login - should authenticate user and return workspaces', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.workspaces.length).toBeGreaterThanOrEqual(1);

    authCookie = res.headers['set-cookie'];
  });

  it('POST /api/v1/auth/login - should reject invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword999!'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me - should return profile when authenticated via cookie', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.workspaces.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/auth/me - should reject unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('PATCH /api/v1/auth/profile - should update user profile', async () => {
    const res = await request(app)
      .patch('/api/v1/auth/profile')
      .set('Cookie', authCookie)
      .send({
        name: 'Alice Senior Dev',
        githubUsername: 'alicedev'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.name).toBe('Alice Senior Dev');
    expect(res.body.data.user.githubUsername).toBe('alicedev');
  });

  it('POST /api/v1/auth/logout - should clear session cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookies = res.headers['set-cookie'];
    expect(cookies.some(c => c.includes('devflow_token=;') || c.includes('Expires='))).toBe(true);
  });
});
