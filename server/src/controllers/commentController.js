import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import { sanitizeHtml } from '../utils/sanitize.js';
import { parseMentionsAndNotify } from '../services/notificationService.js';
import { logActivity } from '../services/activityService.js';
import { ACTIVITY_TYPES, PROJECT_ROLES, WORKSPACE_ROLES } from '../config/constants.js';
import { getIO } from '../sockets/socketManager.js';

const safeEmit = (room, event, payload) => {
  try {
    const io = getIO();
    if (io) {
      io.to(room).emit(event, payload);
    }
  } catch (err) {
    // Uninitialized in test runs
  }
};

// @desc    Get threaded comments for a task
// @route   GET /api/v1/tasks/:taskId/comments
// @access  Project Viewer or higher
export const getTaskComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
    const query = isObjectId ? { _id: taskId } : { taskKey: taskId.toUpperCase() };

    const task = await Task.findOne(query);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' }
      });
    }

    // Verify project access or Workspace Admin (DEC-004)
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: task.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    if (!isWsAdmin) {
      const isMember = await ProjectMembership.exists({
        projectId: task.projectId,
        userId: req.user._id
      });

      if (!isMember) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN_TASK_ACCESS', message: 'Access denied to task discussions.' }
        });
      }
    }

    const comments = await Comment.find({ taskId: task._id })
      .populate('authorId', 'name email avatar githubUsername')
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        comments,
        total: comments.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Post comment with @mentions and activity tracking
// @route   POST /api/v1/tasks/:taskId/comments
// @access  Developer or Project Manager
export const createComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content, attachments } = req.body;

    const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
    const query = isObjectId ? { _id: taskId } : { taskKey: taskId.toUpperCase() };

    const task = await Task.findOne(query);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: { code: 'TASK_NOT_FOUND', message: 'Task not found.' }
      });
    }

    // Verify Developer or PM role or Workspace Admin (DEC-004)
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
            message: 'Only Developers or Project Managers can participate in task discussions.'
          }
        });
      }
    }

    // 1. Dual-Layer Sanitization (DEC-011)
    const cleanContent = sanitizeHtml(content);

    // 2. Parse @mentions and trigger push notifications
    const mentions = await parseMentionsAndNotify({
      content: cleanContent,
      task,
      sender: req.user,
      workspaceId: task.workspaceId,
      projectId: task.projectId
    });

    // 3. Create Comment document
    const comment = await Comment.create({
      taskId: task._id,
      projectId: task.projectId,
      workspaceId: task.workspaceId,
      authorId: req.user._id,
      content: cleanContent,
      mentions,
      attachments: attachments || []
    });

    // 4. Record in append-only ActivityLog (DEC-002)
    await logActivity({
      projectId: task.projectId,
      workspaceId: task.workspaceId,
      taskId: task._id,
      actorId: req.user._id,
      action: ACTIVITY_TYPES.COMMENT_ADDED,
      details: {
        taskKey: task.taskKey,
        commentId: comment._id,
        snippet: cleanContent.substring(0, 100)
      }
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'name email avatar githubUsername')
      .lean();

    // 5. Broadcast real-time comment creation to task room
    safeEmit(`task_${task._id}`, 'comment:created', populatedComment);

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      data: {
        comment: populatedComment
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a comment
// @route   DELETE /api/v1/comments/:id
// @access  Comment Author or Project Manager
export const deleteComment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { code: 'COMMENT_NOT_FOUND', message: 'Comment does not exist.' }
      });
    }

    const isAuthor = comment.authorId.toString() === req.user._id.toString();

    // Check if caller is PM on the project or Workspace Admin (DEC-004)
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: comment.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    let isPM = false;
    if (!isAuthor && !isWsAdmin) {
      const projectMembership = await ProjectMembership.findOne({
        projectId: comment.projectId,
        userId: req.user._id
      });
      isPM = projectMembership && projectMembership.role === PROJECT_ROLES.PROJECT_MANAGER;
    }

    if (!isAuthor && !isPM && !isWsAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_COMMENT_DELETION',
          message: 'You may only delete your own comments unless you are a Project Manager.'
        }
      });
    }

    await Comment.findByIdAndDelete(comment._id);

    safeEmit(`task_${comment.taskId}`, 'comment:deleted', { commentId: comment._id });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};
