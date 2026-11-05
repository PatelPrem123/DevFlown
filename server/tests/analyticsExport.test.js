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
import Sprint from '../src/models/Sprint.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 10: Analytics, Telemetry & Export Engine Suite (DEC-010)', () => {
  let testAdmin, testDev, unauthUser;
  let adminToken, devToken, unauthToken;
  let testWorkspace, testProject, testSprint;

  beforeAll(async () => {
    await connectDB();

    // Clean test records
    await User.deleteMany({ email: { $regex: /@analytics-test\.com$/ } });
    await Workspace.deleteMany({ name: 'Analytics Test Workspace' });

    // Seed Admin
    testAdmin = await User.create({
      name: 'Analytics Admin Anna',
      email: 'anna@analytics-test.com',
      password: 'Password123!',
      role: 'user'
    });
    adminToken = generateToken(testAdmin);

    // Seed Developer
    testDev = await User.create({
      name: 'Analytics Dev David',
      email: 'david@analytics-test.com',
      password: 'Password123!',
      role: 'user'
    });
    devToken = generateToken(testDev);

    // Seed Unauthorized User
    unauthUser = await User.create({
      name: 'Analytics Stranger Steve',
      email: 'steve@analytics-test.com',
      password: 'Password123!',
      role: 'user'
    });
    unauthToken = generateToken(unauthUser);

    // Seed Workspace & Memberships
    testWorkspace = await Workspace.create({
      name: 'Analytics Test Workspace',
      slug: `analytics-ws-${Date.now()}`,
      ownerId: testAdmin._id
    });

    await WorkspaceMembership.create([
      { workspaceId: testWorkspace._id, userId: testAdmin._id, role: 'admin' },
      { workspaceId: testWorkspace._id, userId: testDev._id, role: 'member' }
    ]);

    // Seed Project
    testProject = await Project.create({
      name: 'Telemetry Platform',
      key: `TLM${Math.floor(Math.random() * 899 + 100)}`,
      workspaceId: testWorkspace._id,
      ownerId: testAdmin._id
    });

    await ProjectMembership.create({
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      userId: testDev._id,
      role: 'developer'
    });

    // Seed Sprint for Burndown testing
    testSprint = await Sprint.create({
      name: 'Sprint 1 - Metrics Engine',
      goal: 'Build telemetry pipelines',
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      status: 'active',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started 7 days ago
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Ends in 7 days
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      totalStoryPoints: 20
    });

    // Seed Tasks with diverse states, story points, and assignees
    await Task.create([
      {
        taskKey: `${testProject.key}-1`,
        title: 'Recharts Burndown Integration',
        projectId: testProject._id,
        workspaceId: testWorkspace._id,
        reporterId: testAdmin._id,
        assigneeId: testDev._id,
        sprintId: testSprint._id,
        status: 'done',
        priority: 'high',
        storyPoints: 8,
        labels: ['frontend', 'charts']
      },
      {
        taskKey: `${testProject.key}-2`,
        title: 'Velocity Aggregator Pipeline',
        projectId: testProject._id,
        workspaceId: testWorkspace._id,
        reporterId: testAdmin._id,
        assigneeId: testDev._id,
        sprintId: testSprint._id,
        status: 'in_progress',
        priority: 'urgent',
        storyPoints: 5,
        labels: ['backend', 'analytics']
      },
      {
        taskKey: `${testProject.key}-3`,
        title: 'CSV Stream Transformer',
        projectId: testProject._id,
        workspaceId: testWorkspace._id,
        reporterId: testAdmin._id,
        assigneeId: testAdmin._id,
        sprintId: testSprint._id,
        status: 'to_do',
        priority: 'medium',
        storyPoints: 4,
        labels: ['export', 'csv']
      },
      {
        taskKey: `${testProject.key}-4`,
        title: 'Unassigned Backlog Item',
        projectId: testProject._id,
        workspaceId: testWorkspace._id,
        reporterId: testAdmin._id,
        assigneeId: null,
        sprintId: null,
        status: 'backlog',
        priority: 'low',
        storyPoints: 3,
        labels: ['backlog']
      }
    ]);
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@analytics-test\.com$/ } });
    await Workspace.deleteMany({ _id: testWorkspace._id });
    await WorkspaceMembership.deleteMany({ workspaceId: testWorkspace._id });
    await Project.deleteMany({ _id: testProject._id });
    await ProjectMembership.deleteMany({ projectId: testProject._id });
    await Task.deleteMany({ projectId: testProject._id });
    await Sprint.deleteMany({ projectId: testProject._id });

    await disconnectDB();
  });

  // 1. Mathematical Sprint Burndown Trajectory Tests (DEC-010)
  describe('Mathematical Sprint Burndown Engine (DEC-010)', () => {
    it('should generate accurate day-by-day ideal and actual burndown curves', async () => {
      const res = await request(app)
        .get(`/api/v1/sprints/${testSprint._id}/burndown`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { sprint, burnData } = res.body.data;
      expect(sprint.totalStoryPoints).toBe(20);
      expect(burnData).toBeDefined();
      expect(burnData.length).toBeGreaterThan(1);

      // Verify Ideal line starts at totalStoryPoints and reaches 0 at end
      expect(burnData[0].ideal).toBe(20);
      const lastPoint = burnData[burnData.length - 1];
      expect(lastPoint.ideal).toBe(0);

      // Verify Ideal points decrease strictly monotonically
      for (let i = 1; i < burnData.length; i++) {
        expect(burnData[i].ideal).toBeLessThanOrEqual(burnData[i - 1].ideal);
      }
    });

    it('should return 404 for non-existent sprint burndown query', async () => {
      const fakeId = '673fa123456789abcdef0123';
      const res = await request(app)
        .get(`/api/v1/sprints/${fakeId}/burndown`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SPRINT_NOT_FOUND');
    });
  });

  // 2. Project Velocity Telemetry Across Completed Sprints
  describe('Project Velocity Analytics', () => {
    it('should calculate historical velocity across completed sprints', async () => {
      // Seed 2 completed sprints
      await Sprint.create([
        {
          name: 'Sprint Past 1',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          status: 'completed',
          totalStoryPoints: 25,
          completedStoryPoints: 20,
          completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'Sprint Past 2',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          status: 'completed',
          totalStoryPoints: 30,
          completedStoryPoints: 28,
          completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        }
      ]);

      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/analytics/velocity`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { averageVelocity, totalCompletedSprints, velocityHistory } = res.body.data;
      expect(totalCompletedSprints).toBe(2);
      expect(velocityHistory.length).toBe(2);
      // Average of (20 + 28) / 2 = 24
      expect(averageVelocity).toBe(24);
      expect(velocityHistory[0].name).toBe('Sprint Past 1');
      expect(velocityHistory[1].name).toBe('Sprint Past 2');
    });
  });

  // 3. Developer Workload & Distribution
  describe('Developer Workload Analytics', () => {
    it('should compute workload, points, and open task count per developer', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/analytics/workload`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { workload, unassigned } = res.body.data;
      expect(workload).toBeDefined();

      const devRecord = workload.find((w) => w.userId.toString() === testDev._id.toString());
      expect(devRecord).toBeDefined();
      expect(devRecord.totalAssignedTasks).toBe(2); // Tasks 1 and 2
      expect(devRecord.completedTasksCount).toBe(1); // Task 1 done
      expect(devRecord.openTasksCount).toBe(1); // Task 2 in_progress
      expect(devRecord.totalStoryPoints).toBe(13); // 8 + 5 = 13

      expect(unassigned.count).toBe(1); // Task 4 is unassigned
      expect(unassigned.storyPoints).toBe(3);
    });

    it('should compute status and priority breakdown across project tasks', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/analytics/distribution`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { totalTasks, statusDistribution, priorityDistribution } = res.body.data;
      expect(totalTasks).toBe(4);
      expect(statusDistribution.done.count).toBe(1);
      expect(statusDistribution.in_progress.count).toBe(1);
      expect(statusDistribution.to_do.count).toBe(1);
      expect(statusDistribution.backlog.count).toBe(1);

      expect(priorityDistribution.urgent).toBe(1);
      expect(priorityDistribution.high).toBe(1);
      expect(priorityDistribution.medium).toBe(1);
      expect(priorityDistribution.low).toBe(1);
    });
  });

  // 4. Data Export Engine (CSV and Excel)
  describe('Data Export Engine (CSV & Excel)', () => {
    it('should stream formatted CSV task export with standard RFC headers', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/export?format=csv`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=.*\.csv/);

      const csvContent = res.text;
      expect(csvContent).toContain('Task Key');
      expect(csvContent).toContain('Title');
      expect(csvContent).toContain('Status');
      expect(csvContent).toContain('Story Points');
      expect(csvContent).toContain(`${testProject.key}-1`);
      expect(csvContent).toContain('Recharts Burndown Integration');
    });

    it('should stream formatted Excel (.xlsx) task export with valid spreadsheet binary signature', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/export?format=xlsx`)
        .set('Authorization', `Bearer ${devToken}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/spreadsheetml\.sheet/);
      expect(res.headers['content-disposition']).toMatch(/attachment; filename=.*\.xlsx/);

      const buffer = res.body;
      expect(buffer).toBeDefined();
      expect(buffer.length).toBeGreaterThan(100);

      // Verify ZIP / XLSX magic signature bytes (0x50, 0x4B = "PK")
      expect(buffer[0]).toBe(0x50);
      expect(buffer[1]).toBe(0x4b);
    });

    it('should reject unauthorized user attempting to export project tasks with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/export?format=csv`)
        .set('Authorization', `Bearer ${unauthToken}`);

      expect(res.status).toBe(403);
    });
  });
});
