import express from 'express';
import {
  getTaskComments,
  createComment,
  deleteComment
} from '../controllers/commentController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../validators/validate.js';
import { createCommentSchema } from '../validators/commentValidators.js';

// Router 1: Task-scoped comment endpoints (/api/v1/tasks/:taskId/comments)
export const taskCommentRouter = express.Router({ mergeParams: true });
taskCommentRouter.use(requireAuth);

taskCommentRouter.get('/', getTaskComments);
taskCommentRouter.post('/', validateBody(createCommentSchema), createComment);

// Router 2: Direct comment management (/api/v1/comments/:id)
export const directCommentRouter = express.Router();
directCommentRouter.use(requireAuth);

directCommentRouter.delete('/:id', deleteComment);

export default directCommentRouter;
