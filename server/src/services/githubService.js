import { env } from '../config/env.js';
import GitHubIntegration from '../models/GitHubIntegration.js';
import User from '../models/User.js';
import { encryptToken, decryptToken } from '../utils/crypto.js';

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

/**
 * Builds standard GitHub OAuth authorization URL
 */
export const buildOAuthUrl = (workspaceId, state) => {
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_CALLBACK_URL,
    scope: 'repo read:user user:email',
    state: `${workspaceId}:${state}`
  });

  return `${GITHUB_AUTH_URL}?${params.toString()}`;
};

/**
 * Exchanges GitHub authorization code for user access token using native Node fetch
 */
export const exchangeOAuthCode = async (code) => {
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_CALLBACK_URL
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth Error: ${data.error_description || data.error}`);
  }

  return data; // { access_token, token_type, scope }
};

/**
 * Fetches authenticated user's profile from GitHub REST API
 */
export const fetchGitHubUserProfile = async (accessToken) => {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevFlow-Enterprise-Platform'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Fetches user's accessible GitHub repositories
 */
export const fetchUserRepositories = async (accessToken, page = 1, perPage = 30) => {
  const url = `${GITHUB_API_URL}/user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevFlow-Enterprise-Platform'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API Error: ${response.statusText}`);
  }

  const data = await response.json();

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner?.login || '',
    private: Boolean(repo.private),
    htmlUrl: repo.html_url,
    description: repo.description,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at
  }));
};

/**
 * Encrypts and securely stores GitHub credentials at rest (DEC-006)
 */
export const saveGitHubIntegration = async (workspaceId, userId, githubUser, accessToken) => {
  const encryptedAccessToken = encryptToken(accessToken);

  const integration = await GitHubIntegration.findOneAndUpdate(
    { workspaceId, userId },
    {
      workspaceId,
      userId,
      githubUserId: String(githubUser.id),
      githubUsername: githubUser.login,
      githubEmail: githubUser.email || '',
      githubAvatar: githubUser.avatar_url || '',
      encryptedAccessToken,
      scopes: ['repo', 'read:user', 'user:email'],
      connectedAt: new Date()
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Sync githubUsername back to User model
  if (userId) {
    await User.findByIdAndUpdate(userId, {
      githubUsername: githubUser.login,
      githubId: String(githubUser.id)
    });
  }

  return integration;
};

/**
 * Decrypts and returns active GitHub access token for a given user
 */
export const getDecryptedTokenForUser = async (workspaceId, userId) => {
  const integration = await GitHubIntegration.findOne({ workspaceId, userId });
  if (!integration || !integration.encryptedAccessToken) {
    return null;
  }

  return decryptToken(integration.encryptedAccessToken);
};
