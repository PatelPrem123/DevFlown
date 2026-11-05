import Sprint from '../models/Sprint.js';
import Task from '../models/Task.js';
import { emitToProject } from '../sockets/socketManager.js';

/**
 * Starts a planned sprint and freezes committed story points (DEC-010)
 */
export const startSprint = async (sprintId, projectId) => {
  const sprint = await Sprint.findOne({ _id: sprintId, projectId });
  if (!sprint) {
    const error = new Error('Sprint not found.');
    error.statusCode = 404;
    error.code = 'SPRINT_NOT_FOUND';
    throw error;
  }

  if (sprint.status !== 'planned') {
    const error = new Error(`Cannot start sprint in '${sprint.status}' state. Only planned sprints can be started.`);
    error.statusCode = 400;
    error.code = 'SPRINT_NOT_PLANNED';
    throw error;
  }

  // Single active sprint constraint (DEC-010)
  const activeSprintExists = await Sprint.exists({
    projectId,
    status: 'active'
  });

  if (activeSprintExists) {
    const error = new Error('Another sprint is already active in this project. Complete it first before launching a new sprint.');
    error.statusCode = 400;
    error.code = 'ACTIVE_SPRINT_EXISTS';
    throw error;
  }

  // Calculate committed story points from allocated tasks
  const tasks = await Task.find({ sprintId: sprint._id, projectId });
  const totalStoryPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  sprint.status = 'active';
  sprint.startedAt = new Date();
  sprint.totalStoryPoints = totalStoryPoints;
  if (!sprint.startDate) {
    sprint.startDate = new Date();
  }

  await sprint.save();

  // Broadcast real-time sprint activation across WebSocket mesh
  emitToProject(projectId, 'sprint:started', sprint);

  return sprint;
};

/**
 * Completes an active sprint with automated task rollover to backlog or next sprint (DEC-010)
 */
export const completeSprint = async (
  sprintId,
  projectId,
  { rolloverTarget = 'backlog', targetSprintId = null } = {}
) => {
  const sprint = await Sprint.findOne({ _id: sprintId, projectId });
  if (!sprint) {
    const error = new Error('Sprint not found.');
    error.statusCode = 404;
    error.code = 'SPRINT_NOT_FOUND';
    throw error;
  }

  if (sprint.status !== 'active') {
    const error = new Error(`Cannot complete sprint in '${sprint.status}' state. Only active sprints can be completed.`);
    error.statusCode = 400;
    error.code = 'SPRINT_NOT_ACTIVE';
    throw error;
  }

  // Fetch all tasks in sprint
  const tasks = await Task.find({ sprintId: sprint._id, projectId });

  const completedTasks = tasks.filter((t) => t.status === 'done');
  const incompleteTasks = tasks.filter((t) => t.status !== 'done');

  const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  // Automated Task Rollover Engine
  let rolloverDestination = 'backlog';
  if (incompleteTasks.length > 0) {
    if (rolloverTarget === 'next_sprint' && targetSprintId) {
      const targetSprint = await Sprint.findOne({
        _id: targetSprintId,
        projectId,
        status: { $ne: 'completed' }
      });

      if (!targetSprint) {
        const error = new Error('Target sprint for rollover not found or is already completed.');
        error.statusCode = 400;
        error.code = 'INVALID_ROLLOVER_TARGET';
        throw error;
      }

      await Task.updateMany(
        { _id: { $in: incompleteTasks.map((t) => t._id) } },
        { $set: { sprintId: targetSprint._id } }
      );
      rolloverDestination = targetSprint.name;
    } else {
      // Default rollover to backlog (sprintId = null)
      await Task.updateMany(
        { _id: { $in: incompleteTasks.map((t) => t._id) } },
        { $set: { sprintId: null } }
      );
      rolloverDestination = 'backlog';
    }
  }

  sprint.status = 'completed';
  sprint.completedAt = new Date();
  sprint.completedStoryPoints = completedPoints;
  await sprint.save();

  // Broadcast completion event
  emitToProject(projectId, 'sprint:completed', {
    sprintId: sprint._id,
    name: sprint.name,
    completedStoryPoints: completedPoints,
    rolledOverTasksCount: incompleteTasks.length,
    rolloverDestination
  });

  return {
    sprint,
    completedPoints,
    totalTasksCount: tasks.length,
    completedTasksCount: completedTasks.length,
    rolledOverTasksCount: incompleteTasks.length,
    rolloverDestination
  };
};

/**
 * Computes velocity and completion telemetry for a sprint
 */
export const getSprintReportData = async (sprintId, projectId) => {
  const sprint = await Sprint.findOne({ _id: sprintId, projectId }).lean();
  if (!sprint) {
    const error = new Error('Sprint not found.');
    error.statusCode = 404;
    error.code = 'SPRINT_NOT_FOUND';
    throw error;
  }

  const tasks = await Task.find({ sprintId: sprint._id, projectId })
    .populate('assigneeId', 'name email avatar')
    .sort({ orderIndex: 1 })
    .lean();

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done');
  const remainingTasks = tasks.filter((t) => t.status !== 'done');

  const totalPoints = sprint.totalStoryPoints || tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = sprint.status === 'completed'
    ? sprint.completedStoryPoints
    : completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const completionPercentage = totalPoints > 0
    ? Math.min(100, Math.round((completedPoints / totalPoints) * 100))
    : totalTasks > 0
    ? Math.min(100, Math.round((completedTasks.length / totalTasks) * 100))
    : 0;

  return {
    sprint,
    metrics: {
      totalTasks,
      completedTasksCount: completedTasks.length,
      remainingTasksCount: remainingTasks.length,
      totalStoryPoints: totalPoints,
      completedStoryPoints: completedPoints,
      remainingStoryPoints: Math.max(0, totalPoints - completedPoints),
      completionPercentage
    },
    tasksByStatus: {
      done: completedTasks,
      remaining: remainingTasks
    }
  };
};
