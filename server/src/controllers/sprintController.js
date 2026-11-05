import mongoose from 'mongoose';
import Sprint from '../models/Sprint.js';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import {
  startSprint,
  completeSprint,
  getSprintReportData
} from '../services/sprintService.js';
import { PROJECT_ROLES, WORKSPACE_ROLES } from '../config/constants.js';

// Helper: Check PM or Workspace Admin authorization for sprint operations
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

// @desc    Create a new sprint
// @route   POST /api/v1/projects/:projectId/sprints
// @access  Project Manager (PM) or Workspace Admin
export const createSprint = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_NAME', message: 'Sprint name is required.' }
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
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can create sprints.' }
      });
    }

    const sprint = await Sprint.create({
      name: name.trim(),
      goal: goal ? goal.trim() : '',
      projectId: project._id,
      workspaceId: project.workspaceId,
      status: 'planned',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.status(201).json({
      success: true,
      message: `Sprint '${sprint.name}' created successfully.`,
      data: { sprint }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all sprints for a project
// @route   GET /api/v1/projects/:projectId/sprints
// @access  Project Viewer or higher
export const getProjectSprints = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const sprints = await Sprint.find({ projectId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { sprints }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single sprint details
// @route   GET /api/v1/sprints/:id
// @access  Project Viewer or higher
export const getSprintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id).lean();
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    res.status(200).json({
      success: true,
      data: { sprint }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update sprint details (name, goal, dates)
// @route   PATCH /api/v1/sprints/:id
// @access  Project Manager (PM) or Workspace Admin
export const updateSprint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, goal, startDate, endDate } = req.body;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    const authorized = await isAuthorizedPM(sprint.workspaceId, sprint.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can update sprint details.' }
      });
    }

    if (name !== undefined) sprint.name = name.trim();
    if (goal !== undefined) sprint.goal = goal.trim();
    if (startDate !== undefined) sprint.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) sprint.endDate = endDate ? new Date(endDate) : null;

    await sprint.save();

    res.status(200).json({
      success: true,
      message: 'Sprint updated successfully.',
      data: { sprint }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Start planned sprint (enforces single active sprint - DEC-010)
// @route   PATCH /api/v1/sprints/:id/start
// @access  Project Manager (PM) or Workspace Admin
export const startSprintHandler = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    const authorized = await isAuthorizedPM(sprint.workspaceId, sprint.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can start sprints.' }
      });
    }

    const updated = await startSprint(sprint._id, sprint.projectId);

    res.status(200).json({
      success: true,
      message: `Sprint '${updated.name}' is now active.`,
      data: { sprint: updated }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    next(error);
  }
};

// @desc    Complete active sprint with automated rollover (DEC-010)
// @route   PATCH /api/v1/sprints/:id/complete
// @access  Project Manager (PM) or Workspace Admin
export const completeSprintHandler = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rolloverTarget = 'backlog', targetSprintId = null } = req.body;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    const authorized = await isAuthorizedPM(sprint.workspaceId, sprint.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can complete sprints.' }
      });
    }

    const result = await completeSprint(sprint._id, sprint.projectId, {
      rolloverTarget,
      targetSprintId
    });

    res.status(200).json({
      success: true,
      message: `Sprint '${sprint.name}' completed. ${result.rolledOverTasksCount} unfinished tasks rolled over to ${result.rolloverDestination}.`,
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message }
      });
    }
    next(error);
  }
};

// @desc    Delete planned sprint
// @route   DELETE /api/v1/sprints/:id
// @access  Project Manager (PM) or Workspace Admin
export const deleteSprint = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    const authorized = await isAuthorizedPM(sprint.workspaceId, sprint.projectId, req.user._id);
    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can delete sprints.' }
      });
    }

    if (sprint.status === 'active') {
      return res.status(400).json({
        success: false,
        error: { code: 'CANNOT_DELETE_ACTIVE_SPRINT', message: 'Cannot delete an active sprint. Complete it first.' }
      });
    }

    await Sprint.findByIdAndDelete(sprint._id);

    res.status(200).json({
      success: true,
      message: `Sprint '${sprint.name}' deleted successfully.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get velocity and completion report for sprint
// @route   GET /api/v1/sprints/:id/report
// @access  Project Viewer or higher
export const getSprintReport = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    const report = await getSprintReportData(sprint._id, sprint.projectId);

    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};
