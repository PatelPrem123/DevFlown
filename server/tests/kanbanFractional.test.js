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
import {
  calculateFractionalOrder,
  isPrecisionExhausted,
  rebalanceColumnOrders
} from '../src/services/kanbanService.js';

describe('Phase 5: Kanban Board Mechanics & Fractional Indexing Suite (DEC-003)', () => {
  let adminCookie = null;
  let devCookie = null;
  let viewerCookie = null;

  let adminUser = null;
  let devUser = null;
  let viewerUser = null;

  let workspaceId = null;
  let projectId = null;

  let task1Id = null;
  let task2Id = null;
  let task3Id = null;

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
        name: 'Kanban Lead Karen',
        email: 'karen.kanban@example.com',
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
        name: 'Kanban Test Workspace',
        key: 'BOARD',
        visibility: 'private'
      });
    projectId = projectRes.body.data.project.id;

    // 3. Create Developer (Dan)
    const devRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dan Developer',
        email: 'dan.kanban@example.com',
        password: 'DevPassword123!'
      });
    devCookie = devRes.headers['set-cookie'];
    devUser = devRes.body.data.user;

    // Add Dan to workspace and project as Developer
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: devUser.email, role: 'member' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: devUser.id, role: 'developer' });

    // 4. Create Viewer (Val)
    const viewerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Val Viewer',
        email: 'val.viewer@example.com',
        password: 'ViewerPassword123!'
      });
    viewerCookie = viewerRes.headers['set-cookie'];
    viewerUser = viewerRes.body.data.user;

    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: viewerUser.email, role: 'member' });

    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: viewerUser.id, role: 'viewer' });

    // Seed 3 initial tasks in Backlog
    const t1 = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({ title: 'Card 1', status: 'backlog', storyPoints: 2 });
    task1Id = t1.body.data.task._id;

    const t2 = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({ title: 'Card 2', status: 'backlog', storyPoints: 3 });
    task2Id = t2.body.data.task._id;

    const t3 = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', devCookie)
      .send({ title: 'Card 3', status: 'backlog', storyPoints: 5 });
    task3Id = t3.body.data.task._id;
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

  // --- 1. Pure Mathematical Logic Tests ---
  it('calculateFractionalOrder - should calculate exact midpoint between two cards', () => {
    expect(calculateFractionalOrder(1000.0, 2000.0)).toBe(1500.0);
    expect(calculateFractionalOrder(1500.0, 2000.0)).toBe(1750.0);
  });

  it('calculateFractionalOrder - should compute top and bottom extreme drop positions', () => {
    // Drop at top of column
    expect(calculateFractionalOrder(null, 3000.0)).toBe(2000.0);
    expect(calculateFractionalOrder(null, 1000.0)).toBe(500.0);

    // Drop at bottom of column
    expect(calculateFractionalOrder(3000.0, null)).toBe(4000.0);

    // Drop into empty column
    expect(calculateFractionalOrder(null, null)).toBe(1000.0);
  });

  it('isPrecisionExhausted - should detect floating-point collapse when delta < 0.000001', () => {
    expect(isPrecisionExhausted(1000.0000001, 1000.0000002)).toBe(true);
    expect(isPrecisionExhausted(1000.0, 1001.0)).toBe(false);
  });

  // --- 2. Precision Rebalancing Guard Tests ---
  it('rebalanceColumnOrders - should re-space collapsed orders to 1000, 2000, 3000...', async () => {
    // Manually set orders to near-identical values
    await Task.findByIdAndUpdate(task1Id, { orderIndex: 1000.000001 });
    await Task.findByIdAndUpdate(task2Id, { orderIndex: 1000.000002 });
    await Task.findByIdAndUpdate(task3Id, { orderIndex: 1000.000003 });

    const count = await rebalanceColumnOrders(projectId, 'backlog');
    expect(count).toBe(3);

    const rebalancedTasks = await Task.find({ projectId, status: 'backlog' }).sort({ orderIndex: 1 });
    expect(rebalancedTasks[0].orderIndex).toBe(1000.0);
    expect(rebalancedTasks[1].orderIndex).toBe(2000.0);
    expect(rebalancedTasks[2].orderIndex).toBe(3000.0);
  });

  // --- 3. Kanban API Integration Tests ---
  it('GET /api/v1/projects/:id/board - should return all 5 discrete columns grouped with metrics', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/board`)
      .set('Cookie', devCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.columns.length).toBe(5);

    const backlogCol = res.body.data.columns.find((c) => c.id === 'backlog');
    expect(backlogCol).toBeDefined();
    expect(backlogCol.count).toBe(3);
    expect(backlogCol.totalPoints).toBe(10); // 2 + 3 + 5
    expect(backlogCol.tasks.length).toBe(3);
  });

  it('PATCH /api/v1/tasks/:id/move - Developer moves card between columns with O(1) single-document write', async () => {
    // Move Card 2 from Backlog to In Progress (as first card in empty column)
    const res = await request(app)
      .patch(`/api/v1/tasks/${task2Id}/move`)
      .set('Cookie', devCookie)
      .send({
        columnId: 'in_progress',
        prevOrderIndex: null,
        nextOrderIndex: null
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.newStatus).toBe('in_progress');
    expect(res.body.data.orderIndex).toBe(1000.0);

    // Verify Card 1 and Card 3 in MongoDB were NOT modified (O(1) persistence check)
    const c1 = await Task.findById(task1Id);
    const c3 = await Task.findById(task3Id);
    expect(c1.status).toBe('backlog');
    expect(c1.orderIndex).toBe(1000.0);
    expect(c3.status).toBe('backlog');
    expect(c3.orderIndex).toBe(3000.0);
  });

  it('PATCH /api/v1/tasks/:id/move - Developer drops card between two cards computing midpoint', async () => {
    // Move Card 3 between Card 1 (1000.0) and a virtual next position (e.g. 2000.0)
    const res = await request(app)
      .patch(`/api/v1/tasks/${task3Id}/move`)
      .set('Cookie', devCookie)
      .send({
        columnId: 'backlog',
        prevOrderIndex: 1000.0,
        nextOrderIndex: 2000.0
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.orderIndex).toBe(1500.0);
  });

  it('RBAC Guard: Viewer cannot move cards on the board (403 Forbidden)', async () => {
    const res = await request(app)
      .patch(`/api/v1/tasks/${task1Id}/move`)
      .set('Cookie', viewerCookie)
      .send({
        columnId: 'done',
        prevOrderIndex: null,
        nextOrderIndex: null
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_PERMISSIONS');
  });
});
