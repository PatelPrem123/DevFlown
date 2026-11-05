import Task from '../models/Task.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import { moveCard } from '../services/kanbanService.js';
import { KANBAN_COLUMNS, KANBAN_COLUMN_LIST, PROJECT_ROLES, WORKSPACE_ROLES } from '../config/constants.js';
import { getIO } from '../sockets/socketManager.js';

const safeEmit = (room, event, payload) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, payload);
    }
  } catch (err) {
    // Socket.IO uninitialized in tests
  }
};

const COLUMN_METADATA = {
  [KANBAN_COLUMNS.BACKLOG]: { id: KANBAN_COLUMNS.BACKLOG, title: 'Backlog', color: 'slate' },
  [KANBAN_COLUMNS.TO_DO]: { id: KANBAN_COLUMNS.TO_DO, title: 'To Do', color: 'indigo' },
  [KANBAN_COLUMNS.IN_PROGRESS]: { id: KANBAN_COLUMNS.IN_PROGRESS, title: 'In Progress', color: 'amber' },
  [KANBAN_COLUMNS.REVIEW]: { id: KANBAN_COLUMNS.REVIEW, title: 'In Review', color: 'purple' },
  [KANBAN_COLUMNS.DONE]: { id: KANBAN_COLUMNS.DONE, title: 'Done', color: 'emerald' }
};

// @desc    Get complete Kanban board for a project grouped by column
// @route   GET /api/v1/projects/:id/board
// @access  Project Viewer or higher
export const getProjectBoard = async (req, res, next) => {
  try {
    const project = req.project;

    // Fetch all active project tasks sorted by fractional orderIndex (DEC-003)
    const tasks = await Task.find({ projectId: project._id })
      .populate('assigneeId', 'name email avatar githubUsername')
      .populate('reporterId', 'name email avatar')
      .sort({ orderIndex: 1 })
      .lean();

    // Group cards into the 5 discrete columns
    const columns = KANBAN_COLUMN_LIST.map((colId) => {
      const colTasks = tasks.filter((t) => t.status === colId);
      const totalPoints = colTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

      return {
        ...COLUMN_METADATA[colId],
        count: colTasks.length,
        totalPoints,
        tasks: colTasks
      };
    });

    const totalProjectPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = tasks
      .filter((t) => t.status === KANBAN_COLUMNS.DONE)
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        project: {
          id: project._id,
          name: project.name,
          key: project.key,
          role: req.projectMembership.role
        },
        summary: {
          totalTasks: tasks.length,
          totalPoints: totalProjectPoints,
          completedPoints,
          completionPercentage: totalProjectPoints > 0 ? Math.round((completedPoints / totalProjectPoints) * 100) : 0
        },
        columns
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Move Kanban card with fractional indexing O(1) persistence
// @route   PATCH /api/v1/tasks/:id/move
// @access  Developer or Project Manager
export const moveTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { columnId, prevOrderIndex = null, nextOrderIndex = null } = req.body;

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

    // Two-Tier RBAC check: Caller must have Developer or PM role on the task's project
    const membership = await ProjectMembership.findOne({
      projectId: task.projectId,
      userId: req.user._id
    });

    // Check if user is Workspace Admin (inherits universal PM per DEC-004)
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: task.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    if (!isWsAdmin && (!membership || (membership.role !== PROJECT_ROLES.DEVELOPER && membership.role !== PROJECT_ROLES.PROJECT_MANAGER))) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PROJECT_PERMISSIONS',
          message: 'Only assigned Developers or Project Managers are authorized to move tasks on the board.'
        }
      });
    }

    // Execute fractional order calculation and single-document O(1) update (DEC-003)
    const result = await moveCard(task, columnId, prevOrderIndex, nextOrderIndex);

    const populatedTask = await Task.findById(task._id)
      .populate('assigneeId', 'name email avatar githubUsername')
      .populate('reporterId', 'name email avatar')
      .lean();

    // Broadcast move event across WebSocket mesh to project room
    safeEmit(`project_${task.projectId}`, 'task:moved', {
      taskId: task._id,
      taskKey: task.taskKey,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus,
      newOrderIndex: result.newOrderIndex,
      rebalanced: result.rebalanced,
      task: populatedTask
    });

    res.status(200).json({
      success: true,
      message: `Task ${task.taskKey} moved to '${columnId}' at order ${result.newOrderIndex.toFixed(4)}.`,
      data: {
        task: populatedTask,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus,
        orderIndex: result.newOrderIndex,
        rebalanced: result.rebalanced
      }
    });
  } catch (error) {
    next(error);
  }
};
