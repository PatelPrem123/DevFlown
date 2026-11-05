import express from 'express';
import {
  getMyWorkspaces,
  createWorkspace,
  getWorkspaceById,
  updateWorkspace,
  getWorkspaceMembers,
  inviteMember,
  removeMember
} from '../controllers/workspaceController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireWorkspaceRole } from '../middleware/rbac.js';
import { validateBody } from '../validators/validate.js';
import {
  createWorkspaceSchema,
  updateWorkspaceSchema,
  inviteMemberSchema
} from '../validators/workspaceValidators.js';
import { WORKSPACE_ROLES } from '../config/constants.js';

const router = express.Router();

// All workspace endpoints require an authenticated user
router.use(requireAuth);

// Workspaces list and creation
router.get('/', getMyWorkspaces);
router.post('/', validateBody(createWorkspaceSchema), createWorkspace);

// Specific Workspace details & metadata
router.get('/:id', requireWorkspaceRole(WORKSPACE_ROLES.GUEST), getWorkspaceById);
router.patch('/:id', requireWorkspaceRole(WORKSPACE_ROLES.ADMIN), validateBody(updateWorkspaceSchema), updateWorkspace);

// Members and invitations
router.get('/:id/members', requireWorkspaceRole(WORKSPACE_ROLES.GUEST), getWorkspaceMembers);
router.post('/:id/invitations', requireWorkspaceRole(WORKSPACE_ROLES.ADMIN), validateBody(inviteMemberSchema), inviteMember);
router.delete('/:id/members/:userId', requireWorkspaceRole(WORKSPACE_ROLES.ADMIN), removeMember);

export default router;
