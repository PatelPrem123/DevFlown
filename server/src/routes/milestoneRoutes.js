import express from 'express';
import {
  createMilestone,
  getProjectMilestones,
  getMilestoneById,
  updateMilestone,
  toggleMilestoneStatus,
  deleteMilestone
} from '../controllers/milestoneController.js';
import { requireAuth } from '../middleware/auth.js';

// Router 1: Project-scoped milestone routes (/api/v1/projects/:projectId/milestones)
export const projectMilestoneRouter = express.Router({ mergeParams: true });
projectMilestoneRouter.use(requireAuth);

projectMilestoneRouter.post('/', createMilestone);
projectMilestoneRouter.get('/', getProjectMilestones);

// Router 2: Direct milestone routes (/api/v1/milestones)
export const directMilestoneRouter = express.Router();
directMilestoneRouter.use(requireAuth);

directMilestoneRouter.get('/:id', getMilestoneById);
directMilestoneRouter.patch('/:id', updateMilestone);
directMilestoneRouter.patch('/:id/toggle', toggleMilestoneStatus);
directMilestoneRouter.delete('/:id', deleteMilestone);

export default directMilestoneRouter;
