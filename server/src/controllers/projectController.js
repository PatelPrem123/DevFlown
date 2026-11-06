import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import User from '../models/User.js';
import Counter from '../models/Counter.js';
import { WORKSPACE_ROLES, PROJECT_ROLES } from '../config/constants.js';

// @desc    Create a new project within a workspace
// @route   POST /api/v1/projects
// @access  Workspace Administrator
export const createProject = async (req, res, next) => {
  try {
    const { workspaceId, name, key, description, visibility, startDate, endDate } = req.body;

    // Check caller's workspace membership and role (Workspace Admin required)
    const wsMembership = await WorkspaceMembership.findOne({
      workspaceId,
      userId: req.user._id
    });

    if (!wsMembership || wsMembership.role !== WORKSPACE_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_WORKSPACE_PERMISSIONS',
          message: 'Only Workspace Administrators are authorized to create new projects.'
        }
      });
    }

    // Check for duplicate project key within this workspace
    const existingProject = await Project.findOne({
      workspaceId,
      key: key.toUpperCase()
    });

    if (existingProject) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROJECT_KEY_ALREADY_EXISTS',
          message: `A project with key '${key.toUpperCase()}' already exists in this workspace.`
        }
      });
    }

    // 1. Create Project
    const project = await Project.create({
      workspaceId,
      ownerId: req.user._id,
      name,
      key: key.toUpperCase(),
      description: description || '',
      visibility: visibility || 'private',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    // 2. Automatically bind creator as Project Manager (PM)
    await ProjectMembership.create({
      projectId: project._id,
      workspaceId,
      userId: req.user._id,
      role: PROJECT_ROLES.PROJECT_MANAGER
    });

    // 3. Initialize atomic sequence counter for task keys (DEC-005)
    await Counter.create({
      name: `project_counter_${project._id}`,
      seq: 100 // Tasks start at KEY-101
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully with Project Manager assignment.',
      data: {
        project: {
          id: project._id,
          _id: project._id,
          workspaceId: project.workspaceId,
          name: project.name,
          key: project.key,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          role: PROJECT_ROLES.PROJECT_MANAGER,
          createdAt: project.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List all projects in workspace accessible to caller
// @route   GET /api/v1/projects
// @access  Workspace Member
export const getProjects = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_WORKSPACE_ID',
          message: 'Workspace ID is required in query parameters (?workspaceId=...).'
        }
      });
    }

    // Check workspace membership
    const wsMembership = await WorkspaceMembership.findOne({
      workspaceId,
      userId: req.user._id
    });

    if (!wsMembership) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_WORKSPACE_ACCESS',
          message: 'You are not a member of this workspace.'
        }
      });
    }

    let filter = { workspaceId };

    // If caller is NOT a Workspace Admin, filter by visibility and explicit membership
    if (wsMembership.role !== WORKSPACE_ROLES.ADMIN) {
      const userProjectMemberships = await ProjectMembership.find({
        workspaceId,
        userId: req.user._id
      }).select('projectId role');

      const userProjectIds = userProjectMemberships.map(m => m.projectId);

      filter.$or = [
        { _id: { $in: userProjectIds } },
        { visibility: 'public' }
      ];
    }

    const projects = await Project.find(filter)
      .populate('ownerId', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean();

    // Map user roles for each project
    const memberships = await ProjectMembership.find({
      projectId: { $in: projects.map(p => p._id) },
      userId: req.user._id
    }).lean();

    const membershipMap = new Map(memberships.map(m => [m.projectId.toString(), m.role]));

    const projectList = projects.map(p => ({
      id: p._id,
      _id: p._id,
      name: p.name,
      key: p.key,
      description: p.description,
      status: p.status,
      visibility: p.visibility,
      owner: p.ownerId ? { id: p.ownerId._id, name: p.ownerId.name, email: p.ownerId.email } : null,
      role: wsMembership.role === WORKSPACE_ROLES.ADMIN
        ? PROJECT_ROLES.PROJECT_MANAGER
        : (membershipMap.get(p._id.toString()) || PROJECT_ROLES.VIEWER),
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt
    }));

    res.status(200).json({
      success: true,
      data: {
        projects: projectList
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed project metadata
// @route   GET /api/v1/projects/:id
// @access  Project Viewer or higher
export const getProjectById = async (req, res, next) => {
  try {
    const project = req.project;
    const memberCount = await ProjectMembership.countDocuments({ projectId: project._id });

    res.status(200).json({
      success: true,
      data: {
        project: {
          id: project._id,
          _id: project._id,
          workspaceId: project.workspaceId,
          name: project.name,
          key: project.key,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          role: req.projectMembership.role,
          memberCount,
          startDate: project.startDate,
          endDate: project.endDate,
          createdAt: project.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project metadata
// @route   PATCH /api/v1/projects/:id
// @access  Project Manager (PM)
export const updateProject = async (req, res, next) => {
  try {
    const project = req.project;
    const { name, description, status, visibility, startDate, endDate } = req.body;

    if (name !== undefined) project.name = name;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (visibility !== undefined) project.visibility = visibility;
    if (startDate !== undefined) project.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) project.endDate = endDate ? new Date(endDate) : null;

    await project.save();

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      data: {
        project: {
          id: project._id,
          name: project.name,
          key: project.key,
          description: project.description,
          status: project.status,
          visibility: project.visibility,
          startDate: project.startDate,
          endDate: project.endDate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive or Delete project
// @route   DELETE /api/v1/projects/:id
// @access  Workspace Administrator
export const deleteProject = async (req, res, next) => {
  try {
    const project = req.project;

    // Check workspace admin permission
    const wsMembership = await WorkspaceMembership.findOne({
      workspaceId: project.workspaceId,
      userId: req.user._id
    });

    if (!wsMembership || wsMembership.role !== WORKSPACE_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_PRIVILEGE_REQUIRED',
          message: 'Only Workspace Administrators can delete projects.'
        }
      });
    }

    await Project.findByIdAndDelete(project._id);
    await ProjectMembership.deleteMany({ projectId: project._id });
    await Counter.deleteOne({ name: `project_counter_${project._id}` });

    res.status(200).json({
      success: true,
      message: 'Project and associated memberships deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all members of a project
// @route   GET /api/v1/projects/:id/members
// @access  Project Viewer or higher
export const getProjectMembers = async (req, res, next) => {
  try {
    const memberships = await ProjectMembership.find({ projectId: req.project._id })
      .populate('userId', 'name email avatar githubUsername')
      .sort({ createdAt: 1 })
      .lean();

    const members = memberships
      .filter(m => m.userId)
      .map(m => ({
        id: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        avatar: m.userId.avatar,
        githubUsername: m.userId.githubUsername,
        role: m.role,
        joinedAt: m.joinedAt
      }));

    res.status(200).json({
      success: true,
      data: {
        members
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a workspace member to the project
// @route   POST /api/v1/projects/:id/members
// @access  Project Manager (PM)
export const addProjectMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;
    const project = req.project;

    // Verify target user is an existing member of the parent workspace
    const wsMembership = await WorkspaceMembership.findOne({
      workspaceId: project.workspaceId,
      userId
    });

    if (!wsMembership) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_NOT_IN_WORKSPACE',
          message: 'Target user must first be invited to the workspace before joining this project.'
        }
      });
    }

    // Check if user is already a project member
    const existing = await ProjectMembership.findOne({
      projectId: project._id,
      userId
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PROJECT_MEMBER_ALREADY_EXISTS',
          message: 'User is already an assigned member of this project.'
        }
      });
    }

    const membership = await ProjectMembership.create({
      projectId: project._id,
      workspaceId: project.workspaceId,
      userId,
      role: role || PROJECT_ROLES.DEVELOPER
    });

    const targetUser = await User.findById(userId).select('name email avatar githubUsername');

    res.status(201).json({
      success: true,
      message: `User '${targetUser.name}' assigned to project as '${membership.role}'.`,
      data: {
        member: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          avatar: targetUser.avatar,
          role: membership.role,
          joinedAt: membership.joinedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project member's role
// @route   PATCH /api/v1/projects/:id/members/:userId
// @access  Project Manager (PM)
export const updateProjectMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const membership = await ProjectMembership.findOne({
      projectId: req.project._id,
      userId
    });

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Target user is not a member of this project.'
        }
      });
    }

    membership.role = role;
    await membership.save();

    res.status(200).json({
      success: true,
      message: 'Project member role updated successfully.',
      data: {
        member: {
          userId: membership.userId,
          role: membership.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from project
// @route   DELETE /api/v1/projects/:id/members/:userId
// @access  Project Manager (PM)
export const removeProjectMember = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.project.ownerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_PROJECT_OWNER',
          message: 'The project creator/owner cannot be removed from project membership.'
        }
      });
    }

    const deleted = await ProjectMembership.findOneAndDelete({
      projectId: req.project._id,
      userId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBER_NOT_FOUND',
          message: 'Target user is not a member of this project.'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Member removed from project successfully.'
    });
  } catch (error) {
    next(error);
  }
};
