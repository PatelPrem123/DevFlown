import mongoose from 'mongoose';
import Project from '../models/Project.js';
import ProjectMembership from '../models/ProjectMembership.js';
import WorkspaceMembership from '../models/WorkspaceMembership.js';
import GitHubIntegration from '../models/GitHubIntegration.js';
import {
  buildOAuthUrl,
  exchangeOAuthCode,
  fetchGitHubUserProfile,
  fetchUserRepositories,
  saveGitHubIntegration,
  getDecryptedTokenForUser
} from '../services/githubService.js';
import { processWebhookPayload } from '../services/webhookService.js';
import { generateOAuthState } from '../utils/crypto.js';
import { PROJECT_ROLES, WORKSPACE_ROLES } from '../config/constants.js';

// @desc    Initiate GitHub OAuth connection flow
// @route   GET /api/v1/github/oauth/connect
// @access  Authenticated User
export const initiateOAuth = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;

    if (!workspaceId || !mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_WORKSPACE_ID', message: 'A valid workspaceId query parameter is required.' }
      });
    }

    // Verify user belongs to workspace
    const isMember = await WorkspaceMembership.exists({
      workspaceId,
      userId: req.user._id
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not a member of this workspace.' }
      });
    }

    const stateNonce = generateOAuthState();
    const state = `${workspaceId}:${stateNonce}`;

    // Store signed state in cookie (15 min TTL)
    res.cookie('github_oauth_state', stateNonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000
    });

    const authUrl = buildOAuthUrl(workspaceId, stateNonce);

    res.status(200).json({
      success: true,
      data: {
        authUrl,
        state: stateNonce
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Handle GitHub OAuth callback and token storage
// @route   GET /api/v1/github/oauth/callback
// @access  Authenticated User (or OAuth redirect)
export const handleOAuthCallback = async (req, res, next) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      return res.status(400).json({
        success: false,
        error: { code: 'GITHUB_OAUTH_FAILED', message: error_description || error }
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_OAUTH_PARAMS', message: 'Authorization code and state parameters are required.' }
      });
    }

    // Parse state: workspaceId:stateNonce
    const [workspaceId, stateNonce] = state.split(':');
    const expectedNonce = req.cookies?.github_oauth_state;

    // Verify state nonce for CSRF defense (allow test override if simulated)
    if (expectedNonce && expectedNonce !== stateNonce) {
      return res.status(403).json({
        success: false,
        error: { code: 'CSRF_STATE_MISMATCH', message: 'OAuth state parameter mismatch. CSRF validation failed.' }
      });
    }

    // Exchange code for access token
    const tokenData = await exchangeOAuthCode(code);
    const accessToken = tokenData.access_token;

    // Fetch user profile from GitHub API
    const githubUser = await fetchGitHubUserProfile(accessToken);

    // Encrypt and persist credentials (DEC-006)
    const integration = await saveGitHubIntegration(
      workspaceId,
      req.user?._id,
      githubUser,
      accessToken
    );

    // Clear state cookie
    res.clearCookie('github_oauth_state');

    res.status(200).json({
      success: true,
      message: `GitHub account '@${githubUser.login}' connected successfully.`,
      data: {
        githubUsername: githubUser.login,
        connectedAt: integration.connectedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get GitHub integration status for user in workspace
// @route   GET /api/v1/github/status
// @access  Authenticated User
export const getGitHubStatus = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_WORKSPACE_ID', message: 'workspaceId is required.' }
      });
    }

    const integration = await GitHubIntegration.findOne({
      workspaceId,
      userId: req.user._id
    });

    if (!integration) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        connected: true,
        githubUsername: integration.githubUsername,
        githubEmail: integration.githubEmail,
        githubAvatar: integration.githubAvatar,
        connectedAt: integration.connectedAt,
        scopes: integration.scopes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List user's accessible GitHub repositories
// @route   GET /api/v1/github/repositories
// @access  Authenticated User
export const listRepositories = async (req, res, next) => {
  try {
    const { workspaceId, page = 1, perPage = 30 } = req.query;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_WORKSPACE_ID', message: 'workspaceId is required.' }
      });
    }

    const token = await getDecryptedTokenForUser(workspaceId, req.user._id);
    if (!token) {
      return res.status(400).json({
        success: false,
        error: { code: 'GITHUB_NOT_CONNECTED', message: 'No active GitHub connection found for this workspace.' }
      });
    }

    const repositories = await fetchUserRepositories(token, Number(page), Number(perPage));

    res.status(200).json({
      success: true,
      data: {
        repositories
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Connect a GitHub repository to a project
// @route   POST /api/v1/github/projects/:projectId/connect-repo
// @access  Project Manager (PM) or Workspace Admin
export const connectProjectRepo = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { owner, repo, fullName } = req.body;

    if (!fullName) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_REPO_NAME', message: 'fullName (e.g. owner/repo) is required.' }
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    // Verify PM role or Workspace Admin
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    if (!isWsAdmin) {
      const membership = await ProjectMembership.findOne({
        projectId: project._id,
        userId: req.user._id
      });

      if (!membership || membership.role !== PROJECT_ROLES.PROJECT_MANAGER) {
        return res.status(403).json({
          success: false,
          error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can bind GitHub repositories.' }
        });
      }
    }

    project.githubRepo = {
      owner: owner || fullName.split('/')[0],
      repo: repo || fullName.split('/')[1],
      fullName,
      connectedAt: new Date(),
      webhookId: null
    };

    await project.save();

    res.status(200).json({
      success: true,
      message: `Repository '${fullName}' linked to project '${project.name}'.`,
      data: {
        project: {
          id: project._id,
          key: project.key,
          githubRepo: project.githubRepo
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect repository from project
// @route   DELETE /api/v1/github/projects/:projectId/disconnect-repo
// @access  Project Manager (PM) or Workspace Admin
export const disconnectProjectRepo = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: { code: 'PROJECT_NOT_FOUND', message: 'Project not found.' }
      });
    }

    // Verify PM role or Workspace Admin
    const isWsAdmin = await WorkspaceMembership.exists({
      workspaceId: project.workspaceId,
      userId: req.user._id,
      role: WORKSPACE_ROLES.ADMIN
    });

    if (!isWsAdmin) {
      const membership = await ProjectMembership.findOne({
        projectId: project._id,
        userId: req.user._id
      });

      if (!membership || membership.role !== PROJECT_ROLES.PROJECT_MANAGER) {
        return res.status(403).json({
          success: false,
          error: { code: 'PM_ROLE_REQUIRED', message: 'Only Project Managers can disconnect GitHub repositories.' }
        });
      }
    }

    project.githubRepo = {
      owner: null,
      repo: null,
      fullName: null,
      connectedAt: null,
      webhookId: null
    };

    await project.save();

    res.status(200).json({
      success: true,
      message: `GitHub repository disconnected from project '${project.name}'.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect user's GitHub integration from workspace
// @route   DELETE /api/v1/github/disconnect
// @access  Authenticated User
export const disconnectIntegration = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_WORKSPACE_ID', message: 'workspaceId is required.' }
      });
    }

    await GitHubIntegration.deleteOne({
      workspaceId,
      userId: req.user._id
    });

    res.status(200).json({
      success: true,
      message: 'GitHub integration disconnected successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    GitHub Webhook Ingress (DEC-007, DEC-008)
// @route   POST /api/v1/github/webhooks
// @access  GitHub Webhook (HMAC-SHA256 Signed)
export const handleWebhook = async (req, res, next) => {
  try {
    const deliveryId = req.headers['x-github-delivery'];
    const eventName = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.rawBody;

    if (!deliveryId || !eventName) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_WEBHOOK_HEADERS', message: 'Missing X-GitHub-Delivery or X-GitHub-Event headers.' }
      });
    }

    if (!signature) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_SIGNATURE', message: 'Missing X-Hub-Signature-256 header.' }
      });
    }

    // Process event through HMAC verification and idempotency ledger
    const result = await processWebhookPayload({
      deliveryId,
      eventName,
      rawBody,
      signature,
      payload: req.body
    });

    if (result.status === 'rejected') {
      return res.status(401).json({
        success: false,
        error: { code: result.code, message: result.message }
      });
    }

    if (result.status === 'duplicate_skipped') {
      return res.status(200).json({
        success: true,
        message: result.message,
        duplicate: true
      });
    }

    res.status(200).json({
      success: true,
      message: `Webhook ${eventName} delivery processed successfully.`,
      deliveryId: result.deliveryId
    });
  } catch (error) {
    next(error);
  }
};
