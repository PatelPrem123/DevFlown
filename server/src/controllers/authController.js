import crypto from 'crypto';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/token.js';
import { WORKSPACE_ROLES } from '../config/constants.js';

/**
 * Generate a URL-safe, unique slug from a workspace name
 */
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

// @desc    Register a new user & auto-provision default workspace
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address is already registered.'
        }
      });
    }

    // 1. Create User
    const user = await User.create({
      name,
      email,
      password
    });

    // 2. Auto-provision default personal workspace
    const workspaceName = `${name.split(' ')[0]}'s Workspace`;
    const slug = await generateUniqueSlug(workspaceName);

    const defaultWorkspace = await Workspace.create({
      name: workspaceName,
      slug,
      ownerId: user._id,
      description: `Default personal workspace for ${name}`
    });

    // 3. Create WorkspaceMembership as Administrator
    await WorkspaceMembership.create({
      workspaceId: defaultWorkspace._id,
      userId: user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    // 4. Generate JWT & Set HttpOnly Cookie
    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully with default workspace provisioned.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          githubUsername: user.githubUsername,
          createdAt: user.createdAt
        },
        defaultWorkspace: {
          id: defaultWorkspace._id,
          name: defaultWorkspace.name,
          slug: defaultWorkspace.slug,
          role: WORKSPACE_ROLES.ADMIN
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & set session cookie
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Fetch user and explicitly select password hash
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password provided.'
        }
      });
    }

    // Verify password hash with bcrypt
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email address or password provided.'
        }
      });
    }

    // Fetch user's workspaces
    const memberships = await WorkspaceMembership.find({ userId: user._id })
      .populate('workspaceId', 'name slug description plan')
      .lean();

    const workspaces = memberships
      .filter(m => m.workspaceId)
      .map(m => ({
        id: m.workspaceId._id,
        name: m.workspaceId.name,
        slug: m.workspaceId.slug,
        description: m.workspaceId.description,
        plan: m.workspaceId.plan,
        role: m.role
      }));

    // Generate JWT & Set HttpOnly Cookie
    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Authentication successful.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          githubUsername: user.githubUsername,
          createdAt: user.createdAt
        },
        workspaces,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear session cookie and log out
// @route   POST /api/v1/auth/logout
// @access  Public
export const logout = (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({
    success: true,
    message: 'User logged out successfully and session cookie cleared.'
  });
};

// @desc    Get currently authenticated user & accessible workspaces
// @route   GET /api/v1/auth/me
// @access  Authenticated
export const getMe = async (req, res, next) => {
  try {
    const memberships = await WorkspaceMembership.find({ userId: req.user._id })
      .populate('workspaceId', 'name slug description plan ownerId')
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
        role: m.role
      }));

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          avatar: req.user.avatar,
          githubUsername: req.user.githubUsername,
          createdAt: req.user.createdAt
        },
        workspaces
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile details
// @route   PATCH /api/v1/auth/profile
// @access  Authenticated
export const updateProfile = async (req, res, next) => {
  try {
    const { name, avatar, githubUsername } = req.body;
    const user = req.user;

    if (name !== undefined) user.name = name;
    if (avatar !== undefined) user.avatar = avatar;
    if (githubUsername !== undefined) user.githubUsername = githubUsername;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          githubUsername: user.githubUsername
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user account password
// @route   POST /api/v1/auth/change-password
// @access  Authenticated
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CURRENT_PASSWORD',
          message: 'The current password you provided does not match our records.'
        }
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Account password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
};
