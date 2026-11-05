import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db.js';
import User from './models/User.js';
import Workspace from './models/Workspace.js';
import WorkspaceMembership from './models/WorkspaceMembership.js';
import Project from './models/Project.js';
import ProjectMembership from './models/ProjectMembership.js';
import Task from './models/Task.js';
import Comment from './models/Comment.js';
import Sprint from './models/Sprint.js';
import Milestone from './models/Milestone.js';
import GitHubIntegration from './models/GitHubIntegration.js';
import { encryptToken } from './utils/crypto.js';

const seed = async () => {
  await connectDB();
  console.log('Seeding demo data into devflow_db...');

  // 1. Create or update Demo Lead User
  let user = await User.findOne({ email: 'alex.lead@devflow.io' });
  if (!user) {
    user = await User.create({
      name: 'Alex Mercer (Lead Architect)',
      email: 'alex.lead@devflow.io',
      password: 'DevFlow2026!',
      role: 'user',
      githubUsername: 'alexmercer-dev'
    });
  }

  // 2. Create Workspace
  let workspace = await Workspace.findOne({ ownerId: user._id });
  if (!workspace) {
    workspace = await Workspace.create({
      name: 'DevFlow Engineering Workspace',
      slug: `devflow-eng-${Date.now()}`,
      ownerId: user._id
    });

    await WorkspaceMembership.create({
      workspaceId: workspace._id,
      userId: user._id,
      role: 'admin'
    });
  }

  // 3. Create Project
  let project = await Project.findOne({ workspaceId: workspace._id });
  if (!project) {
    project = await Project.create({
      name: 'Platform Core & Real-Time Engine',
      key: 'FLOW',
      workspaceId: workspace._id,
      ownerId: user._id,
      description: 'Central microservices architecture, Kanban drag-and-drop orchestration, and GitHub webhook ingest.'
    });

    await ProjectMembership.create({
      projectId: project._id,
      workspaceId: workspace._id,
      userId: user._id,
      role: 'pm'
    });
  }

  // 4. Create Sprints
  let activeSprint = await Sprint.findOne({ projectId: project._id, status: 'active' });
  if (!activeSprint) {
    activeSprint = await Sprint.create({
      name: 'Sprint 1 — Core Architecture & Kanban',
      projectId: project._id,
      workspaceId: workspace._id,
      goal: 'Deliver $O(1)$ fractional drag-and-drop Kanban, Two-Tier RBAC, and Socket.IO mesh.',
      status: 'active',
      startDate: new Date(Date.now() - 3 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000)
    });

    await Sprint.create({
      name: 'Sprint 2 — GitHub Sync & Telemetry',
      projectId: project._id,
      workspaceId: workspace._id,
      goal: 'Complete PR linking, burndown streaming exports, and automated task rollover.',
      status: 'planned',
      startDate: new Date(Date.now() + 12 * 86400000),
      endDate: new Date(Date.now() + 26 * 86400000)
    });
  }

  // 5. Create Milestone
  const milestoneCount = await Milestone.countDocuments({ projectId: project._id });
  if (milestoneCount === 0) {
    await Milestone.create([
      {
        title: 'v1.0 Production Launch',
        description: 'Hardened multi-tenant production launch with zero security backdoors.',
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: 'open',
        projectId: project._id,
        workspaceId: workspace._id
      },
      {
        title: 'SOC-2 Compliance & Penetration Testing',
        description: 'Verify BOLA defense, AES-256-GCM cipher tokens, and DOMPurify XSS scrubbing.',
        dueDate: new Date(Date.now() + 15 * 86400000),
        status: 'open',
        projectId: project._id,
        workspaceId: workspace._id
      }
    ]);
  }

  // 6. Seed Tasks
  const taskCount = await Task.countDocuments({ projectId: project._id });
  if (taskCount === 0) {
    const tasks = [
      {
        taskKey: 'FLOW-101',
        title: 'Implement Fractional Indexing (Lexorank $O(1)$)',
        description: 'Calculate midpoints between cards during drag-and-drop to eliminate batch re-indexing.',
        status: 'done',
        priority: 'urgent',
        storyPoints: 5,
        orderIndex: 1000.0,
        projectId: project._id,
        workspaceId: workspace._id,
        reporterId: user._id,
        assigneeId: user._id,
        sprintId: activeSprint._id,
        labels: ['algorithm', 'performance']
      },
      {
        taskKey: 'FLOW-102',
        title: 'Timing-Safe Webhook HMAC Anti-Spoofing',
        description: 'Enforce crypto.timingSafeEqual on UTF-8 rawBody buffer digests to protect against side-channel leaks.',
        status: 'in_progress',
        priority: 'high',
        storyPoints: 3,
        orderIndex: 2000.0,
        projectId: project._id,
        workspaceId: workspace._id,
        reporterId: user._id,
        assigneeId: user._id,
        sprintId: activeSprint._id,
        labels: ['security', 'github']
      },
      {
        taskKey: 'FLOW-103',
        title: 'Socket.IO Room-Level Authorization Mesh',
        description: 'Bind authenticated sockets to workspace and project channels. Broadcast live card movements.',
        status: 'review',
        priority: 'medium',
        storyPoints: 5,
        orderIndex: 3000.0,
        projectId: project._id,
        workspaceId: workspace._id,
        reporterId: user._id,
        assigneeId: user._id,
        sprintId: activeSprint._id,
        labels: ['realtime', 'websocket']
      },
      {
        taskKey: 'FLOW-104',
        title: 'Streaming CSV and Excel Telemetry Export Engine',
        description: 'Generate high-throughput project reports using csv-stringify and exceljs streaming.',
        status: 'to_do',
        priority: 'low',
        storyPoints: 3,
        orderIndex: 4000.0,
        projectId: project._id,
        workspaceId: workspace._id,
        reporterId: user._id,
        sprintId: activeSprint._id,
        labels: ['analytics', 'export']
      },
      {
        taskKey: 'FLOW-105',
        title: 'Dark/Light Theme UI Polish & Typography Tuning',
        description: 'WCAG 2.1 AA accessible contrast ratios, tailored micro-states, and fluid animations.',
        status: 'backlog',
        priority: 'medium',
        storyPoints: 2,
        orderIndex: 5000.0,
        projectId: project._id,
        workspaceId: workspace._id,
        reporterId: user._id,
        labels: ['ui', 'tailwind']
      }
    ];

    const createdTasks = await Task.create(tasks);

    // Link tasks to active sprint
    activeSprint.taskIds = createdTasks.map(t => t._id);
    await activeSprint.save();

    // Add sample comment
    await Comment.create({
      taskId: createdTasks[0]._id,
      projectId: project._id,
      workspaceId: workspace._id,
      authorId: user._id,
      content: 'Verified fractional indexing with 10,000 simulated drag operations — zero collision!'
    });
  }

  // 7. Seed GitHub Integration status
  const ghInt = await GitHubIntegration.findOne({ workspaceId: workspace._id });
  if (!ghInt) {
    await GitHubIntegration.create({
      workspaceId: workspace._id,
      userId: user._id,
      githubUserId: '77889900',
      githubUsername: 'devflow-team',
      encryptedAccessToken: encryptToken('gho_demoMockAccessTokenOnlyForDisplayDemo')
    });
  }

  console.log('✅ Demo dataset seeded successfully!');
  await disconnectDB();
};

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
