import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128, 'Password cannot exceed 128 characters')
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address'),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  avatar: z.string().url('Avatar must be a valid URL').or(z.literal('')).optional(),
  githubUsername: z.string().trim().max(100).nullable().optional()
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long').max(128)
});
