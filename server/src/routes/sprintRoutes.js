import express from 'express';
import {
  createSprint,
  getProjectSprints,
  getSprintById,
  updateSprint,
  startSprintHandler,
  completeSprintHandler,
  deleteSprint,
  getSprintReport
} from '../controllers/sprintController.js';
import { getSprintBurndown } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/auth.js';

// Router 1: Project-scoped sprint routes (/api/v1/projects/:projectId/sprints)
export const projectSprintRouter = express.Router({ mergeParams: true });
projectSprintRouter.use(requireAuth);

projectSprintRouter.post('/', createSprint);
projectSprintRouter.get('/', getProjectSprints);

// Router 2: Direct sprint routes (/api/v1/sprints)
export const directSprintRouter = express.Router();
directSprintRouter.use(requireAuth);

directSprintRouter.get('/:id', getSprintById);
directSprintRouter.get('/:id/report', getSprintReport);
directSprintRouter.get('/:id/burndown', getSprintBurndown);
directSprintRouter.patch('/:id', updateSprint);
directSprintRouter.patch('/:id/start', startSprintHandler);
directSprintRouter.patch('/:id/complete', completeSprintHandler);
directSprintRouter.delete('/:id', deleteSprint);

export default directSprintRouter;
