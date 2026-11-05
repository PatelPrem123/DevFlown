import { z } from 'zod';
import { PROJECT_ROLES, PROJECT_STATUS, PROJECT_VISIBILITY } from '../config/constants.js';

export const createProjectSchema = z.object({
  workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid workspace ID format'),
  name: z.string().trim().min(2, 'Project name must be at least 2 characters long').max(100, 'Project name cannot exceed 100 characters'),
  key: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/, 'Project key must be 2-10 uppercase alphanumeric characters (e.g. FLOW, DEV)'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional(),
  visibility: z.enum([PROJECT_VISIBILITY.PUBLIC, PROJECT_VISIBILITY.PRIVATE]).default(PROJECT_VISIBILITY.PRIVATE),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional()
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(Object.values(PROJECT_STATUS)).optional(),
  visibility: z.enum(Object.values(PROJECT_VISIBILITY)).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional()
});

export const addProjectMemberSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  role: z.enum(Object.values(PROJECT_ROLES)).default(PROJECT_ROLES.DEVELOPER)
});

export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(Object.values(PROJECT_ROLES))
});
