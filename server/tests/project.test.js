import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import WorkspaceMembership from '../src/models/WorkspaceMembership.js';
import Project from '../src/models/Project.js';
import ProjectMembership from '../src/models/ProjectMembership.js';
import Counter from '../src/models/Counter.js';

describe('Phase 3: Project Management & Project RBAC Suite', () => {
  let adminCookie = null;
  let devCookie = null;
  let outsiderCookie = null;

  let adminUser = null;
  let devUser = null;
  let outsiderUser = null;

  let workspaceId = null;
  let testProjectId = null;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await Project.deleteMany({});
    await ProjectMembership.deleteMany({});
    await Counter.deleteMany({});

    // 1. Create Workspace Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Project Admin Alex',
        email: 'alex.admin@example.com',
        password: 'AdminPassword123!'
      });
    adminCookie = adminRes.headers['set-cookie'];
    adminUser = adminRes.body.data.user;
    workspaceId = adminRes.body.data.defaultWorkspace.id;

    // 2. Create Developer (Member in workspace)
    const devRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Developer Dave',
        email: 'dave.dev@example.com',
        password: 'DevPassword123!'
      });
    devCookie = devRes.headers['set-cookie'];
    devUser = devRes.body.data.user;

    // Invite Dave to Alex's workspace as member
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: devUser.email, role: 'member' });

    // 3. Create Outsider (Unrelated user)
    const outsiderRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Outsider Oscar',
        email: 'oscar.outsider@example.com',
        password: 'OscarPassword123!'
      });
    outsiderCookie = outsiderRes.headers['set-cookie'];
    outsiderUser = outsiderRes.body.data.user;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await Project.deleteMany({});
    await ProjectMembership.deleteMany({});
    await Counter.deleteMany({});
    await disconnectDB();
  });

  it('POST /api/v1/projects - should allow Workspace Admin to create project with key FLOW', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', adminCookie)
      .send({
        workspaceId,
        name: 'DevFlow Core Engine',
        key: 'FLOW',
        description: 'Core platform microservices and real-time mesh',
        visibility: 'private'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.name).toBe('DevFlow Core Engine');
    expect(res.body.data.project.key).toBe('FLOW');
    expect(res.body.data.project.role).toBe('pm');

    testProjectId = res.body.data.project.id;

    // Verify atomic task key counter was initialized (DEC-005)
    const counter = await Counter.findOne({ name: `project_counter_${testProjectId}` });
    expect(counter).toBeDefined();
    expect(counter.seq).toBe(100);
  });

  it('POST /api/v1/projects - should reject duplicate project key in same workspace with 409', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', adminCookie)
      .send({
        workspaceId,
        name: 'Duplicate Flow Project',
        key: 'FLOW'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PROJECT_KEY_ALREADY_EXISTS');
  });

  it('POST /api/v1/projects - should reject invalid project key format with 400', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', adminCookie)
      .send({
        workspaceId,
        name: 'Invalid Key Project',
        key: 'f' // Too short and lowercase
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('POST /api/v1/projects - should reject creation by standard Workspace Member with 403', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', devCookie)
      .send({
        workspaceId,
        name: 'Unauthorized Project Attempt',
        key: 'UNAUTH'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_WORKSPACE_PERMISSIONS');
  });

  it('POST /api/v1/projects/:id/members - should add workspace member to project as developer', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${testProjectId}/members`)
      .set('Cookie', adminCookie)
      .send({
        userId: devUser.id,
        role: 'developer'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.member.email).toBe(devUser.email);
    expect(res.body.data.member.role).toBe('developer');
  });

  it('GET /api/v1/projects/:id/members - should list project members', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${testProjectId}/members`)
      .set('Cookie', devCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members.length).toBe(2); // Admin (PM) + Dave (Developer)
  });

  it('PATCH /api/v1/projects/:id - should allow Project Manager to update project details', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${testProjectId}`)
      .set('Cookie', adminCookie)
      .send({
        description: 'Updated enterprise agile engineering repository'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.description).toContain('Updated enterprise');
  });

  it('RBAC Guard: Developer cannot update project metadata (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${testProjectId}`)
      .set('Cookie', devCookie)
      .send({
        name: 'Hacked Project Name'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_PERMISSIONS');
  });

  it('BOLA Defense: Outsider cannot access private project details (403 Forbidden)', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${testProjectId}`)
      .set('Cookie', outsiderCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_WORKSPACE_ACCESS');
  });

  it('PATCH /api/v1/projects/:id/members/:userId - should update member role to viewer', async () => {
    const res = await request(app)
      .patch(`/api/v1/projects/${testProjectId}/members/${devUser.id}`)
      .set('Cookie', adminCookie)
      .send({
        role: 'viewer'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.member.role).toBe('viewer');
  });

  it('DELETE /api/v1/projects/:id/members/:userId - should remove member from project', async () => {
    const res = await request(app)
      .delete(`/api/v1/projects/${testProjectId}/members/${devUser.id}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify member count decreased to 1
    const membersRes = await request(app)
      .get(`/api/v1/projects/${testProjectId}/members`)
      .set('Cookie', adminCookie);
    expect(membersRes.body.data.members.length).toBe(1);
  });
});
