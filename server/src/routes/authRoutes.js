import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  register,
  login,
  logout,
  getMe,
  updateProfile,
  changePassword
} from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../validators/validate.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} from '../validators/authValidators.js';

const router = express.Router();

// Strict Rate Limiting for Authentication Boundaries (OWASP A07 Defense)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    }
  }
});

// Public Authentication Endpoints
router.post('/register', authLimiter, validateBody(registerSchema), register);
router.post('/login', authLimiter, validateBody(loginSchema), login);
router.post('/logout', logout);

// Authenticated Account Endpoints
router.get('/me', requireAuth, getMe);
router.patch('/profile', requireAuth, validateBody(updateProfileSchema), updateProfile);
router.post('/change-password', requireAuth, validateBody(changePasswordSchema), changePassword);

export default router;
