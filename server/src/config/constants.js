/**
 * DevFlow System-Wide Architectural Constants
 * Aligned with DECISIONS.md and DevFlow Comprehensive Documentation
 */

// Two-Tier Hierarchical Roles
export const WORKSPACE_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
};

export const PROJECT_ROLES = {
  PROJECT_MANAGER: 'pm',
  DEVELOPER: 'developer',
  VIEWER: 'viewer'
};

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  COMPLETED: 'completed'
};

export const PROJECT_VISIBILITY = {
  PUBLIC: 'public',
  PRIVATE: 'private'
};

// Kanban Column Identifiers and Display Names
export const KANBAN_COLUMNS = {
  BACKLOG: 'backlog',
  TO_DO: 'to_do',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  DONE: 'done'
};

export const KANBAN_COLUMN_LIST = [
  KANBAN_COLUMNS.BACKLOG,
  KANBAN_COLUMNS.TO_DO,
  KANBAN_COLUMNS.IN_PROGRESS,
  KANBAN_COLUMNS.REVIEW,
  KANBAN_COLUMNS.DONE
];

// Fractional Indexing Constraints (DEC-003)
export const FRACTIONAL_INDEXING = {
  DEFAULT_GAP: 1000.0,
  MIN_PRECISION_GAP: 0.000001,
  INITIAL_BASE: 1000.0
};

// Task Priority Levels
export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Sprint Lifecycles (DEC-010)
export const SPRINT_STATUS = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

// Milestone Status
export const MILESTONE_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed'
};

// Activity Log Event Types
export const ACTIVITY_TYPES = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_MOVED: 'task_moved',
  TASK_ASSIGNED: 'task_assigned',
  COMMENT_ADDED: 'comment_added',
  GITHUB_COMMIT_LINKED: 'github_commit_linked',
  GITHUB_PR_LINKED: 'github_pr_linked',
  SPRINT_STARTED: 'sprint_started',
  SPRINT_COMPLETED: 'sprint_completed'
};
