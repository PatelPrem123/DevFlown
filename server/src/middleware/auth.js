import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HttpOnly cookie
    if (req.cookies && req.cookies.devflow_token) {
      token = req.cookies.devflow_token;
    }
    // 2. Check Authorization Header fallback (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token is missing. Please sign in to access this resource.'
        }
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, env.JWT_SECRET);

    // Fetch user (without password)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The account associated with this session token no longer exists.'
        }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Authentication token is invalid or has expired. Please sign in again.'
        }
      });
    }
    next(error);
  }
};
