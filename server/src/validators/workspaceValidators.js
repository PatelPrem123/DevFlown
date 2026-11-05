import { z } from 'zod';
import { WORKSPACE_ROLES } from '../config/constants.js';

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, 'Workspace name must be at least 2 characters long').max(100, 'Workspace name cannot exceed 100 characters'),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens').min(2).max(50).optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional()
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(500).optional()
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email address to invite'),
  role: z.enum([WORKSPACE_ROLES.ADMIN, WORKSPACE_ROLES.MEMBER, WORKSPACE_ROLES.GUEST]).default(WORKSPACE_ROLES.MEMBER)
});
