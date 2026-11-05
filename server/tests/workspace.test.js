import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import WorkspaceMembership from '../src/models/WorkspaceMembership.js';

describe('Phase 2: Workspace Management & Two-Tier RBAC Suite', () => {
  let adminCookie = null;
  let memberCookie = null;
  let strangerCookie = null;

  let adminUser = null;
  let memberUser = null;
  let strangerUser = null;

  let testWorkspaceId = null;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});

    // 1. Create Admin User
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Workspace Admin',
        email: 'admin.ws@example.com',
        password: 'AdminPassword123!'
      });
    adminCookie = adminRes.headers['set-cookie'];
    adminUser = adminRes.body.data.user;

    // 2. Create Member User
    const memberRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Team Member Bob',
        email: 'bob.member@example.com',
        password: 'BobPassword123!'
      });
    memberCookie = memberRes.headers['set-cookie'];
    memberUser = memberRes.body.data.user;

    // 3. Create Stranger User (Not part of target workspace)
    const strangerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Stranger Eve',
        email: 'eve.stranger@example.com',
        password: 'EvePassword123!'
      });
    strangerCookie = strangerRes.headers['set-cookie'];
    strangerUser = strangerRes.body.data.user;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await disconnectDB();
  });

  it('POST /api/v1/workspaces - should create a new workspace with caller as Admin', async () => {
    const res = await request(app)
      .post('/api/v1/workspaces')
      .set('Cookie', adminCookie)
      .send({
        name: 'Alpha Engineering Hub',
        description: 'Primary engineering team workspace'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workspace.name).toBe('Alpha Engineering Hub');
    expect(res.body.data.workspace.role).toBe('admin');
    expect(res.body.data.workspace.isOwner).toBe(true);

    testWorkspaceId = res.body.data.workspace.id;
  });

  it('GET /api/v1/workspaces - should list all workspaces accessible to user', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workspaces.some(w => w.id === testWorkspaceId)).toBe(true);
  });

  it('POST /api/v1/workspaces/:id/invitations - should allow Admin to add member to workspace', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${testWorkspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({
        email: memberUser.email,
        role: 'member'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.member.email).toBe(memberUser.email);
    expect(res.body.data.member.role).toBe('member');
  });

  it('GET /api/v1/workspaces/:id - should allow invited Member to view workspace details', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${testWorkspaceId}`)
      .set('Cookie', memberCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workspace.role).toBe('member');
    expect(res.body.data.workspace.isOwner).toBe(false);
  });

  it('GET /api/v1/workspaces/:id/members - should list workspace members', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${testWorkspaceId}/members`)
      .set('Cookie', memberCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members.length).toBe(2);
  });

  it('BOLA Defense: Stranger should receive 403 Forbidden accessing unjoined workspace', async () => {
    const res = await request(app)
      .get(`/api/v1/workspaces/${testWorkspaceId}`)
      .set('Cookie', strangerCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_WORKSPACE_ACCESS');
  });

  it('RBAC Guard: Standard Member should receive 403 when attempting to invite users', async () => {
    const res = await request(app)
      .post(`/api/v1/workspaces/${testWorkspaceId}/invitations`)
      .set('Cookie', memberCookie)
      .send({
        email: 'another.person@example.com',
        role: 'guest'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('DELETE /api/v1/workspaces/:id/members/:userId - should reject removing workspace owner', async () => {
    const res = await request(app)
      .delete(`/api/v1/workspaces/${testWorkspaceId}/members/${adminUser.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CANNOT_REMOVE_OWNER');
  });
});
