import Project from '../models/Project.js';
import Sprint from '../models/Sprint.js';
import {
  calculateBurndownCurve,
  calculateProjectVelocity,
  calculateDeveloperWorkload,
  calculateTaskDistribution
} from '../services/analyticsService.js';
import {
  exportTasksToCSV,
  exportTasksToExcel
} from '../services/exportService.js';

// @desc    Get sprint mathematical burndown trajectory (DEC-010)
// @route   GET /api/v1/sprints/:id/burndown
// @access  Project Viewer or higher
export const getSprintBurndown = async (req, res, next) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id);
    if (!sprint) {
      return res.status(404).json({
        success: false,
        error: { code: 'SPRINT_NOT_FOUND', message: 'Sprint not found.' }
      });
    }

    const burndown = await calculateBurndownCurve(sprint._id, sprint.projectId);

    res.status(200).json({
      success: true,
      data: burndown
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project velocity metrics across past sprints
// @route   GET /api/v1/projects/:id/analytics/velocity
// @access  Project Viewer or higher
export const getProjectVelocityMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    const velocity = await calculateProjectVelocity(project._id);

    res.status(200).json({
      success: true,
      data: velocity
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get developer workload and story point distribution
// @route   GET /api/v1/projects/:id/analytics/workload
// @access  Project Viewer or higher
export const getDeveloperWorkloadMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    const workload = await calculateDeveloperWorkload(project._id);

    res.status(200).json({
      success: true,
      data: workload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get task status and priority distribution breakdown
// @route   GET /api/v1/projects/:id/analytics/distribution
// @access  Project Viewer or higher
export const getTaskDistributionMetrics = async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    const distribution = await calculateTaskDistribution(project._id);

    res.status(200).json({
      success: true,
      data: distribution
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export project tasks to CSV or Excel (.xlsx)
// @route   GET /api/v1/projects/:id/export
// @access  Project Viewer or higher
export const exportProjectTasks = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'csv' } = req.query;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    const sanitizedKey = project.key.toLowerCase();

    if (format === 'xlsx' || format === 'excel') {
      const buffer = await exportTasksToExcel(project._id);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedKey}-tasks-${timestamp}.xlsx"`);
      return res.send(buffer);
    }

    // Default to CSV
    const csvData = await exportTasksToCSV(project._id);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedKey}-tasks-${timestamp}.csv"`);
    return res.status(200).send(csvData);
  } catch (error) {
    next(error);
  }
};
