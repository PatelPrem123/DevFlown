import express from 'express';
import {
  initiateOAuth,
  handleOAuthCallback,
  getGitHubStatus,
  listRepositories,
  connectProjectRepo,
  disconnectProjectRepo,
  disconnectIntegration,
  handleWebhook
} from '../controllers/githubController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// 1. Webhook Ingress (Public, verified via HMAC-SHA256 signature - DEC-007)
router.post('/webhooks', handleWebhook);

// 2. OAuth Authentication Flow (Protected by DevFlow session)
router.get('/oauth/connect', requireAuth, initiateOAuth);
router.get('/oauth/callback', requireAuth, handleOAuthCallback);

// 3. User Integration Status & Repository Explorer
router.get('/status', requireAuth, getGitHubStatus);
router.get('/repositories', requireAuth, listRepositories);
router.delete('/disconnect', requireAuth, disconnectIntegration);

// 4. Project Repository Associations (PM or Workspace Admin)
router.post('/projects/:projectId/connect-repo', requireAuth, connectProjectRepo);
router.delete('/projects/:projectId/disconnect-repo', requireAuth, disconnectProjectRepo);

export default router;
