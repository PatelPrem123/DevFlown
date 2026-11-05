import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN || '7d'
    }
  );
};

export const setTokenCookie = (res, token) => {
  const isProduction = env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  };

  res.cookie('devflow_token', token, cookieOptions);
};

export const clearTokenCookie = (res) => {
  res.clearCookie('devflow_token', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });
};
