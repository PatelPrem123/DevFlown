import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { io as Client } from 'socket.io-client';
import { server, app } from '../src/index.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/User.js';
import Workspace from '../src/models/Workspace.js';
import WorkspaceMembership from '../src/models/WorkspaceMembership.js';
import Project from '../src/models/Project.js';
import ProjectMembership from '../src/models/ProjectMembership.js';
import Task from '../src/models/Task.js';
import Notification from '../src/models/Notification.js';
import { generateToken } from '../src/utils/token.js';
import { emitToUser, emitToProject, emitToTask } from '../src/sockets/socketManager.js';

describe('Phase 7: Socket.IO Real-Time Mesh & Room Authorization Suite', () => {
  let serverUrl;
  let testAdmin, testDev, unauthorizedUser;
  let adminToken, devToken, unauthToken;
  let testWorkspace, testProject, testTask;
  const activeSockets = [];

  const createClientSocket = (token, extraOptions = {}) => {
    const socket = Client(serverUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
      ...extraOptions
    });
    activeSockets.push(socket);
    return socket;
  };

  beforeAll(async () => {
    await connectDB();

    // Start HTTP server on an ephemeral OS-assigned free port
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    serverUrl = `http://127.0.0.1:${port}`;

    // Clean test collections
    await User.deleteMany({ email: { $regex: /@mesh-test\.com$/ } });
    await Workspace.deleteMany({ name: 'Mesh Test Workspace' });
    await Task.deleteMany({ title: { $regex: /Mesh Test/ } });

    // Seed Admin User
    testAdmin = await User.create({
      name: 'Admin Sarah',
      email: 'sarah@mesh-test.com',
      password: 'Password123!',
      role: 'user'
    });
    adminToken = generateToken(testAdmin);

    // Seed Developer User
    testDev = await User.create({
      name: 'Dev Mike',
      email: 'mike@mesh-test.com',
      password: 'Password123!',
      role: 'user'
    });
    devToken = generateToken(testDev);

    // Seed External Unauthorized User
    unauthorizedUser = await User.create({
      name: 'Stranger Bob',
      email: 'bob@mesh-test.com',
      password: 'Password123!',
      role: 'user'
    });
    unauthToken = generateToken(unauthorizedUser);

    // Seed Workspace & Memberships
    testWorkspace = await Workspace.create({
      name: 'Mesh Test Workspace',
      slug: `mesh-test-ws-${Date.now()}`,
      ownerId: testAdmin._id
    });

    await WorkspaceMembership.create([
      { workspaceId: testWorkspace._id, userId: testAdmin._id, role: 'admin' },
      { workspaceId: testWorkspace._id, userId: testDev._id, role: 'member' }
    ]);

    // Seed Project & Memberships
    testProject = await Project.create({
      name: 'Mesh Project Alpha',
      key: `MSH${Math.floor(Math.random() * 899 + 100)}`,
      workspaceId: testWorkspace._id,
      ownerId: testAdmin._id
    });

    await ProjectMembership.create({
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      userId: testDev._id,
      role: 'developer'
    });

    // Seed Task
    testTask = await Task.create({
      taskKey: `${testProject.key}-1`,
      title: 'Mesh Test Task For Live Sync',
      projectId: testProject._id,
      workspaceId: testWorkspace._id,
      reporterId: testAdmin._id,
      status: 'to_do',
      orderIndex: 1000.0
    });
  });

  afterAll(async () => {
    // Disconnect all sockets
    activeSockets.forEach((s) => {
      if (s.connected) s.disconnect();
    });

    // Close HTTP Server
    await new Promise((resolve) => server.close(resolve));

    // Cleanup DB
    await User.deleteMany({ email: { $regex: /@mesh-test\.com$/ } });
    await Workspace.deleteMany({ _id: testWorkspace._id });
    await WorkspaceMembership.deleteMany({ workspaceId: testWorkspace._id });
    await Project.deleteMany({ _id: testProject._id });
    await ProjectMembership.deleteMany({ projectId: testProject._id });
    await Task.deleteMany({ projectId: testProject._id });
    await Notification.deleteMany({ workspaceId: testWorkspace._id });

    await disconnectDB();
  });

  // 1. Connection Authentication Tests
  it('should reject unauthenticated socket connection attempts', async () => {
    const socket = createClientSocket(null);

    const errorPromise = new Promise((resolve) => {
      socket.on('connect_error', (err) => resolve(err));
    });

    socket.connect();
    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toMatch(/Authentication failed: Missing token/);
    expect(socket.connected).toBe(false);
  });

  it('should reject connection attempts with invalid or forged JWT token', async () => {
    const socket = createClientSocket('forged.invalid.jwt.token');

    const errorPromise = new Promise((resolve) => {
      socket.on('connect_error', (err) => resolve(err));
    });

    socket.connect();
    const err = await errorPromise;
    expect(err).toBeDefined();
    expect(err.message).toMatch(/Authentication failed: Invalid or expired token/);
    expect(socket.connected).toBe(false);
  });

  it('should accept connection with valid token via auth.token payload', async () => {
    const socket = createClientSocket(adminToken);

    const connectPromise = new Promise((resolve) => {
      socket.on('connect', () => resolve(true));
    });

    socket.connect();
    const connected = await connectPromise;
    expect(connected).toBe(true);
    expect(socket.connected).toBe(true);
  });

  it('should accept connection with valid token via Cookie header (devflow_token)', async () => {
    const socket = Client(serverUrl, {
      extraHeaders: {
        cookie: `devflow_token=${devToken}`
      },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false
    });
    activeSockets.push(socket);

    const connectPromise = new Promise((resolve) => {
      socket.on('connect', () => resolve(true));
    });

    socket.connect();
    const connected = await connectPromise;
    expect(connected).toBe(true);
    expect(socket.connected).toBe(true);
  });

  // 2. Personal Room & Direct Notification Tests
  it('should automatically join personal user room and receive direct notifications', async () => {
    const devSocket = createClientSocket(devToken);

    await new Promise((resolve) => {
      devSocket.on('connect', resolve);
      devSocket.connect();
    });

    const notificationPayload = {
      title: 'Mentioned in MSH-1',
      message: 'Sarah mentioned you in task discussion',
      type: 'mention'
    };

    const notificationReceivedPromise = new Promise((resolve) => {
      devSocket.on('notification:new', (data) => resolve(data));
    });

    // Server emits directly to user's personal room
    emitToUser(testDev._id, 'notification:new', notificationPayload);

    const received = await notificationReceivedPromise;
    expect(received).toEqual(notificationPayload);
  });

  // 3. Room Authorization Security Tests (BOLA Defense)
  it('should reject unauthorized user attempting to join workspace room', async () => {
    const unauthSocket = createClientSocket(unauthToken);

    await new Promise((resolve) => {
      unauthSocket.on('connect', resolve);
      unauthSocket.connect();
    });

    const response = await new Promise((resolve) => {
      unauthSocket.emit('join:workspace', testWorkspace._id.toString(), resolve);
    });

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/Access denied: Not a member of this workspace/);
  });

  it('should allow authorized member to join workspace room', async () => {
    const devSocket = createClientSocket(devToken);

    await new Promise((resolve) => {
      devSocket.on('connect', resolve);
      devSocket.connect();
    });

    const response = await new Promise((resolve) => {
      devSocket.emit('join:workspace', testWorkspace._id.toString(), resolve);
    });

    expect(response.success).toBe(true);
    expect(response.room).toBe(`workspace_${testWorkspace._id}`);
  });

  it('should reject unauthorized user attempting to join project room', async () => {
    const unauthSocket = createClientSocket(unauthToken);

    await new Promise((resolve) => {
      unauthSocket.on('connect', resolve);
      unauthSocket.connect();
    });

    const response = await new Promise((resolve) => {
      unauthSocket.emit('join:project', testProject._id.toString(), resolve);
    });

    expect(response.success).toBe(false);
    expect(response.error).toMatch(/Access denied: Not a member of this project/);
  });

  it('should allow assigned developer to join project room', async () => {
    const devSocket = createClientSocket(devToken);

    await new Promise((resolve) => {
      devSocket.on('connect', resolve);
      devSocket.connect();
    });

    const response = await new Promise((resolve) => {
      devSocket.emit('join:project', testProject._id.toString(), resolve);
    });

    expect(response.success).toBe(true);
    expect(response.room).toBe(`project_${testProject._id}`);
  });

  it('should allow Workspace Admin to join project room via two-tier RBAC inheritance', async () => {
    const adminSocket = createClientSocket(adminToken);

    await new Promise((resolve) => {
      adminSocket.on('connect', resolve);
      adminSocket.connect();
    });

    // Admin is not in ProjectMembership, but is Workspace Admin
    const response = await new Promise((resolve) => {
      adminSocket.emit('join:project', testProject._id.toString(), resolve);
    });

    expect(response.success).toBe(true);
    expect(response.room).toBe(`project_${testProject._id}`);
  });

  // 4. Multi-Client Real-Time Broadcast Integration Tests
  it('should broadcast task:moved event to all clients in the project room when card is moved via API', async () => {
    // Client 1 (Admin) and Client 2 (Developer) both connect
    const adminSocket = createClientSocket(adminToken);
    const devSocket = createClientSocket(devToken);

    await Promise.all([
      new Promise((resolve) => {
        adminSocket.on('connect', resolve);
        adminSocket.connect();
      }),
      new Promise((resolve) => {
        devSocket.on('connect', resolve);
        devSocket.connect();
      })
    ]);

    // Both join project room
    await Promise.all([
      new Promise((resolve) => adminSocket.emit('join:project', testProject._id.toString(), resolve)),
      new Promise((resolve) => devSocket.emit('join:project', testProject._id.toString(), resolve))
    ]);

    // Setup listener on Developer client for task:moved broadcast
    const moveEventPromise = new Promise((resolve) => {
      devSocket.on('task:moved', (data) => resolve(data));
    });

    // Move task via REST API (as Admin)
    const res = await request(app)
      .patch(`/api/v1/tasks/${testTask._id}/move`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        columnId: 'in_progress',
        prevOrderIndex: 1000.0,
        nextOrderIndex: 2000.0
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify Developer socket received the real-time event
    const receivedEvent = await moveEventPromise;
    expect(receivedEvent).toBeDefined();
    expect(receivedEvent.taskId.toString()).toBe(testTask._id.toString());
    expect(receivedEvent.newStatus).toBe('in_progress');
    expect(receivedEvent.newOrderIndex).toBe(1500.0);
  });

  it('should broadcast typing indicator across task room to other members', async () => {
    const adminSocket = createClientSocket(adminToken);
    const devSocket = createClientSocket(devToken);

    await Promise.all([
      new Promise((resolve) => {
        adminSocket.on('connect', resolve);
        adminSocket.connect();
      }),
      new Promise((resolve) => {
        devSocket.on('connect', resolve);
        devSocket.connect();
      })
    ]);

    // Both join task room
    await Promise.all([
      new Promise((resolve) => adminSocket.emit('join:task', testTask._id.toString(), resolve)),
      new Promise((resolve) => devSocket.emit('join:task', testTask._id.toString(), resolve))
    ]);

    const typingPromise = new Promise((resolve) => {
      devSocket.on('user:typing', (data) => resolve(data));
    });

    // Admin starts typing
    adminSocket.emit('task:typing', {
      taskId: testTask._id.toString(),
      isTyping: true
    });

    const typingData = await typingPromise;
    expect(typingData).toBeDefined();
    expect(typingData.userId.toString()).toBe(testAdmin._id.toString());
    expect(typingData.name).toBe('Admin Sarah');
    expect(typingData.isTyping).toBe(true);
  });
});
