import express from 'express';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead
} from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/', getMyNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
