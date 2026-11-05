import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import Task from '../models/Task.js';
import { WORKSPACE_ROLES } from '../config/constants.js';

let io = null;

/**
 * Parses raw Cookie header string into a key-value map
 */
export const parseCookieHeader = (cookieHeader) => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookieStr) => {
    const [name, ...rest] = cookieStr.trim().split('=');
    if (name) {
      acc[name] = decodeURIComponent(rest.join('='));
    }
    return acc;
  }, {});
};

/**
 * Extracts JWT token from socket handshake auth, header, or cookie
 */
export const extractSocketToken = (socket) => {
  // 1. Handshake auth payload (e.g. io('/', { auth: { token: '...' } }))
  if (socket.handshake.auth && socket.handshake.auth.token) {
    return socket.handshake.auth.token;
  }

  // 2. Authorization header fallback (Bearer <token>)
  const authHeader = socket.handshake.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  // 3. Handshake HTTP cookie (devflow_token)
  const cookies = parseCookieHeader(socket.handshake.headers?.cookie);
  if (cookies.devflow_token) {
    return cookies.devflow_token;
  }

  return null;
};

/**
 * Authenticates socket connections against JWT and active database user records
 */
export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = extractSocketToken(socket);
    if (!token) {
      return next(new Error('Authentication failed: Missing token.'));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return next(new Error('Authentication failed: Invalid or expired token.'));
    }

    const user = await User.findById(decoded.id).select('_id name email avatar role').lean();
    if (!user) {
      return next(new Error('Authentication failed: User no longer exists.'));
    }

    socket.user = user;
    return next();
  } catch (err) {
    return next(new Error(`Authentication failed: ${err.message}`));
  }
};

/**
 * Initializes and mounts Socket.IO onto the HTTP server
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE']
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Attach JWT Authentication Middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    if (env.NODE_ENV !== 'test') {
      console.log(`🔌 Authenticated client connected to Socket.IO mesh: ${socket.id} (User: ${socket.user.name})`);
    }

    // Auto-join personal user notifications room
    socket.join(`user_${socket.user._id}`);

    // Scoped Room Join Handlers with BOLA Authorization Guards

    // 1. Join Workspace Room
    socket.on('join:workspace', async (workspaceId, callback = () => {}) => {
      try {
        if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
          return callback({ success: false, error: 'Invalid workspace ID.' });
        }

        const membership = await WorkspaceMembership.findOne({
          workspaceId,
          userId: socket.user._id
        });

        if (!membership) {
          return callback({ success: false, error: 'Access denied: Not a member of this workspace.' });
        }

        socket.join(`workspace_${workspaceId}`);
        callback({ success: true, room: `workspace_${workspaceId}` });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // 2. Join Project Room (Enforces Two-Tier RBAC - DEC-004)
    socket.on('join:project', async (projectId, callback = () => {}) => {
      try {
        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
          return callback({ success: false, error: 'Invalid project ID.' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
          return callback({ success: false, error: 'Project not found.' });
        }

        // Check if user is Workspace Admin (universal PM authority)
        const isWsAdmin = await WorkspaceMembership.exists({
          workspaceId: project.workspaceId,
          userId: socket.user._id,
          role: WORKSPACE_ROLES.ADMIN
        });

        if (!isWsAdmin) {
          const isProjectMember = await ProjectMembership.exists({
            projectId: project._id,
            userId: socket.user._id
          });

          if (!isProjectMember) {
            return callback({ success: false, error: 'Access denied: Not a member of this project.' });
          }
        }

        socket.join(`project_${projectId}`);
        callback({ success: true, room: `project_${projectId}` });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // 3. Join Task Room
    socket.on('join:task', async (taskId, callback = () => {}) => {
      try {
        if (!taskId) {
          return callback({ success: false, error: 'Task ID is required.' });
        }

        const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
        const task = await Task.findOne(isObjectId ? { _id: taskId } : { taskKey: taskId.toUpperCase() });
        if (!task) {
          return callback({ success: false, error: 'Task not found.' });
        }

        // Verify project access
        const isWsAdmin = await WorkspaceMembership.exists({
          workspaceId: task.workspaceId,
          userId: socket.user._id,
          role: WORKSPACE_ROLES.ADMIN
        });

        if (!isWsAdmin) {
          const isProjectMember = await ProjectMembership.exists({
            projectId: task.projectId,
            userId: socket.user._id
          });

          if (!isProjectMember) {
            return callback({ success: false, error: 'Access denied: Not a member of this project.' });
          }
        }

        socket.join(`task_${task._id}`);
        callback({ success: true, room: `task_${task._id}` });
      } catch (error) {
        callback({ success: false, error: error.message });
      }
    });

    // Leave Room Handlers
    socket.on('leave:workspace', (workspaceId) => {
      if (workspaceId) socket.leave(`workspace_${workspaceId}`);
    });

    socket.on('leave:project', (projectId) => {
      if (projectId) socket.leave(`project_${projectId}`);
    });

    socket.on('leave:task', (taskId) => {
      if (taskId) socket.leave(`task_${taskId}`);
    });

    // Real-Time Typing Indicators for Collaborative Task Editing
    socket.on('task:typing', ({ taskId, isTyping }) => {
      if (taskId) {
        socket.to(`task_${taskId}`).emit('user:typing', {
          userId: socket.user._id,
          name: socket.user.name,
          taskId,
          isTyping: Boolean(isTyping)
        });
      }
    });

    socket.on('disconnect', () => {
      if (env.NODE_ENV !== 'test') {
        console.log(`🔌 Client disconnected from Socket.IO mesh: ${socket.id}`);
      }
    });
  });

  return io;
};

/**
 * Returns the active Socket.IO server instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized yet. Call initSocket(server) first.');
  }
  return io;
};

/**
 * Centralized safe event broadcasting helpers
 */
export const emitToUser = (userId, event, payload) => {
  try {
    if (io) io.to(`user_${userId}`).emit(event, payload);
  } catch (err) {}
};

export const emitToWorkspace = (workspaceId, event, payload) => {
  try {
    if (io) io.to(`workspace_${workspaceId}`).emit(event, payload);
  } catch (err) {}
};

export const emitToProject = (projectId, event, payload) => {
  try {
    if (io) io.to(`project_${projectId}`).emit(event, payload);
  } catch (err) {}
};

export const emitToTask = (taskId, event, payload) => {
  try {
    if (io) io.to(`task_${taskId}`).emit(event, payload);
  } catch (err) {}
};

export const broadcastAll = (event, payload) => {
  try {
    if (io) io.emit(event, payload);
  } catch (err) {}
};
