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
import Notification from '../src/models/Notification.js';
import ActivityLog from '../src/models/ActivityLog.js';
import Counter from '../src/models/Counter.js';

describe('Phase 6: Comments, Mentions, Notifications & Activity Logs Suite', () => {
  let adminCookie = null;
  let dev1Cookie = null;
  let dev2Cookie = null;
  let viewerCookie = null;

  let adminUser = null;
  let dev1User = null;
  let dev2User = null;
  let viewerUser = null;

  let workspaceId = null;
  let projectId = null;
  let taskId = null;
  let taskKey = null;

  let commentId = null;
  let notificationId = null;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await Project.deleteMany({});
    await ProjectMembership.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await Counter.deleteMany({});

    // 1. Create Workspace Admin (Alice)
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Alice PM',
        email: 'alice.pm@example.com',
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
        name: 'Collaboration Engine',
        key: 'TEAM',
        visibility: 'private'
      });
    projectId = projectRes.body.data.project.id;

    // 3. Create Developer 1 (Bob)
    const dev1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Bob Coder',
        email: 'bob.coder@example.com',
        password: 'DevPassword123!'
      });
    dev1Cookie = dev1Res.headers['set-cookie'];
    dev1User = dev1Res.body.data.user;

    // Add Bob to workspace and project
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: dev1User.email, role: 'member' });
    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: dev1User.id, role: 'developer' });

    // 4. Create Developer 2 (Dave - will be @mentioned)
    const dev2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Dave Reviewer',
        email: 'dave.reviewer@example.com',
        password: 'DevPassword123!'
      });
    dev2Cookie = dev2Res.headers['set-cookie'];
    dev2User = dev2Res.body.data.user;

    // Add Dave to workspace and project
    await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/invitations`)
      .set('Cookie', adminCookie)
      .send({ email: dev2User.email, role: 'member' });
    await request(app)
      .post(`/api/v1/projects/${projectId}/members`)
      .set('Cookie', adminCookie)
      .send({ userId: dev2User.id, role: 'developer' });

    // 5. Create Viewer (Vera)
    const viewerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Vera Viewer',
        email: 'vera.collab@example.com',
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

    // Create a target task for comments
    const taskRes = await request(app)
      .post(`/api/v1/projects/${projectId}/tasks`)
      .set('Cookie', dev1Cookie)
      .send({
        title: 'Build Threaded Comments Feature',
        status: 'in_progress',
        storyPoints: 5
      });
    taskId = taskRes.body.data.task._id;
    taskKey = taskRes.body.data.task.taskKey;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Workspace.deleteMany({});
    await WorkspaceMembership.deleteMany({});
    await Project.deleteMany({});
    await ProjectMembership.deleteMany({});
    await Task.deleteMany({});
    await Comment.deleteMany({});
    await Notification.deleteMany({});
    await ActivityLog.deleteMany({});
    await Counter.deleteMany({});
    await disconnectDB();
  });

  it('POST /api/v1/tasks/:taskId/comments - should post comment and trigger @mention notification', async () => {
    const commentBody = 'Hey @Dave, please review this implementation for the security module. <script>evil()</script>';

    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Cookie', dev1Cookie)
      .send({ content: commentBody });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comment.authorId.name).toBe('Bob Coder');
    expect(res.body.data.comment.content).toContain('Hey @Dave');
    // Verify DOMPurify stripped the script tag (DEC-011)
    expect(res.body.data.comment.content).not.toContain('<script>');

    commentId = res.body.data.comment._id;

    // Verify Notification document was created for Dave
    const notification = await Notification.findOne({ recipientId: dev2User.id, type: 'mention' });
    expect(notification).toBeDefined();
    expect(notification.title).toContain('Bob Coder mentioned you');
    expect(notification.read).toBe(false);

    notificationId = notification._id;
  });

  it('GET /api/v1/tasks/:taskId/comments - should retrieve comments ordered chronologically', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/comments`)
      .set('Cookie', dev2Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.comments.length).toBe(1);
    expect(res.body.data.comments[0]._id.toString()).toBe(commentId.toString());
  });

  it('GET /api/v1/notifications - Dave should see unread notification', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Cookie', dev2Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unreadCount).toBeGreaterThanOrEqual(1);
    expect(res.body.data.notifications.some((n) => n._id.toString() === notificationId.toString())).toBe(true);
  });

  it('PATCH /api/v1/notifications/:id/read - should mark notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Cookie', dev2Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.read).toBe(true);
  });

  it('GET /api/v1/projects/:id/activity - should retrieve append-only forensic activity timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}/activity`)
      .set('Cookie', dev1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should have recorded comment_added
    expect(res.body.data.activities.some((a) => a.action === 'comment_added')).toBe(true);
  });

  it('GET /api/v1/tasks/:id/activity - should retrieve activity timeline for single task', async () => {
    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/activity`)
      .set('Cookie', dev1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activities.length).toBeGreaterThanOrEqual(1);
  });

  it('RBAC Guard: Viewer cannot post comments (403 Forbidden)', async () => {
    const res = await request(app)
      .post(`/api/v1/tasks/${taskId}/comments`)
      .set('Cookie', viewerCookie)
      .send({ content: 'Unauthorized comment attempt' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSUFFICIENT_PROJECT_PERMISSIONS');
  });

  it('RBAC Guard: Other developer cannot delete someone else comment (403 Forbidden)', async () => {
    // Dave attempts to delete Bob's comment
    const res = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Cookie', dev2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_COMMENT_DELETION');
  });

  it('DELETE /api/v1/comments/:id - Author can delete their own comment', async () => {
    // Bob deletes his own comment
    const res = await request(app)
      .delete(`/api/v1/comments/${commentId}`)
      .set('Cookie', dev1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
