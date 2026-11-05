import mongoose from 'mongoose';
import Milestone from '../models/Milestone.js';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import Task from '../models/Task.js';
import { PROJECT_ROLES, WORKSPACE_ROLES } from '../config/constants.js';

// Helper: Check PM or Workspace Admin authorization for milestone operations
const isAuthorizedPM = async (workspaceId, projectId, userId) => {
  const isWsAdmin = await WorkspaceMembership.exists({
    workspaceId,
    userId,
    role: WORKSPACE_ROLES.ADMIN
  });
  if (isWsAdmin) return true;

  const membership = await ProjectMembership.findOne({
    projectId,
    userId
  });
  return membership && membership.role === PROJECT_ROLES.PROJECT_MANAGER;
};

// @desc    Create a new milestone
// @route   POST /api/v1/projects/:projectId/milestones
// @access  Project Manager (PM) or Workspace Admin
export const createMilestone = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { title, description, dueDate } = req.body;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TITLE', message: 'Milestone title is required.' }
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_DUE_DATE', message: 'Milestone due date is required.' }
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    const authorized = await isAuthorizedPM(project.workspaceId, project._id, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can create milestones.' }
      });
    }

    const milestone = await Milestone.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      projectId: project._id,
      workspaceId: project.workspaceId,
      dueDate: new Date(dueDate),
      status: 'open'
    });

    res.status(201).json({
      success: true,
      message: `Milestone '${milestone.title}' created successfully.`,
      data: { milestone }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all milestones for a project with task completion telemetry
// @route   GET /api/v1/projects/:projectId/milestones
// @access  Project Viewer or higher
export const getProjectMilestones = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const milestones = await Milestone.find({ projectId })
      .sort({ dueDate: 1 })
      .lean();

    // Enrich milestones with task telemetry
    const enriched = await Promise.all(
      milestones.map(async (m) => {
        const totalTasks = await Task.countDocuments({ milestoneId: m._id });
        const completedTasks = await Task.countDocuments({ milestoneId: m._id, status: 'done' });
        const completionPercentage = totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : (m.status === 'completed' ? 100 : 0);

        return {
          ...m,
          totalTasks,
          completedTasks,
          completionPercentage
        };
      })
    );

    res.status(200).json({
      success: true,
      data: { milestones: enriched }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single milestone details with linked tasks
// @route   GET /api/v1/milestones/:id
// @access  Project Viewer or higher
export const getMilestoneById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const milestone = await Milestone.findById(id).lean();
    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found.' }
      });
    }

    const linkedTasks = await Task.find({ milestoneId: milestone._id })
      .select('taskKey title status priority storyPoints assigneeId dueDate')
      .populate('assigneeId', 'name email avatar')
      .sort({ orderIndex: 1 })
      .lean();

    const totalTasks = linkedTasks.length;
    const completedTasks = linkedTasks.filter((t) => t.status === 'done').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        milestone: {
          ...milestone,
          totalTasks,
          completedTasks,
          completionPercentage,
          tasks: linkedTasks
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update milestone
// @route   PATCH /api/v1/milestones/:id
// @access  Project Manager (PM) or Workspace Admin
export const updateMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found.' }
      });
    }

    const authorized = await isAuthorizedPM(milestone.workspaceId, milestone.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can update milestones.' }
      });
    }

    if (title !== undefined) milestone.title = title.trim();
    if (description !== undefined) milestone.description = description.trim();
    if (dueDate !== undefined) milestone.dueDate = new Date(dueDate);

    await milestone.save();

    res.status(200).json({
      success: true,
      message: 'Milestone updated successfully.',
      data: { milestone }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle milestone status between open and completed
// @route   PATCH /api/v1/milestones/:id/toggle
// @access  Project Manager (PM) or Workspace Admin
export const toggleMilestoneStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found.' }
      });
    }

    const authorized = await isAuthorizedPM(milestone.workspaceId, milestone.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can toggle milestone status.' }
      });
    }

    milestone.status = milestone.status === 'open' ? 'completed' : 'open';
    milestone.completedAt = milestone.status === 'completed' ? new Date() : null;

    await milestone.save();

    res.status(200).json({
      success: true,
      message: `Milestone status changed to '${milestone.status}'.`,
      data: { milestone }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete milestone
// @route   DELETE /api/v1/milestones/:id
// @access  Project Manager (PM) or Workspace Admin
export const deleteMilestone = async (req, res, next) => {
  try {
    const { id } = req.params;

    const milestone = await Milestone.findById(id);
    if (!milestone) {
      return res.status(404).json({
        success: false,
        error: { code: 'MILESTONE_NOT_FOUND', message: 'Milestone not found.' }
      });
    }

    const authorized = await isAuthorizedPM(milestone.workspaceId, milestone.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can delete milestones.' }
      });
    }

    // Unlink tasks from deleted milestone
    await Task.updateMany({ milestoneId: milestone._id }, { $set: { milestoneId: null } });

    await Milestone.findByIdAndDelete(milestone._id);

    res.status(200).json({
      success: true,
      message: `Milestone '${milestone.title}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};
