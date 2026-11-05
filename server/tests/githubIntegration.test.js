import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import WorkspaceMembership from '../src/models/WorkspaceMembership.js';
import Project from '../src/models/Project.js';
import ProjectMembership from '../src/models/ProjectMembership.js';
import Task from '../src/models/Task.js';
import GitHubIntegration from '../src/models/GitHubIntegration.js';
import WebhookEvent from '../src/models/WebhookEvent.js';
import { generateToken } from '../src/utils/token.js';
import { encryptToken, decryptToken, verifyWebhookSignature } from '../src/utils/crypto.js';
import { env } from '../src/config/env.js';

describe('Phase 8: GitHub Integration, AES-256-GCM & Webhook Suite', () => {
  let testAdmin, testDev, unauthUser;
  let adminToken, devToken, unauthToken;
  let testWorkspace, testProject, testTask;

  const WEBHOOK_SECRET = env.GITHUB_WEBHOOK_SECRET || 'devflow_webhook_verification_secret_key_entropy';

  const signPayload = (payloadString, secret = WEBHOOK_SECRET) => {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(Buffer.from(payloadString, 'utf8'));
    return `sha256=${hmac.digest('hex')}`;
  };

  beforeAll(async () => {
    await connectDB();

    // Clean test collections
    await User.deleteMany({ email: { $regex: /@git-test\.com$/ } });
    await Workspace.deleteMany({ name: 'GitHub Test Workspace' });
    await WebhookEvent.deleteMany({});

    // Seed Admin
    testAdmin = await User.create({
      name: 'Git Admin Alice',
      email: 'alice@git-test.com',
      password: 'Password123!',
      role: 'user'
    });
    adminToken = generateToken(testAdmin);

    // Seed Developer
    testDev = await User.create({
      name: 'Git Dev Bob',
      email: 'bob@git-test.com',
      password: 'Password123!',
      role: 'user'
    });
    devToken = generateToken(testDev);

    // Seed Unauthorized User
    unauthUser = await User.create({
      name: 'Git Stranger Charlie',
      email: 'charlie@git-test.com',
      password: 'Password123!',
      role: 'user'
    });
    unauthToken = generateToken(unauthUser);

    // Seed Workspace & Memberships
    testWorkspace = await Workspace.create({
      name: 'GitHub Test Workspace',
      slug: `git-test-ws-${Date.now()}`,
      ownerId: testAdmin._id
    });

    await WorkspaceMembership.create([
      { workspaceId: testWorkspace._id, userId: testAdmin._id, role: 'admin' },
      { workspaceId: testWorkspace._id, userId: testDev._id, role: 'member' }
    ]);

    // Seed Project with connected GitHub repository
    testProject = await Project.create({
      name: 'DevFlow Engine',
      key: `GIT${Math.floor(Math.random() * 899 + 100)}`,
      workspaceId: testWorkspace._id,
      ownerId: testAdmin._id,
      githubRepo: {
        owner: 'devflow-org',
        repo: 'devflow-core',
        fullName: 'devflow-org/devflow-core',
        connectedAt: new Date()
      }
    });

    await ProjectMembership.create({
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      userId: testDev._id,
      role: 'developer'
    });

    // Seed Task
    testTask = await Task.create({
      taskKey: `${testProject.key}-101`,
      title: 'Implement AES-256-GCM cipher encryption',
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      reporterId: testAdmin._id,
      status: 'to_do',
      orderIndex: 1000.0
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@git-test\.com$/ } });
    await Workspace.deleteMany({ _id: testWorkspace._id });
    await WorkspaceMembership.deleteMany({ workspaceId: testWorkspace._id });
    await Project.deleteMany({ _id: testProject._id });
    await ProjectMembership.deleteMany({ projectId: testProject._id });
    await Task.deleteMany({ projectId: testProject._id });
    await GitHubIntegration.deleteMany({ workspaceId: testWorkspace._id });
    await WebhookEvent.deleteMany({});

    await disconnectDB();
  });

  // 1. AES-256-GCM Token Encryption Cryptographic Integrity Tests (DEC-006)
  describe('AES-256-GCM Cryptographic Storage (DEC-006)', () => {
    it('should encrypt sensitive plaintext tokens to iv:authTag:ciphertext format', () => {
      const rawToken = 'gho_secretAccessTokenFromGitHubOAuth_1234567890';
      const encrypted = encryptToken(rawToken);

      expect(encrypted).toBeDefined();
      const parts = encrypted.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBe(24); // 12-byte IV = 24 hex chars
      expect(parts[1].length).toBe(32); // 16-byte Auth Tag = 32 hex chars
      expect(parts[2].length).toBeGreaterThan(0); // Ciphertext hex
    });

    it('should decrypt cipher back to exact original plaintext token', () => {
      const rawToken = 'gho_sampleToken987654321';
      const encrypted = encryptToken(rawToken);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(rawToken);
    });

    it('should throw authentication integrity error when ciphertext is tampered with', () => {
      const rawToken = 'gho_authenticToken';
      const encrypted = encryptToken(rawToken);
      const parts = encrypted.split(':');

      // Flip characters in ciphertext
      const tamperedCipher = parts[2].substring(0, parts[2].length - 2) + 'aa';
      const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;

      expect(() => decryptToken(tamperedPayload)).toThrow();
    });

    it('should throw authentication integrity error when auth tag is tampered with', () => {
      const rawToken = 'gho_authenticToken';
      const encrypted = encryptToken(rawToken);
      const parts = encrypted.split(':');

      // Mutate auth tag
      const tamperedTag = '00000000000000000000000000000000';
      const tamperedPayload = `${parts[0]}:${tamperedTag}:${parts[2]}`;

      expect(() => decryptToken(tamperedPayload)).toThrow();
    });

    it('should never expose encryptedAccessToken in GitHubIntegration JSON serialization', async () => {
      const integration = await GitHubIntegration.create({
        workspaceId: testWorkspace._id,
        userId: testAdmin._id,
        githubUserId: '1234567',
        githubUsername: 'alice-octocat',
        encryptedAccessToken: encryptToken('gho_testToken12345')
      });

      const json = integration.toJSON();
      expect(json.encryptedAccessToken).toBeUndefined();
      expect(json.__v).toBeUndefined();
      expect(json.githubUsername).toBe('alice-octocat');
    });
  });

  // 2. Timing-Safe HMAC-SHA256 Webhook Verification Tests (DEC-007)
  describe('Timing-Safe HMAC-SHA256 Webhook Verification (DEC-007)', () => {
    it('should verify matching HMAC-SHA256 signature against raw body buffer', () => {
      const rawBody = Buffer.from(JSON.stringify({ zen: 'Keep it logically awesome.' }), 'utf8');
      const validSig = signPayload(rawBody.toString('utf8'));

      const verified = verifyWebhookSignature(rawBody, validSig, WEBHOOK_SECRET);
      expect(verified).toBe(true);
    });

    it('should reject forged or mismatched webhook signatures', () => {
      const rawBody = Buffer.from(JSON.stringify({ zen: 'Keep it logically awesome.' }), 'utf8');
      const forgedSig = 'sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      const verified = verifyWebhookSignature(rawBody, forgedSig, WEBHOOK_SECRET);
      expect(verified).toBe(false);
    });

    it('should reject webhook requests missing X-Hub-Signature-256 with 401', async () => {
      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', 'guid-missing-sig-1')
        .set('X-GitHub-Event', 'push')
        .send({ repository: { full_name: 'devflow-org/devflow-core' } });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_SIGNATURE');
    });

    it('should reject webhook requests with invalid signature with 401', async () => {
      const payload = { repository: { full_name: 'devflow-org/devflow-core' } };
      const invalidSig = 'sha256=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb';

      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', 'guid-invalid-sig-1')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', invalidSig)
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });

  // 3. Webhook Idempotency Deduplication Tests (DEC-008)
  describe('Webhook Idempotency Deduplication (DEC-008)', () => {
    it('should process new webhook delivery and record entry in WebhookEvent collection', async () => {
      const deliveryId = `delivery-${Date.now()}-1`;
      const payload = {
        zen: 'Mind your words, they become actions.',
        repository: { full_name: 'devflow-org/devflow-core' }
      };
      const payloadStr = JSON.stringify(payload);
      const signature = signPayload(payloadStr);

      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryId)
        .set('X-GitHub-Event', 'ping')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadStr);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify recorded in ledger
      const record = await WebhookEvent.findOne({ deliveryId });
      expect(record).toBeDefined();
      expect(record.status).toBe('processed');
    });

    it('should detect duplicate delivery GUID and skip re-processing with 200 OK duplicate: true', async () => {
      const deliveryId = `delivery-duplicate-${Date.now()}`;
      const payload = {
        repository: { full_name: 'devflow-org/devflow-core' }
      };
      const payloadStr = JSON.stringify(payload);
      const signature = signPayload(payloadStr);

      // First delivery
      const firstRes = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryId)
        .set('X-GitHub-Event', 'ping')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadStr);

      expect(firstRes.status).toBe(200);

      // Second delivery with identical GUID
      const secondRes = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryId)
        .set('X-GitHub-Event', 'ping')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadStr);

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.duplicate).toBe(true);
      expect(secondRes.body.message).toMatch(/already been processed/);
    });
  });

  // 4. Commit Message Parsing & Task Association Tests
  describe('Commit Association & Regex Extraction', () => {
    it('should link commit to task when commit message contains taskKey', async () => {
      const deliveryId = `delivery-commit-${Date.now()}`;
      const commitHash = 'a1b2c3d4e5f6789012345678901234567890abcd';
      const commitMessage = `feat(crypto): resolve ${testTask.taskKey} with AES-256-GCM cipher`;

      const payload = {
        repository: { full_name: 'devflow-org/devflow-core' },
        commits: [
          {
            id: commitHash,
            message: commitMessage,
            author: { name: 'Bob Developer', username: 'bob-dev' },
            timestamp: new Date().toISOString(),
            url: `https://github.com/devflow-org/devflow-core/commit/${commitHash}`
          }
        ]
      };

      const payloadStr = JSON.stringify(payload);
      const signature = signPayload(payloadStr);

      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryId)
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadStr);

      expect(res.status).toBe(200);

      // Verify task now has the commit associated
      const updatedTask = await Task.findById(testTask._id);
      expect(updatedTask.githubCommits.length).toBe(1);
      expect(updatedTask.githubCommits[0].commitHash).toBe(commitHash);
      expect(updatedTask.githubCommits[0].message).toBe(commitMessage);
      expect(updatedTask.githubCommits[0].author).toBe('Bob Developer');
    });

    it('should not duplicate commit if identical commit is pushed again', async () => {
      const deliveryId = `delivery-commit-repush-${Date.now()}`;
      const commitHash = 'a1b2c3d4e5f6789012345678901234567890abcd'; // already pushed above

      const payload = {
        repository: { full_name: 'devflow-org/devflow-core' },
        commits: [
          {
            id: commitHash,
            message: `feat(crypto): resolve ${testTask.taskKey} with AES-256-GCM cipher`,
            author: { name: 'Bob Developer' }
          }
        ]
      };

      const payloadStr = JSON.stringify(payload);
      const signature = signPayload(payloadStr);

      const res = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryId)
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', signature)
        .set('Content-Type', 'application/json')
        .send(payloadStr);

      expect(res.status).toBe(200);

      const updatedTask = await Task.findById(testTask._id);
      // Still only 1 commit, not duplicated
      expect(updatedTask.githubCommits.length).toBe(1);
    });
  });

  // 5. Pull Request Association & State Sync Tests
  describe('Pull Request Association & State Synchronization', () => {
    it('should associate open pull request to task and not automatically close task when merged', async () => {
      const deliveryIdOpen = `delivery-pr-open-${Date.now()}`;
      const prNumber = 42;

      // 1. Webhook PR opened
      const openPayload = {
        action: 'opened',
        repository: { full_name: 'devflow-org/devflow-core' },
        pull_request: {
          number: prNumber,
          title: `Resolve ${testTask.taskKey} encryption issues`,
          body: 'Fixes AES GCM cipher integration',
          state: 'open',
          merged: false,
          html_url: `https://github.com/devflow-org/devflow-core/pull/${prNumber}`,
          head: { ref: `feature/${testTask.taskKey}-crypto` }
        }
      };

      const openStr = JSON.stringify(openPayload);
      const openSig = signPayload(openStr);

      const openRes = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryIdOpen)
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', openSig)
        .set('Content-Type', 'application/json')
        .send(openStr);

      expect(openRes.status).toBe(200);

      let taskAfterOpen = await Task.findById(testTask._id);
      expect(taskAfterOpen.githubPullRequests.length).toBe(1);
      expect(taskAfterOpen.githubPullRequests[0].prNumber).toBe(prNumber);
      expect(taskAfterOpen.githubPullRequests[0].state).toBe('open');

      // 2. Webhook PR merged
      const deliveryIdMerge = `delivery-pr-merged-${Date.now()}`;
      const mergePayload = {
        action: 'closed',
        repository: { full_name: 'devflow-org/devflow-core' },
        pull_request: {
          number: prNumber,
          title: `Resolve ${testTask.taskKey} encryption issues`,
          state: 'closed',
          merged: true,
          html_url: `https://github.com/devflow-org/devflow-core/pull/${prNumber}`,
          head: { ref: `feature/${testTask.taskKey}-crypto` }
        }
      };

      const mergeStr = JSON.stringify(mergePayload);
      const mergeSig = signPayload(mergeStr);

      const mergeRes = await request(app)
        .post('/api/v1/github/webhooks')
        .set('X-GitHub-Delivery', deliveryIdMerge)
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', mergeSig)
        .set('Content-Type', 'application/json')
        .send(mergeStr);

      expect(mergeRes.status).toBe(200);

      // 3. Verify PR state updated to 'merged', but task status remains 'to_do'
      const taskAfterMerge = await Task.findById(testTask._id);
      expect(taskAfterMerge.githubPullRequests[0].state).toBe('merged');
      expect(taskAfterMerge.status).toBe('to_do'); // Contract: never unilaterally completes tasks
    });
  });

  // 6. Project Repository Linking & RBAC Access Control
  describe('Project Repository Configuration & RBAC', () => {
    it('should reject non-PM user attempting to connect a repository with 403', async () => {
      const res = await request(app)
        .post(`/api/v1/github/projects/${testProject._id}/connect-repo`)
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          fullName: 'devflow-org/new-repo',
          owner: 'devflow-org',
          repo: 'new-repo'
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PM_ROLE_REQUIRED');
    });

    it('should allow Workspace Admin to connect a repository to a project', async () => {
      const res = await request(app)
        .post(`/api/v1/github/projects/${testProject._id}/connect-repo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: 'devflow-org/devflow-api',
          owner: 'devflow-org',
          repo: 'devflow-api'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.project.githubRepo.fullName).toBe('devflow-org/devflow-api');
    });

    it('should allow Workspace Admin to disconnect a repository from a project', async () => {
      const res = await request(app)
        .delete(`/api/v1/github/projects/${testProject._id}/disconnect-repo`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const project = await Project.findById(testProject._id);
      expect(project.githubRepo.fullName).toBeNull();
    });
  });
});
