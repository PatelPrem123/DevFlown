import Task from '../models/Task.js';
import Project from '../models/Project.js';
import WebhookEvent from '../models/WebhookEvent.js';
import { verifyWebhookSignature } from '../utils/crypto.js';
import { emitToProject, emitToTask } from '../sockets/socketManager.js';
import { logActivity } from './activityService.js';
import { ACTIVITY_TYPES } from '../config/constants.js';

// Regex extracting uppercase alphanumeric task keys e.g. FLOW-101, PROJ-12
export const TASK_KEY_REGEX = /\b([A-Z0-9]{2,10}-\d+)\b/g;

/**
 * Extracts unique task keys from text content (commit messages, PR titles, branches)
 */
export const extractTaskKeys = (text) => {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(TASK_KEY_REGEX);
  return matches ? [...new Set(matches.map((k) => k.toUpperCase()))] : [];
};

/**
 * Dispatches and processes an incoming GitHub webhook with HMAC verification and idempotency ledger
 */
export const processWebhookPayload = async ({
  deliveryId,
  eventName,
  rawBody,
  signature,
  payload
}) => {
  // 1. Constant-Time HMAC Signature Verification (DEC-007)
  const isValidSignature = verifyWebhookSignature(rawBody, signature);
  if (!isValidSignature) {
    return {
      status: 'rejected',
      code: 'INVALID_SIGNATURE',
      message: 'GitHub webhook HMAC signature verification failed.'
    };
  }

  // 2. Idempotency Deduplication via X-GitHub-Delivery GUID (DEC-008)
  const existingEvent = await WebhookEvent.findOne({ deliveryId });
  if (existingEvent) {
    return {
      status: 'duplicate_skipped',
      code: 'DUPLICATE_DELIVERY',
      message: `Webhook delivery '${deliveryId}' has already been processed.`
    };
  }

  const repoFullName = payload.repository?.full_name || null;
  const senderLogin = payload.sender?.login || null;
  const action = payload.action || null;

  // Record initial event ledger entry
  const ledgerRecord = await WebhookEvent.create({
    deliveryId,
    event: eventName,
    action,
    sender: senderLogin,
    repository: repoFullName,
    status: 'processed',
    payloadSummary: {
      action,
      repository: repoFullName,
      sender: senderLogin
    }
  });

  // Handle specific GitHub events
  if (eventName === 'push') {
    await handlePushEvent(payload);
  } else if (eventName === 'pull_request') {
    await handlePullRequestEvent(payload);
  }

  return {
    status: 'processed',
    deliveryId,
    event: eventName,
    eventId: ledgerRecord._id
  };
};

/**
 * Processes 'push' webhook event to link commits with tasks
 */
const handlePushEvent = async (payload) => {
  const repoFullName = payload.repository?.full_name;
  const commits = payload.commits || [];
  if (!repoFullName || commits.length === 0) return;

  // Find projects connected to this repository
  const projects = await Project.find({ 'githubRepo.fullName': repoFullName }).select('_id workspaceId');
  if (projects.length === 0) return;

  const projectIds = projects.map((p) => p._id);

  for (const commit of commits) {
    const matchedKeys = extractTaskKeys(commit.message);
    if (matchedKeys.length === 0) continue;

    for (const taskKey of matchedKeys) {
      const task = await Task.findOne({
        taskKey,
        projectId: { $in: projectIds }
      });

      if (!task) continue;

      // Verify commit is not already linked
      const alreadyLinked = task.githubCommits.some((c) => c.commitHash === commit.id);
      if (!alreadyLinked) {
        const commitData = {
          commitHash: commit.id,
          message: commit.message,
          author: commit.author?.name || commit.author?.username || 'Unknown',
          timestamp: commit.timestamp ? new Date(commit.timestamp) : new Date(),
          url: commit.url || ''
        };

        task.githubCommits.push(commitData);
        await task.save();

        // Broadcast real-time updates
        emitToProject(task.projectId, 'task:updated', task);
        emitToTask(task._id, 'task:commit_linked', { taskId: task._id, commit: commitData });
      }
    }
  }
};

/**
 * Processes 'pull_request' webhook event to link PRs with tasks
 */
const handlePullRequestEvent = async (payload) => {
  const pr = payload.pull_request;
  const repoFullName = payload.repository?.full_name;
  if (!pr || !repoFullName) return;

  const projects = await Project.find({ 'githubRepo.fullName': repoFullName }).select('_id workspaceId');
  if (projects.length === 0) return;

  const projectIds = projects.map((p) => p._id);

  // Compute effective PR state
  const effectiveState = pr.merged ? 'merged' : pr.state === 'closed' ? 'closed' : 'open';

  // Extract task keys from title, body, and branch ref
  const allText = `${pr.title || ''} ${pr.body || ''} ${pr.head?.ref || ''}`;
  const matchedKeys = extractTaskKeys(allText);

  for (const taskKey of matchedKeys) {
    const task = await Task.findOne({
      taskKey,
      projectId: { $in: projectIds }
    });

    if (!task) continue;

    const prIndex = task.githubPullRequests.findIndex((p) => p.prNumber === pr.number);
    if (prIndex >= 0) {
      // Update existing PR reference
      task.githubPullRequests[prIndex].state = effectiveState;
      task.githubPullRequests[prIndex].title = pr.title;
      task.githubPullRequests[prIndex].prUrl = pr.html_url;
      task.githubPullRequests[prIndex].branchName = pr.head?.ref || '';
    } else {
      // Add new PR reference
      task.githubPullRequests.push({
        prNumber: pr.number,
        prUrl: pr.html_url,
        title: pr.title,
        state: effectiveState,
        branchName: pr.head?.ref || ''
      });
    }

    await task.save();

    // Broadcast real-time updates
    emitToProject(task.projectId, 'task:updated', task);
    emitToTask(task._id, 'task:pr_linked', {
      taskId: task._id,
      pullRequest: {
        prNumber: pr.number,
        prUrl: pr.html_url,
        title: pr.title,
        state: effectiveState
      }
    });
  }
};
