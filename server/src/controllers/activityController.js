import ActivityLog from '../models/ActivityLog.js';
import Task from '../models/Task.js';
import ProjectMembership from '../models/ProjectMembership.js';

// @desc    Get project-wide forensic activity timeline
// @route   GET /api/v1/projects/:id/activity
// @access  Project Viewer or higher
export const getProjectActivity = async (req, res, next) => {
  try {
    const project = req.project;

    const activities = await ActivityLog.find({ projectId: project._id })
      .populate('actorId', 'name email avatar githubUsername')
      .populate('taskId', 'taskKey title status')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        activities,
        total: activities.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task activity timeline
// @route   GET /api/v1/tasks/:id/activity
// @access  Project Viewer or higher
export const getTaskActivity = async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' }
      });
    }

    // Verify project access
    const isMember = await ProjectMembership.exists({
      projectId: task.projectId,
      userId: req.user._id
    });

    if (!isMember && req.workspaceMembership?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN_TASK_ACCESS', message: 'Access denied.' }
      });
    }

    const activities = await ActivityLog.find({ taskId: task._id })
      .populate('actorId', 'name email avatar githubUsername')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        activities,
        total: activities.length
      }
    });
  } catch (error) {
    next(error);
  }
};
