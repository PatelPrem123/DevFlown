import Sprint from '../models/Sprint.js';
import Task from '../models/Task.js';
import ProjectMembership from '../models/ProjectMembership.js';
import ActivityLog from '../models/ActivityLog.js';

/**
 * Computes mathematical sprint burndown trajectory (DEC-010)
 * Ideal curve: Ideal(t) = TotalPoints - (TotalPoints / D * t)
 * Actual curve: Calculated from task completion timestamps across sprint days
 */
export const calculateBurndownCurve = async (sprintId, projectId) => {
  const sprint = await Sprint.findOne({ _id: sprintId, projectId }).lean();
  if (!sprint) {
    const error = new Error('Sprint not found.');
    error.statusCode = 404;
    error.code = 'SPRINT_NOT_FOUND';
    throw error;
  }

  const tasks = await Task.find({ sprintId: sprint._id, projectId }).lean();

  const totalPoints = sprint.totalStoryPoints || tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const startDate = sprint.startedAt || sprint.startDate || sprint.createdAt;
  const endDate = sprint.completedAt || sprint.endDate || new Date(new Date(startDate).getTime() + 14 * 24 * 60 * 60 * 1000);

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Total duration in days (minimum 1 day to prevent division by zero)
  const diffTime = Math.max(end.getTime() - start.getTime(), 86400000);
  const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const burnData = [];
  const dailyBurnRate = totalPoints / totalDays;

  const now = new Date();

  for (let day = 0; day <= totalDays; day++) {
    const currentDayDate = new Date(start.getTime() + day * 24 * 60 * 60 * 1000);
    const dayLabel = `Day ${day} (${currentDayDate.toISOString().slice(5, 10)})`;

    // Mathematical Ideal Burn line: Ideal(t) = TotalPoints - (dailyBurnRate * t)
    const idealRemaining = Math.max(0, Math.round((totalPoints - dailyBurnRate * day) * 10) / 10);

    // Actual Remaining: Tasks whose status was NOT 'done' by currentDayDate
    let actualRemaining = null;
    if (currentDayDate <= now || sprint.status === 'completed') {
      const remainingTasks = tasks.filter((t) => {
        if (t.status !== 'done') return true;
        // If task was marked done after this date, it was still remaining on this date
        const doneDate = t.updatedAt ? new Date(t.updatedAt) : new Date(t.createdAt);
        return doneDate > currentDayDate;
      });
      actualRemaining = remainingTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    }

    burnData.push({
      day,
      date: currentDayDate.toISOString().slice(0, 10),
      label: dayLabel,
      ideal: idealRemaining,
      actual: actualRemaining
    });
  }

  return {
    sprint: {
      id: sprint._id,
      name: sprint.name,
      status: sprint.status,
      totalStoryPoints: totalPoints,
      completedStoryPoints: sprint.completedStoryPoints,
      totalDays
    },
    burnData
  };
};

/**
 * Computes historical sprint velocity metrics across past completed sprints
 */
export const calculateProjectVelocity = async (projectId) => {
  const completedSprints = await Sprint.find({
    projectId,
    status: 'completed'
  })
    .sort({ completedAt: 1 })
    .select('name totalStoryPoints completedStoryPoints startedAt completedAt')
    .lean();

  const velocityHistory = completedSprints.map((s) => ({
    sprintId: s._id,
    name: s.name,
    committedPoints: s.totalStoryPoints || 0,
    completedPoints: s.completedStoryPoints || 0,
    completionRate: s.totalStoryPoints > 0 ? Math.round((s.completedStoryPoints / s.totalStoryPoints) * 100) : 0
  }));

  const totalCompletedPoints = velocityHistory.reduce((sum, s) => sum + s.completedPoints, 0);
  const averageVelocity = velocityHistory.length > 0 ? Math.round(totalCompletedPoints / velocityHistory.length) : 0;

  return {
    averageVelocity,
    totalCompletedSprints: completedSprints.length,
    velocityHistory
  };
};

/**
 * Computes workload distribution per developer across project tasks
 */
export const calculateDeveloperWorkload = async (projectId) => {
  const members = await ProjectMembership.find({ projectId })
    .populate('userId', 'name email avatar')
    .lean();

  const tasks = await Task.find({ projectId }).lean();

  const workload = members.map((m) => {
    const user = m.userId;
    const userTasks = tasks.filter((t) => t.assigneeId && t.assigneeId.toString() === user._id.toString());
    const openTasks = userTasks.filter((t) => t.status !== 'done');
    const completedTasks = userTasks.filter((t) => t.status === 'done');
    const totalPoints = userTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const openPoints = openTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    const completedPoints = completedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    const now = new Date();
    const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);

    return {
      userId: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: m.role,
      totalAssignedTasks: userTasks.length,
      openTasksCount: openTasks.length,
      completedTasksCount: completedTasks.length,
      overdueTasksCount: overdueTasks.length,
      totalStoryPoints: totalPoints,
      openStoryPoints: openPoints,
      completedStoryPoints: completedPoints
    };
  });

  // Also include unassigned tasks pool
  const unassignedTasks = tasks.filter((t) => !t.assigneeId);
  const unassignedPoints = unassignedTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return {
    workload,
    unassigned: {
      count: unassignedTasks.length,
      storyPoints: unassignedPoints
    }
  };
};

/**
 * Computes status and priority distribution statistics
 */
export const calculateTaskDistribution = async (projectId) => {
  const tasks = await Task.find({ projectId }).lean();

  const statusDistribution = {
    backlog: { count: 0, storyPoints: 0 },
    to_do: { count: 0, storyPoints: 0 },
    in_progress: { count: 0, storyPoints: 0 },
    review: { count: 0, storyPoints: 0 },
    done: { count: 0, storyPoints: 0 }
  };

  const priorityDistribution = {
    urgent: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  for (const t of tasks) {
    if (statusDistribution[t.status]) {
      statusDistribution[t.status].count += 1;
      statusDistribution[t.status].storyPoints += t.storyPoints || 0;
    }
    if (priorityDistribution[t.priority] !== undefined) {
      priorityDistribution[t.priority] += 1;
    }
  }

  return {
    totalTasks: tasks.length,
    statusDistribution,
    priorityDistribution
  };
};
