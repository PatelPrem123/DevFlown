import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import WorkspaceMembership from '../src/models/WorkspaceMembership.js';
import Project from '../src/models/Project.js';
import ProjectMembership from '../src/models/ProjectMembership.js';
import Task from '../src/models/Task.js';
import Counter from '../src/models/Counter.js';

describe('Phase 4: Task Management Core Suite', () => {
  let adminCookie = null;
  let devCookie = null;
  let viewerCookie = null;

  let adminUser = null;
  let devUser = null;
  let viewerUser = null;

  let workspaceId = null;
  let projectId = null;
  let createdTaskId = null;
  let createdTaskKey = null;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await Project.deleteMany({});
    await ProjectMembership.deleteMany({});
    await Task.deleteMany({});
    await Counter.deleteMany({});

    // 1. Create Workspace Admin (PM)
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Task Admin Alice',
        email: 'alice.task@example.com',
        password: 'AdminPassword123!'
      });
    adminCookie = adminRes.headers['set-cookie'];
    adminUser = adminRes.body.data.user;
    workspaceId = adminRes.body.data.defaultWorkspace.id;

    // 2. Create Project
    const projectRes = await request(app)
      .post('/api/v1/projects')
      .set('Cookie', adminCookie)
      .send({
        workspaceId,
        name: 'Task Core Engine',
        key: 'FLOW',
        visibility: 'private'
      });
    projectId = projectRes.body.data.project.id;

    // 3. Create Developer (Bob)
    const devRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob Developer',
        email: 'bob.dev@example.com',
        password: 'DevPassword123!'
      });
    devCookie = devRes.headers['set-cookie'];
    devUser = devRes.body.data.user;

    // Add Bob to workspace & project as Developer
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: devUser.email, role: 'member' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: devUser.id, role: 'developer' });

    // 4. Create Viewer (Vera)
    const viewerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Vera Viewer',
        email: 'vera.viewer@example.com',
        password: 'ViewerPassword123!'
      });
    viewerCookie = viewerRes.headers['set-cookie'];
    viewerUser = viewerRes.body.data.user;

    // Add Vera to workspace & project as Viewer
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: viewerUser.email, role: 'member' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: viewerUser.id, role: 'viewer' });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await Project.deleteMany({});
    await ProjectMembership.deleteMany({});
    await Task.deleteMany({});
    await Counter.deleteMany({});
    await disconnectDB();
  });

  it('POST /api/v1/projects/:projectId/tasks - Developer should create task with key FLOW-101', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({
        title: 'Implement AES-256 Token Cipher',
        description: 'Encrypt all OAuth access tokens at rest using AES-256-GCM cipher hooks.',
        priority: 'high',
        storyPoints: 5,
        labels: ['security', 'backend']
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.task.taskKey).toBe('FLOW-101');
    expect(res.body.data.task.title).toBe('Implement AES-256 Token Cipher');
    expect(res.body.data.task.status).toBe('backlog');
    expect(res.body.data.task.orderIndex).toBe(1000.0);
    expect(res.body.data.task.storyPoints).toBe(5);

    createdTaskId = res.body.data.task._id;
    createdTaskKey = res.body.data.task.taskKey;
  });

  it('POST /api/v1/projects/:projectId/tasks - Second task should increment atomic key to FLOW-102', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({
        title: 'Configure Webhook Ingress Route',
        priority: 'urgent',
        storyPoints: 3
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.task.taskKey).toBe('FLOW-102');
    expect(res.body.data.task.orderIndex).toBe(2000.0); // 1000 + 1000 gap
  });

  it('POST /api/v1/projects/:projectId/tasks - should reject empty title with 400', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({
        title: ''
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('POST /api/v1/projects/:projectId/tasks - should reject assigning to non-project user with 400', async () => {
    const fakeId = '507f1f77bcf86cd799439011';
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({
        title: 'Task with invalid assignee',
        assigneeId: fakeId
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ASSIGNEE_NOT_IN_PROJECT');
  });

  it('GET /api/v1/projects/:projectId/tasks - should list tasks and support keyword search', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/tasks?search=AES-256`)
      .set('Cookie', devCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tasks.length).toBe(1);
    expect(res.body.data.tasks[0].taskKey).toBe('FLOW-101');
  });

  it('GET /api/v1/tasks/:id - should fetch task details by human-readable key (FLOW-101)', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${createdTaskKey}`)
      .set('Cookie', devCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.task._id.toString()).toBe(createdTaskId.toString());
    expect(res.body.data.task.title).toContain('AES-256 Token Cipher');
  });

  it('PATCH /api/v1/tasks/:id - should update task and sanitize markdown description', async () => {
    const dirtyDescription = '<p>Clean text</p><script>alert("xss")</script>';

    const res = await request(app)
      .patch(`/api/v1/tasks/${createdTaskId}`)
      .set('Cookie', devCookie)
      .send({
        description: dirtyDescription,
        priority: 'urgent',
        assigneeId: devUser.id
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.task.priority).toBe('urgent');
    expect(res.body.data.task.assigneeId._id.toString()).toBe(devUser.id.toString());
    // Confirm <script> tag was stripped by DOMPurify (DEC-011)
    expect(res.body.data.task.description).not.toContain('<script>');
    expect(res.body.data.task.description).toContain('<p>Clean text</p>');
  });

  it('RBAC Guard: Viewer cannot create tasks (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', viewerCookie)
      .send({
        title: 'Unauthorized Task by Viewer'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_PERMISSIONS');
  });

  it('RBAC Guard: Developer cannot delete tasks (403 Forbidden)', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${createdTaskId}`)
      .set('Cookie', devCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
  });

  it('DELETE /api/v1/tasks/:id - Project Manager should delete task successfully', async () => {
    const res = await request(app)
      .delete(`/api/v1/tasks/${createdTaskId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify task is gone
    const checkRes = await request(app)
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set('Cookie', adminCookie);
    expect(checkRes.status).toBe(404);
  });
});
