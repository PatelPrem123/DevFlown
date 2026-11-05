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
import Comment from '../src/models/Comment.js';
import Sprint from '../src/models/Sprint.js';
import Milestone from '../src/models/Milestone.js';
import GitHubIntegration from '../src/models/GitHubIntegration.js';
import { generateToken } from '../src/utils/token.js';
import { encryptToken } from '../src/utils/crypto.js';

describe('Phase 11: Master Security Penetration & OWASP Hardening Suite', () => {
  let userAlpha, userBeta, userGamma;
  let tokenAlpha, tokenBeta, tokenGamma;
  let wsAlpha, wsBeta;
  let projAlpha, projBeta;
  let taskAlpha, taskBeta;
  let commentAlpha, commentBeta;
  let sprintAlpha, milestoneAlpha;

  beforeAll(async () => {
    await connectDB();

    // Clean test records
    await User.deleteMany({ email: { $regex: /@sec-test\.com$/ } });
    await Workspace.deleteMany({ name: { $regex: /Sec WS/ } });

    // Seed Tenant Alpha Admin
    userAlpha = await User.create({
      name: 'Alpha Admin',
      email: 'alpha@sec-test.com',
      password: 'Password123!',
      role: 'user'
    });
    tokenAlpha = generateToken(userAlpha);

    // Seed Tenant Beta Admin
    userBeta = await User.create({
      name: 'Beta Admin',
      email: 'beta@sec-test.com',
      password: 'Password123!',
      role: 'user'
    });
    tokenBeta = generateToken(userBeta);

    // Seed Restricted Viewer in Alpha
    userGamma = await User.create({
      name: 'Gamma Viewer',
      email: 'gamma@sec-test.com',
      password: 'Password123!',
      role: 'user'
    });
    tokenGamma = generateToken(userGamma);

    // Seed Workspace Alpha
    wsAlpha = await Workspace.create({
      name: 'Sec WS Alpha',
      slug: `sec-ws-alpha-${Date.now()}`,
      ownerId: userAlpha._id
    });

    await WorkspaceMembership.create([
      { workspaceId: wsAlpha._id, userId: userAlpha._id, role: 'admin' },
      { workspaceId: wsAlpha._id, userId: userGamma._id, role: 'member' }
    ]);

    // Seed Workspace Beta
    wsBeta = await Workspace.create({
      name: 'Sec WS Beta',
      slug: `sec-ws-beta-${Date.now()}`,
      ownerId: userBeta._id
    });

    await WorkspaceMembership.create({
      workspaceId: wsBeta._id,
      userId: userBeta._id,
      role: 'admin'
    });

    // Seed Project Alpha
    projAlpha = await Project.create({
      name: 'Alpha Core',
      key: `ALP${Math.floor(Math.random() * 899 + 100)}`,
      workspaceId: wsAlpha._id,
      ownerId: userAlpha._id
    });

    await ProjectMembership.create({
      projectId: projAlpha._id,
      workspaceId: wsAlpha._id,
      userId: userGamma._id,
      role: 'viewer' // Restricted to read-only
    });

    // Seed Project Beta
    projBeta = await Project.create({
      name: 'Beta Secret',
      key: `BET${Math.floor(Math.random() * 899 + 100)}`,
      workspaceId: wsBeta._id,
      ownerId: userBeta._id
    });

    // Seed Task Alpha
    taskAlpha = await Task.create({
      taskKey: `${projAlpha.key}-991`,
      title: 'Alpha Secret Architecture',
      projectId: projAlpha._id,
      workspaceId: wsAlpha._id,
      reporterId: userAlpha._id,
      status: 'to_do',
      orderIndex: 1000.0
    });

    // Seed Task Beta
    taskBeta = await Task.create({
      taskKey: `${projBeta.key}-991`,
      title: 'Beta Secret Financials',
      projectId: projBeta._id,
      workspaceId: wsBeta._id,
      reporterId: userBeta._id,
      status: 'to_do',
      orderIndex: 1000.0
    });

    // Seed Comments
    commentAlpha = await Comment.create({
      taskId: taskAlpha._id,
      projectId: projAlpha._id,
      workspaceId: wsAlpha._id,
      authorId: userAlpha._id,
      content: 'Alpha discussion thread'
    });

    commentBeta = await Comment.create({
      taskId: taskBeta._id,
      projectId: projBeta._id,
      workspaceId: wsBeta._id,
      authorId: userBeta._id,
      content: 'Beta confidential roadmap'
    });

    // Seed Sprint & Milestone in Alpha
    sprintAlpha = await Sprint.create({
      name: 'Alpha Sprint 1',
      projectId: projAlpha._id,
      workspaceId: wsAlpha._id,
      status: 'planned'
    });

    milestoneAlpha = await Milestone.create({
      title: 'Alpha Release v1',
      projectId: projAlpha._id,
      workspaceId: wsAlpha._id,
      dueDate: new Date(Date.now() + 10 * 86400000)
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@sec-test\.com$/ } });
    await Workspace.deleteMany({ _id: { $in: [wsAlpha._id, wsBeta._id] } });
    await WorkspaceMembership.deleteMany({ workspaceId: { $in: [wsAlpha._id, wsBeta._id] } });
    await Project.deleteMany({ _id: { $in: [projAlpha._id, projBeta._id] } });
    await ProjectMembership.deleteMany({ projectId: { $in: [projAlpha._id, projBeta._id] } });
    await Task.deleteMany({ projectId: { $in: [projAlpha._id, projBeta._id] } });
    await Comment.deleteMany({ workspaceId: { $in: [wsAlpha._id, wsBeta._id] } });
    await Sprint.deleteMany({ workspaceId: wsAlpha._id });
    await Milestone.deleteMany({ workspaceId: wsAlpha._id });
    await GitHubIntegration.deleteMany({ workspaceId: { $in: [wsAlpha._id, wsBeta._id] } });

    await disconnectDB();
  });

  // 1. BOLA / IDOR Cross-Tenant Penetration Attacks
  describe('BOLA / IDOR Cross-Tenant Isolation Defense', () => {
    it('should reject User Alpha attempting to list members of Workspace Beta with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/workspaces/${wsBeta._id}/members`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(403);
    });

    it('should reject User Alpha attempting to access Project Beta details with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projBeta._id}`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN_WORKSPACE_ACCESS');
    });

    it('should reject User Alpha attempting to query tasks inside Project Beta with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projBeta._id}/tasks`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(403);
    });

    it('should reject User Alpha attempting to edit Task Beta with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskBeta._id}`)
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_PERMISSIONS');
    });

    it('should reject User Alpha attempting to delete Task Beta with 403', async () => {
      const res = await request(app)
        .delete(`/api/v1/tasks/${taskBeta._id}`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
    });

    it('should reject User Alpha attempting to export Project Beta data with 403', async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${projBeta._id}/export?format=csv`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(403);
    });

    it('should reject User Alpha attempting to delete Comment Beta with 403', async () => {
      const res = await request(app)
        .delete(`/api/v1/comments/${commentBeta._id}`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(403);
    });
  });

  // 2. Role-Based Privilege Escalation (Two-Tier RBAC)
  describe('Two-Tier RBAC Privilege Escalation Defense', () => {
    it('should reject Project Viewer attempting to create a task with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projAlpha._id}/tasks`)
        .set('Authorization', `Bearer ${tokenGamma}`)
        .send({ title: 'Unauthorized Task Creation' });

      expect(res.status).toBe(403);
    });

    it('should reject Project Viewer attempting to drag a Kanban card with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskAlpha._id}/move`)
        .set('Authorization', `Bearer ${tokenGamma}`)
        .send({
          columnId: 'in_progress',
          prevOrderIndex: 1000.0,
          nextOrderIndex: 2000.0
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_PERMISSIONS');
    });

    it('should reject Project Viewer attempting to start a sprint with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/sprints/${sprintAlpha._id}/start`)
        .set('Authorization', `Bearer ${tokenGamma}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
    });

    it('should reject Project Viewer attempting to delete a milestone with 403', async () => {
      const res = await request(app)
        .delete(`/api/v1/milestones/${milestoneAlpha._id}`)
        .set('Authorization', `Bearer ${tokenGamma}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
    });

    it('should reject Project Viewer attempting to bind GitHub repository with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/github/projects/${projAlpha._id}/connect-repo`)
        .set('Authorization', `Bearer ${tokenGamma}`)
        .send({ fullName: 'devflow-org/unauthorized-repo' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
    });
  });

  // 3. NoSQL Operator Injection Defense (OWASP A03)
  describe('NoSQL Operator Injection Defense (Zod Boundary Validation)', () => {
    it('should reject object operator injection in login email with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: { $gt: '' },
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should reject object operator injection in password with 400 validation error', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'alpha@sec-test.com',
          password: { $ne: null }
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('should reject non-string operator payload in task creation with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/projects/${projAlpha._id}/tasks`)
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          title: { $gt: '' }
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  // 4. Stored XSS Script Scrubbing (DEC-011)
  describe('Stored XSS Script Scrubbing (DEC-011)', () => {
    it('should scrub malicious <script> tags and onerror handlers from task descriptions', async () => {
      const maliciousPayload = '<script>alert("xss")</script><img src="x" onerror="evil()"><p>Valid safe text</p><a href="javascript:alert(1)">Link</a>';

      const res = await request(app)
        .post(`/api/v1/projects/${projAlpha._id}/tasks`)
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          title: 'XSS Defense Task',
          description: maliciousPayload
        });

      expect(res.status).toBe(201);
      const createdTask = res.body.data.task;

      // Verify stored description has no executable scripts
      expect(createdTask.description).not.toContain('<script>');
      expect(createdTask.description).not.toContain('onerror=');
      expect(createdTask.description).not.toContain('javascript:');
      expect(createdTask.description).toContain('<p>Valid safe text</p>');
    });

    it('should scrub malicious script tags from task comments', async () => {
      const maliciousComment = '<script src="https://evil.com/leak.js"></script>Hey @alpha, inspect this issue!';

      const res = await request(app)
        .post(`/api/v1/tasks/${taskAlpha._id}/comments`)
        .set('Authorization', `Bearer ${tokenAlpha}`)
        .send({
          content: maliciousComment
        });

      expect(res.status).toBe(201);
      const createdComment = res.body.data.comment;

      expect(createdComment.content).not.toContain('<script>');
      expect(createdComment.content).toContain('Hey @alpha, inspect this issue!');
    });
  });

  // 5. Credential Isolation & Token Redaction (DEC-006)
  describe('Credential Isolation & Token Redaction (DEC-006)', () => {
    it('should never expose token ciphertext or plaintext across GitHub status endpoints', async () => {
      await GitHubIntegration.create({
        workspaceId: wsAlpha._id,
        userId: userAlpha._id,
        githubUserId: '9876543',
        githubUsername: 'alpha-security-bot',
        encryptedAccessToken: encryptToken('gho_superSecretToken1234567890')
      });

      const res = await request(app)
        .get(`/api/v1/github/status?workspaceId=${wsAlpha._id}`)
        .set('Authorization', `Bearer ${tokenAlpha}`);

      expect(res.status).toBe(200);
      expect(res.body.data.connected).toBe(true);
      expect(res.body.data.githubUsername).toBe('alpha-security-bot');

      // Verify no token property exists anywhere in response
      expect(res.body.data.encryptedAccessToken).toBeUndefined();
      expect(res.body.data.accessToken).toBeUndefined();
      expect(res.text).not.toContain('gho_superSecretToken');
    });
  });

  // 6. Timing-Safe HMAC Anti-Spoofing (DEC-007)
  describe('Timing-Safe HMAC Webhook Anti-Spoofing (DEC-007)', () => {
    it('should reject forged webhook signature without side-channel character timing leaks', async () => {
      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', 'guid-spoof-1')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', 'sha256=1111111111111111111111111111111111111111111111111111111111111111')
        .send({ repository: { full_name: 'devflow-org/core' } });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });
});
