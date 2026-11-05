import { WORKSPACE_ROLES, PROJECT_ROLES } from '../config/constants.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';

const WORKSPACE_ROLE_RANKS = {
  [WORKSPACE_ROLES.GUEST]: 1,
  [WORKSPACE_ROLES.MEMBER]: 2,
  [WORKSPACE_ROLES.ADMIN]: 3
};

const PROJECT_ROLE_RANKS = {
  [PROJECT_ROLES.VIEWER]: 1,
  [PROJECT_ROLES.DEVELOPER]: 2,
  [PROJECT_ROLES.PROJECT_MANAGER]: 3
};

/**
 * Two-Tier RBAC: Workspace-Level Authorization Guard (DEC-004)
 * Ensures caller is a verified member of the workspace with sufficient role privileges
 */
export const requireWorkspaceRole = (minRole = WORKSPACE_ROLES.MEMBER) => {
  return async (req, res, next) => {
    try {
      const workspaceId =
        req.params.workspaceId ||
        req.params.id ||
        req.body.workspaceId ||
        req.query.workspaceId ||
        req.headers['x-workspace-id'];

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_WORKSPACE_ID',
            message: 'A valid workspace identifier must be provided in request parameters or headers.'
          }
        });
      }

      // Check if workspace exists
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'WORKSPACE_NOT_FOUND',
            message: 'The requested workspace does not exist.'
          }
        });
      }

      // Check user membership (BOLA Defense)
      const membership = await WorkspaceMembership.findOne({
        workspaceId,
        userId: req.user._id
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_WORKSPACE_ACCESS',
            message: 'You are not a member of this workspace. Access denied.'
          }
        });
      }

      // Role Rank Evaluation
      const userRank = WORKSPACE_ROLE_RANKS[membership.role] || 0;
      const requiredRank = WORKSPACE_ROLE_RANKS[minRole] || 2;

      if (userRank < requiredRank) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `This action requires '${minRole}' role privileges in the workspace. Your role is '${membership.role}'.`
          }
        });
      }

      req.workspace = workspace;
      req.workspaceMembership = membership;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Two-Tier RBAC: Project-Level Authorization Guard (DEC-004)
 * Validates workspace membership and enforces granular project roles (PM, Developer, Viewer)
 */
export const requireProjectRole = (minRole = PROJECT_ROLES.VIEWER) => {
  return async (req, res, next) => {
    try {
      const projectId =
        req.params.projectId ||
        req.params.id ||
        req.body.projectId ||
        req.query.projectId ||
        req.headers['x-project-id'];

      if (!projectId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_PROJECT_ID',
            message: 'A valid project identifier must be provided in request parameters or headers.'
          }
        });
      }

      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'PROJECT_NOT_FOUND',
            message: 'The requested project does not exist.'
          }
        });
      }

      // 1. First Tier: Validate caller belongs to the parent Workspace
      const workspaceMembership = await WorkspaceMembership.findOne({
        workspaceId: project.workspaceId,
        userId: req.user._id
      });

      if (!workspaceMembership) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_WORKSPACE_ACCESS',
            message: 'You are not a member of the workspace containing this project.'
          }
        });
      }

      // 2. Workspace Administrators possess universal PM-level authority across projects
      if (workspaceMembership.role === WORKSPACE_ROLES.ADMIN) {
        req.project = project;
        req.projectMembership = {
          role: PROJECT_ROLES.PROJECT_MANAGER,
          isWorkspaceAdminOverride: true
        };
        return next();
      }

      // 3. Second Tier: Project-Specific Membership & Visibility
      const projectMembership = await ProjectMembership.findOne({
        projectId: project._id,
        userId: req.user._id
      });

      // If user is not an explicit project member
      if (!projectMembership) {
        // If project is public AND requested action is read-only (viewer) AND user is standard workspace member
        if (
          project.visibility === 'public' &&
          minRole === PROJECT_ROLES.VIEWER &&
          workspaceMembership.role !== WORKSPACE_ROLES.GUEST
        ) {
          req.project = project;
          req.projectMembership = { role: PROJECT_ROLES.VIEWER, isPublicAccess: true };
          return next();
        }

        // Otherwise reject access (BOLA Defense)
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN_PROJECT_ACCESS',
            message: 'You are not a member of this project and do not have access privileges.'
          }
        });
      }

      // Evaluate Project Role Rank
      const userRank = PROJECT_ROLE_RANKS[projectMembership.role] || 0;
      const requiredRank = PROJECT_ROLE_RANKS[minRole] || 1;

      if (userRank < requiredRank) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PROJECT_PERMISSIONS',
            message: `This action requires '${minRole}' privileges in this project. Your current role is '${projectMembership.role}'.`
          }
        });
      }

      req.project = project;
      req.projectMembership = projectMembership;
      next();
    } catch (error) {
      next(error);
    }
  };
};
