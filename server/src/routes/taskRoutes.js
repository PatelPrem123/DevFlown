import express from 'express';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask
} from '../controllers/taskController.js';
import { moveTask } from '../controllers/kanbanController.js';
import { getTaskActivity } from '../controllers/activityController.js';
import { taskCommentRouter } from './commentRoutes.js';
import { requireAuth } from '../middleware/auth.js';
import { requireProjectRole } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../validators/validate.js';
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  taskFilterQuerySchema
} from '../validators/taskValidators.js';
import { PROJECT_ROLES } from '../config/constants.js';

// Router 1: Project-scoped task endpoints (/api/v1/projects/:projectId/tasks)
export const projectTaskRouter = express.Router({ mergeParams: true });
projectTaskRouter.use(requireAuth);

projectTaskRouter.post(
  '/',
  requireProjectRole(PROJECT_ROLES.DEVELOPER),
  validateBody(createTaskSchema),
  createTask
);

projectTaskRouter.get(
  '/',
  requireProjectRole(PROJECT_ROLES.VIEWER),
  validateQuery(taskFilterQuerySchema),
  getTasks
);

// Router 2: Direct task endpoints (/api/v1/tasks/:id)
export const directTaskRouter = express.Router();
directTaskRouter.use(requireAuth);

// Mount task comments sub-router (/api/v1/tasks/:taskId/comments)
directTaskRouter.use('/:taskId/comments', taskCommentRouter);

directTaskRouter.get('/:id', getTaskById);
directTaskRouter.get('/:id/activity', getTaskActivity);
directTaskRouter.patch('/:id/move', validateBody(moveTaskSchema), moveTask);
directTaskRouter.patch('/:id', validateBody(updateTaskSchema), updateTask);
directTaskRouter.delete('/:id', deleteTask);

export default directTaskRouter;
