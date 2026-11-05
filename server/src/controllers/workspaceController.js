import crypto from 'crypto';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import User from '../models/User.js';
import Invitation from '../models/Invitation.js';
import { WORKSPACE_ROLES } from '../config/constants.js';

const generateUniqueSlug = async (name) => {
  let baseSlug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!baseSlug) baseSlug = 'workspace';

  let slug = baseSlug;
  let counter = 1;

  while (await Workspace.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// @desc    Get all workspaces accessible to caller
// @route   GET /api/v1/workspaces
// @access  Authenticated
export const getMyWorkspaces = async (req, res, next) => {
  try {
    const memberships = await WorkspaceMembership.find({ userId: req.user._id })
      .populate('workspaceId', 'name slug description plan ownerId createdAt')
      .lean();

    const workspaces = memberships
      .filter(m => m.workspaceId)
      .map(m => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        slug: m.workspaceId.slug,
        description: m.workspaceId.description,
        plan: m.workspaceId.plan,
        isOwner: m.workspaceId.ownerId.toString() === req.user._id.toString(),
        role: m.role,
        joinedAt: m.joinedAt
      }));

    res.status(200).json({
      success: true,
      data: {
        workspaces
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new workspace tenant
// @route   POST /api/v1/workspaces
// @access  Authenticated
export const createWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    let { slug } = req.body;

    if (!slug) {
      slug = await generateUniqueSlug(name);
    } else {
      const slugExists = await Workspace.exists({ slug });
      if (slugExists) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'SLUG_ALREADY_EXISTS',
            message: `Workspace slug '${slug}' is already taken. Please choose another.`
          }
        });
      }
    }

    const workspace = await Workspace.create({
      name,
      slug,
      ownerId: req.user._id,
      description: description || ''
    });

    // Create admin membership for the creator
    await WorkspaceMembership.create({
      workspaceId: workspace._id,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    res.status(201).json({
      success: true,
      message: 'Workspace created successfully.',
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          plan: workspace.plan,
          isOwner: true,
          role: WORKSPACE_ROLES.ADMIN,
          createdAt: workspace.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get workspace details by ID
// @route   GET /api/v1/workspaces/:id
// @access  Workspace Member
export const getWorkspaceById = async (req, res, next) => {
  try {
    const workspace = req.workspace;
    const membership = req.workspaceMembership;

    const memberCount = await WorkspaceMembership.countDocuments({ workspaceId: workspace._id });

    res.status(200).json({
      success: true,
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description,
          plan: workspace.plan,
          isOwner: workspace.ownerId.toString() === req.user._id.toString(),
          role: membership.role,
          memberCount,
          createdAt: workspace.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update workspace metadata
// @route   PATCH /api/v1/workspaces/:id
// @access  Workspace Administrator
export const updateWorkspace = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const workspace = req.workspace;

    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;

    await workspace.save();

    res.status(200).json({
      success: true,
      message: 'Workspace settings updated successfully.',
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          description: workspace.description
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List members of a workspace
// @route   GET /api/v1/workspaces/:id/members
// @access  Workspace Member
export const getWorkspaceMembers = async (req, res, next) => {
  try {
    const memberships = await WorkspaceMembership.find({ workspaceId: req.workspace._id })
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

// @desc    Invite a user to the workspace
// @route   POST /api/v1/workspaces/:id/invitations
// @access  Workspace Administrator
export const inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const workspace = req.workspace;

    // Check if target user already exists in DevFlow
    const targetUser = await User.findOne({ email });

    if (targetUser) {
      // Check if already a member of this workspace
      const existingMembership = await WorkspaceMembership.findOne({
        workspaceId: workspace._id,
        userId: targetUser._id
      });

      if (existingMembership) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'MEMBER_ALREADY_EXISTS',
            message: `User with email '${email}' is already a member of this workspace.`
          }
        });
      }

      // Add to workspace membership directly
      const membership = await WorkspaceMembership.create({
        workspaceId: workspace._id,
        userId: targetUser._id,
        role: role || WORKSPACE_ROLES.MEMBER
      });

      return res.status(201).json({
        success: true,
        message: `User '${targetUser.name}' added directly to workspace as '${membership.role}'.`,
        data: {
          member: {
            id: targetUser._id,
            name: targetUser.name,
            email: targetUser.email,
            role: membership.role,
            joinedAt: membership.joinedAt
          }
        }
      });
    }

    // Otherwise create Invitation record for pending user registration
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitation = await Invitation.create({
      workspaceId: workspace._id,
      email,
      role: role || WORKSPACE_ROLES.MEMBER,
      invitedBy: req.user._id,
      token: invitationToken
    });

    res.status(201).json({
      success: true,
      message: `Invitation generated for '${email}'.`,
      data: {
        invitation: {
          id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
          expiresAt: invitation.expiresAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove a member from the workspace
// @route   DELETE /api/v1/workspaces/:id/members/:userId
// @access  Workspace Administrator
export const removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const workspace = req.workspace;

    if (workspace.ownerId.toString() === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_OWNER',
          message: 'The workspace owner cannot be removed from their own workspace.'
        }
      });
    }

    const deleted = await WorkspaceMembership.findOneAndDelete({
      workspaceId: workspace._id,
      userId
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MEMBERSHIP_NOT_FOUND',
          message: 'Specified user is not a member of this workspace.'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Member removed from workspace successfully.'
    });
  } catch (error) {
    next(error);
  }
};
