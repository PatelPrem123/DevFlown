import express from 'express';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember
} from '../controllers/projectController.js';
import { getProjectBoard } from '../controllers/kanbanController.js';
import { getProjectActivity } from '../controllers/activityController.js';
import {
  getProjectVelocityMetrics,
  getDeveloperWorkloadMetrics,
  getTaskDistributionMetrics,
  exportProjectTasks
} from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { validateBody } from '../validators/validate.js';
import {
  createProjectSchema,
  updateProjectSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema
} from '../validators/projectValidators.js';
import { PROJECT_ROLES } from '../config/constants.js';
import { projectTaskRouter } from './taskRoutes.js';
import { projectSprintRouter } from './sprintRoutes.js';
import { projectMilestoneRouter } from './milestoneRoutes.js';

const router = express.Router();

// Mount project-scoped sub-routers
router.use('/:projectId/tasks', projectTaskRouter);
router.use('/:projectId/sprints', projectSprintRouter);
router.use('/:projectId/milestones', projectMilestoneRouter);

// Require authenticated user for all project endpoints
router.use(requireAuth);

// Project creation and listing
router.post('/', validateBody(createProjectSchema), createProject);
router.get('/', getProjects);

// Project specific endpoints
router.get('/:id', requireProjectRole(PROJECT_ROLES.VIEWER), getProjectById);
router.get('/:id/board', requireProjectRole(PROJECT_ROLES.VIEWER), getProjectBoard);
router.get('/:id/activity', requireProjectRole(PROJECT_ROLES.VIEWER), getProjectActivity);
router.patch('/:id', requireProjectRole(PROJECT_ROLES.PROJECT_MANAGER), validateBody(updateProjectSchema), updateProject);
router.delete('/:id', requireProjectRole(PROJECT_ROLES.PROJECT_MANAGER), deleteProject);

// Project member management
router.get('/:id/members', requireProjectRole(PROJECT_ROLES.VIEWER), getProjectMembers);
router.post('/:id/members', requireProjectRole(PROJECT_ROLES.PROJECT_MANAGER), validateBody(addProjectMemberSchema), addProjectMember);
router.patch('/:id/members/:userId', requireProjectRole(PROJECT_ROLES.PROJECT_MANAGER), validateBody(updateProjectMemberRoleSchema), updateProjectMemberRole);
router.delete('/:id/members/:userId', requireProjectRole(PROJECT_ROLES.PROJECT_MANAGER), removeProjectMember);

// Analytics, telemetry and data export (Phase 10)
router.get('/:id/analytics/velocity', requireProjectRole(PROJECT_ROLES.VIEWER), getProjectVelocityMetrics);
router.get('/:id/analytics/workload', requireProjectRole(PROJECT_ROLES.VIEWER), getDeveloperWorkloadMetrics);
router.get('/:id/analytics/distribution', requireProjectRole(PROJECT_ROLES.VIEWER), getTaskDistributionMetrics);
router.get('/:id/export', requireProjectRole(PROJECT_ROLES.VIEWER), exportProjectTasks);

export default router;
