import express from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import workspaceRoutes from './workspaceRoutes.js';
import projectRoutes from './projectRoutes.js';
import directTaskRouter from './taskRoutes.js';
import { directCommentRouter } from './commentRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import githubRoutes from './githubRoutes.js';
import directSprintRouter from './sprintRoutes.js';
import directMilestoneRouter from './milestoneRoutes.js';

const router = express.Router();

// Mount API v1 Routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', directTaskRouter);
router.use('/comments', directCommentRouter);
router.use('/notifications', notificationRoutes);
router.use('/github', githubRoutes);
router.use('/sprints', directSprintRouter);
router.use('/milestones', directMilestoneRouter);

export default router;
