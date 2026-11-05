import mongoose from 'mongoose';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import User from '../models/User.js';
import { getNextTaskKey } from '../services/sequenceService.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { getIO } from '../sockets/socketManager.js';
import { FRACTIONAL_INDEXING, PROJECT_ROLES, WORKSPACE_ROLES } from '../config/constants.js';

/**
 * Safely emit real-time Socket.IO events without crashing if IO is not initialized (e.g. unit tests)
 */
const safeEmit = (room, event, payload) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, payload);
    }
  } catch (err) {
    // Socket.IO may be uninitialized in isolated test suites
  }
};

// @desc    Create a new task within a project
// @route   POST /api/v1/projects/:projectId/tasks
// @access  Developer or Project Manager
export const createTask = async (req, res, next) => {
  try {
    const project = req.project;
    const { title, description, status, priority, storyPoints, assigneeId, dueDate, labels } = req.body;

    // Validate assignee belongs to this project if provided
    if (assigneeId) {
      const isAssigneeInProject = await ProjectMembership.exists({
        projectId: project._id,
        userId: assigneeId
      });

      if (!isAssigneeInProject) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ASSIGNEE_NOT_IN_PROJECT',
            message: 'The designated assignee is not an active member of this project.'
          }
        });
      }
    }

    // 1. Generate concurrency-safe sequential task key (e.g. FLOW-101) (DEC-005)
    const taskKey = await getNextTaskKey(project._id, project.key);

    // 2. Compute initial orderIndex at bottom of target column (DEC-003)
    const targetStatus = status || 'backlog';
    const lastCard = await Task.findOne({ projectId: project._id, status: targetStatus })
      .sort({ orderIndex: -1 })
      .select('orderIndex')
      .lean();

    const orderIndex = lastCard ? lastCard.orderIndex + FRACTIONAL_INDEXING.DEFAULT_GAP : FRACTIONAL_INDEXING.INITIAL_BASE;

    // 3. Dual-Layer Content Sanitization for Markdown description (DEC-011)
    const cleanDescription = description ? sanitizeHtml(description) : '';

    // 4. Create Task document
    const task = await Task.create({
      taskKey,
      title,
      description: cleanDescription,
      projectId: project._id,
      workspaceId: project.workspaceId,
      status: targetStatus,
      priority: priority || 'medium',
      orderIndex,
      storyPoints: storyPoints !== undefined ? storyPoints : null,
      assigneeId: assigneeId || null,
      reporterId: req.user._id,
      dueDate: dueDate ? new Date(dueDate) : null,
      labels: labels || []
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatar githubUsername')
      .populate('reporterId', 'name email avatar')
      .lean();

    // 5. Real-Time WebSocket Broadcasts (DEC-009)
    safeEmit(`project_${project._id}`, 'task:created', populatedTask);
    if (assigneeId && assigneeId.toString() !== req.user._id.toString()) {
      safeEmit(`user_${assigneeId}`, 'task:assigned', {
        taskKey: task.taskKey,
        title: task.title,
        assignedBy: req.user.name,
        priority: task.priority
      });
    }

    res.status(201).json({
      success: true,
      message: `Task ${task.taskKey} created successfully.`,
      data: {
        task: populatedTask
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List tasks in a project with filtering & ordering
// @route   GET /api/v1/projects/:projectId/tasks
// @access  Project Viewer or higher
export const getTasks = async (req, res, next) => {
  try {
    const project = req.project;
    const { status, priority, assigneeId, search, label } = req.query;

    const filter = { projectId: project._id };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (label) filter.labels = label;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { taskKey: { $regex: search.toUpperCase() } }
      ];
    }

    const tasks = await Task.find(filter)
      .populate('assigneeId', 'name email avatar githubUsername')
      .populate('reporterId', 'name email avatar')
      .sort({ orderIndex: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        tasks,
        total: tasks.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed task by Mongo ID or Task Key (e.g. FLOW-101)
// @route   GET /api/v1/tasks/:id
// @access  Project Viewer or higher
export const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { taskKey: id.toUpperCase() };

    const task = await Task.findOne(query)
      .populate('assigneeId', 'name email avatar githubUsername')
      .populate('reporterId', 'name email avatar')
      .populate('projectId', 'name key workspaceId visibility')
      .lean();

    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `No task found with identifier '${id}'.`
        }
      });
    }

    // Verify caller has access to task's parent project (BOLA Defense)
    const membership = await ProjectMembership.findOne({
      projectId: task.projectId._id,
      userId: req.user._id
    });

    if (!membership && task.projectId.visibility !== 'public') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_TASK_ACCESS',
          message: 'You do not have permission to view tasks in this private project.'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        task
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details (title, description, priority, points, assignee)
// @route   PATCH /api/v1/tasks/:id
// @access  Developer or Project Manager
export const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, storyPoints, assigneeId, dueDate, labels } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `No task found with identifier '${id}'.`
        }
      });
    }

    // Verify developer or PM role on the task's project or Workspace Admin (DEC-004)
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: task.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    if (!isWsAdmin) {
      const membership = await ProjectMembership.findOne({
        projectId: task.projectId,
        userId: req.user._id
      });

      if (!membership || (membership.role !== PROJECT_ROLES.DEVELOPER && membership.role !== PROJECT_ROLES.PROJECT_MANAGER)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PROJECT_PERMISSIONS',
            message: 'Only assigned Developers or Project Managers can edit task details.'
          }
        });
      }
    }

    // Validate assignee if changed
    if (assigneeId && assigneeId !== task.assigneeId?.toString()) {
      const isMember = await ProjectMembership.exists({
        projectId: task.projectId,
        userId: assigneeId
      });

      if (!isMember) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'ASSIGNEE_NOT_IN_PROJECT',
            message: 'Target assignee is not a member of this project.'
          }
        });
      }
      task.assigneeId = assigneeId;
    } else if (assigneeId === null) {
      task.assigneeId = null;
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = sanitizeHtml(description);
    if (status !== undefined) task.status = status;
    if (priority !== undefined) task.priority = priority;
    if (storyPoints !== undefined) task.storyPoints = storyPoints;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (labels !== undefined) task.labels = labels;

    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatar githubUsername')
      .populate('reporterId', 'name email avatar')
      .lean();

    // Broadcast update via Socket.IO
    safeEmit(`project_${task.projectId}`, 'task:updated', updatedTask);
    safeEmit(`task_${task._id}`, 'task:updated', updatedTask);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: {
        task: updatedTask
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task from project
// @route   DELETE /api/v1/tasks/:id
// @access  Project Manager (PM)
export const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: `No task found with identifier '${id}'.`
        }
      });
    }

    // Require PM role to delete tasks or Workspace Admin (DEC-004)
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: task.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    if (!isWsAdmin) {
      const membership = await ProjectMembership.findOne({
        projectId: task.projectId,
        userId: req.user._id
      });

      if (!membership || membership.role !== PROJECT_ROLES.PROJECT_MANAGER) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'PM_ROLE_REQUIRED',
            message: 'Only Project Managers are authorized to delete tasks.'
          }
        });
      }
    }

    await Task.findByIdAndDelete(task._id);

    safeEmit(`project_${task.projectId}`, 'task:deleted', { taskId: task._id, taskKey: task.taskKey });

    res.status(200).json({
      success: true,
      message: `Task ${task.taskKey} deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
