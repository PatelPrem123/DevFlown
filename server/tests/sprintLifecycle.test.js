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
import Milestone from '../src/models/Milestone.js';
import { generateToken } from '../src/utils/token.js';

describe('Phase 9: Sprint Lifecycle & Agile Milestones Suite (DEC-010)', () => {
  let testAdmin, testDev, unauthUser;
  let adminToken, devToken, unauthToken;
  let testWorkspace, testProject;

  beforeAll(async () => {
    await connectDB();

    // Clean test records
    await User.deleteMany({ email: { $regex: /@sprint-test\.com$/ } });
    await Workspace.deleteMany({ name: 'Sprint Test Workspace' });

    // Seed Admin
    testAdmin = await User.create({
      name: 'Sprint Admin Alex',
      email: 'alex@sprint-test.com',
      password: 'Password123!',
      role: 'user'
    });
    adminToken = generateToken(testAdmin);

    // Seed Developer
    testDev = await User.create({
      name: 'Sprint Dev Dan',
      email: 'dan@sprint-test.com',
      password: 'Password123!',
      role: 'user'
    });
    devToken = generateToken(testDev);

    // Seed Unauthorized User
    unauthUser = await User.create({
      name: 'Sprint Stranger Sam',
      email: 'sam@sprint-test.com',
      password: 'Password123!',
      role: 'user'
    });
    unauthToken = generateToken(unauthUser);

    // Seed Workspace & Memberships
    testWorkspace = await Workspace.create({
      name: 'Sprint Test Workspace',
      slug: `sprint-ws-${Date.now()}`,
      ownerId: testAdmin._id
    });

    await WorkspaceMembership.create([
      { workspaceId: testWorkspace._id, userId: testAdmin._id, role: 'admin' },
      { workspaceId: testWorkspace._id, userId: testDev._id, role: 'member' }
    ]);

    // Seed Project
    testProject = await Project.create({
      name: 'Agile Engine',
      key: `SPN${Math.floor(Math.random() * 899 + 100)}`,
      workspaceId: testWorkspace._id,
      ownerId: testAdmin._id
    });

    await ProjectMembership.create({
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      userId: testDev._id,
      role: 'developer'
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@sprint-test\.com$/ } });
    await Workspace.deleteMany({ _id: testWorkspace._id });
    await WorkspaceMembership.deleteMany({ workspaceId: testWorkspace._id });
    await Project.deleteMany({ _id: testProject._id });
    await ProjectMembership.deleteMany({ projectId: testProject._id });
    await Task.deleteMany({ projectId: testProject._id });
    await Sprint.deleteMany({ projectId: testProject._id });
    await Milestone.deleteMany({ projectId: testProject._id });

    await disconnectDB();
  });

  // 1. Sprint Creation & RBAC
  describe('Sprint Creation & RBAC Guards', () => {
    it('should reject non-PM user attempting to create a sprint with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject._id}/sprints`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          name: 'Sprint 1 - Foundations',
          goal: 'Setup core database architecture'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
    });

    it('should allow Workspace Admin to create a planned sprint', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject._id}/sprints`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sprint 1 - Core Backend',
          goal: 'Implement token ciphers and database models',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sprint.name).toBe('Sprint 1 - Core Backend');
      expect(res.body.data.sprint.status).toBe('planned');
    });

    it('should list all sprints for a project', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${testProject._id}/sprints`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sprints.length).toBeGreaterThanOrEqual(1);
    });
  });

  // 2. Sprint Activation & Single Active Sprint Constraint (DEC-010)
  describe('Single Active Sprint Constraint & Activation (DEC-010)', () => {
    let sprint1, sprint2;

    beforeAll(async () => {
      sprint1 = await Sprint.findOne({ projectId: testProject._id, name: 'Sprint 1 - Core Backend' });

      // Create a second planned sprint
      sprint2 = await Sprint.create({
        name: 'Sprint 2 - Frontend UI',
        goal: 'Build Kanban boards and Recharts',
        projectId: testProject._id,
        workspaceId: testWorkspace._id,
        status: 'planned'
      });

      // Allocate tasks to Sprint 1
      await Task.create([
        {
          taskKey: `${testProject.key}-10`,
          title: 'Database Schema Design',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          sprintId: sprint1._id,
          storyPoints: 5,
          status: 'done'
        },
        {
          taskKey: `${testProject.key}-11`,
          title: 'Implement WebSockets',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          sprintId: sprint1._id,
          storyPoints: 8,
          status: 'in_progress'
        },
        {
          taskKey: `${testProject.key}-12`,
          title: 'Burndown Charts Integration',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          sprintId: sprint1._id,
          storyPoints: 3,
          status: 'to_do'
        }
      ]);
    });

    it('should start Sprint 1 and compute initial committed story points', async () => {
      const res = await request(app)
        .patch(`/api/v1/sprints/${sprint1._id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sprint.status).toBe('active');
      expect(res.body.data.sprint.totalStoryPoints).toBe(16); // 5 + 8 + 3 = 16 points
    });

    it('should reject starting Sprint 2 while Sprint 1 is currently active (DEC-010)', async () => {
      const res = await request(app)
        .patch(`/api/v1/sprints/${sprint2._id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('ACTIVE_SPRINT_EXISTS');
      expect(res.body.error.message).toMatch(/Another sprint is already active/);
    });

    it('should reject starting Sprint 1 again because it is already active', async () => {
      const res = await request(app)
        .patch(`/api/v1/sprints/${sprint1._id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('SPRINT_NOT_PLANNED');
    });
  });

  // 3. Sprint Completion with Automated Task Rollover (DEC-010)
  describe('Sprint Completion & Automated Task Rollover (DEC-010)', () => {
    let sprint1, sprint2;

    beforeAll(async () => {
      sprint1 = await Sprint.findOne({ projectId: testProject._id, name: 'Sprint 1 - Core Backend' });
      sprint2 = await Sprint.findOne({ projectId: testProject._id, name: 'Sprint 2 - Frontend UI' });
    });

    it('should complete Sprint 1 with default rollover to backlog for incomplete tasks', async () => {
      const res = await request(app)
        .patch(`/api/v1/sprints/${sprint1._id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rolloverTarget: 'backlog'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sprint.status).toBe('completed');
      expect(res.body.data.completedPoints).toBe(5); // Only Task 10 was 'done' (5 pts)
      expect(res.body.data.rolledOverTasksCount).toBe(2); // Tasks 11 & 12 incomplete

      // Incomplete tasks (11 & 12) must have sprintId set to null (rolled over to backlog)
      const rolledOverTasks = await Task.find({
        taskKey: { $in: [`${testProject.key}-11`, `${testProject.key}-12`] }
      });
      expect(rolledOverTasks[0].sprintId).toBeNull();
      expect(rolledOverTasks[1].sprintId).toBeNull();

      // Completed task (10) retains sprintId association
      const completedTask = await Task.findOne({ taskKey: `${testProject.key}-10` });
      expect(completedTask.sprintId.toString()).toBe(sprint1._id.toString());
    });

    it('should allow launching Sprint 2 now that Sprint 1 is completed', async () => {
      // Allocate a task to Sprint 2
      await Task.create([
        {
          taskKey: `${testProject.key}-20`,
          title: 'React Router Setup',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          sprintId: sprint2._id,
          storyPoints: 5,
          status: 'done'
        },
        {
          taskKey: `${testProject.key}-21`,
          title: 'Lucide Icons Integration',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          sprintId: sprint2._id,
          storyPoints: 3,
          status: 'in_progress'
        }
      ]);

      const res = await request(app)
        .patch(`/api/v1/sprints/${sprint2._id}/start`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sprint.status).toBe('active');
    });

    it('should complete Sprint 2 with rollover to next planned sprint', async () => {
      // Create Sprint 3
      const sprint3 = await Sprint.create({
        name: 'Sprint 3 - Polish & Launch',
        projectId: testProject._id,
        workspaceId: testWorkspace._id,
        status: 'planned'
      });

      const res = await request(app)
        .patch(`/api/v1/sprints/${sprint2._id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rolloverTarget: 'next_sprint',
          targetSprintId: sprint3._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rolledOverTasksCount).toBe(1); // Task 21 was incomplete
      expect(res.body.data.rolloverDestination).toBe('Sprint 3 - Polish & Launch');

      // Verify Task 21 is now assigned to Sprint 3
      const task21 = await Task.findOne({ taskKey: `${testProject.key}-21` });
      expect(task21.sprintId.toString()).toBe(sprint3._id.toString());
    });
  });

  // 4. Sprint Report Telemetry
  describe('Sprint Report Telemetry Metrics', () => {
    it('should generate accurate velocity and completion metrics in sprint report', async () => {
      const sprint1 = await Sprint.findOne({ projectId: testProject._id, name: 'Sprint 1 - Core Backend' });

      const res = await request(app)
        .get(`/api/v1/sprints/${sprint1._id}/report`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.metrics.totalStoryPoints).toBe(16);
      expect(res.body.data.metrics.completedStoryPoints).toBe(5);
      expect(res.body.data.metrics.completionPercentage).toBe(31); // 5/16 * 100 = 31%
    });
  });

  // 5. Agile Milestones Lifecycle & Task Linkage
  describe('Agile Milestones Lifecycle', () => {
    let milestone;

    it('should create milestone with target delivery date', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${testProject._id}/milestones`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'v1.0 Production Readiness',
          description: 'Deploy full-stack platform with GitHub sync',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.milestone.title).toBe('v1.0 Production Readiness');
      expect(res.body.data.milestone.status).toBe('open');
      milestone = res.body.data.milestone;
    });

    it('should link tasks and compute milestone completion percentage', async () => {
      // Create 2 tasks linked to milestone: 1 done, 1 in_progress
      await Task.create([
        {
          taskKey: `${testProject.key}-50`,
          title: 'Docker Production Container',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          milestoneId: milestone._id,
          status: 'done'
        },
        {
          taskKey: `${testProject.key}-51`,
          title: 'SSL TLS Certification',
          projectId: testProject._id,
          workspaceId: testWorkspace._id,
          reporterId: testAdmin._id,
          milestoneId: milestone._id,
          status: 'in_progress'
        }
      ]);

      const res = await request(app)
        .get(`/api/v1/milestones/${milestone._id}`)
        .set('Authorization', `Bearer ${devToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.milestone.totalTasks).toBe(2);
      expect(res.body.data.milestone.completedTasks).toBe(1);
      expect(res.body.data.milestone.completionPercentage).toBe(50);
    });

    it('should toggle milestone status between open and completed', async () => {
      const toggleRes = await request(app)
        .patch(`/api/v1/milestones/${milestone._id}/toggle`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.milestone.status).toBe('completed');
      expect(toggleRes.body.data.milestone.completedAt).toBeDefined();
    });

    it('should delete milestone and safely unlink attached tasks', async () => {
      const deleteRes = await request(app)
        .delete(`/api/v1/milestones/${milestone._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);

      // Verify milestone deleted
      const check = await Milestone.findById(milestone._id);
      expect(check).toBeNull();

      // Verify tasks are unlinked (milestoneId = null)
      const tasks = await Task.find({
        taskKey: { $in: [`${testProject.key}-50`, `${testProject.key}-51`] }
      });
      expect(tasks[0].milestoneId).toBeNull();
      expect(tasks[1].milestoneId).toBeNull();
    });
  });
});
