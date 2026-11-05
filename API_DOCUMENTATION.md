# DevFlow — REST API Documentation (API_DOCUMENTATION.md)

**Base URL:** `/api/v1`  
**Authentication:** JWT Bearer Token via `Authorization: Bearer <token>` or `devflow_token` HttpOnly Cookie  
**Response Format:** Standardized JSON with `success: true|false`, `data` or `error`  

---

## 1. System & Health
- `GET /api/v1/health` — Checks service health, uptime, and MongoDB cluster state.

---

## 2. Authentication & Account Management
- `POST /api/v1/auth/register` — Registers user & auto-provisions personal workspace.
- `POST /api/v1/auth/login` — Authenticates user, sets HttpOnly cookie, returns workspaces.
- `POST /api/v1/auth/logout` — Clears session cookie.
- `GET /api/v1/auth/me` — Retrieves current profile and accessible workspaces.
- `PATCH /api/v1/auth/profile` — Updates name, avatar, or GitHub username.
- `POST /api/v1/auth/change-password` — Updates account password.

---

## 3. Workspace Management & Governance
- `GET /api/v1/workspaces` — Lists all workspaces caller belongs to with roles.
- `POST /api/v1/workspaces` — Creates a new workspace tenant (Caller = `admin`).
- `GET /api/v1/workspaces/:id` — Retrieves workspace details & member count.
- `PATCH /api/v1/workspaces/:id` — Updates workspace name and description (Admin only).
- `GET /api/v1/workspaces/:id/members` — Lists workspace members.
- `POST /api/v1/workspaces/:id/invitations` — Invites a user by email (Admin only).
- `DELETE /api/v1/workspaces/:id/members/:userId` — Removes a member (Admin only).

---

## 4. Project Management & Team Assignment
- `POST /api/v1/projects` — Creates project with unique key e.g. `FLOW` (Admin only).
- `GET /api/v1/projects?workspaceId=...` — Lists accessible projects in workspace.
- `GET /api/v1/projects/:id` — Retrieves detailed project metadata.
- `PATCH /api/v1/projects/:id` — Updates project metadata (PM only).
- `DELETE /api/v1/projects/:id` — Deletes project and associated tasks (Admin only).
- `GET /api/v1/projects/:id/members` — Lists project team members.
- `POST /api/v1/projects/:id/members` — Assigns workspace member to project (PM only).
- `PATCH /api/v1/projects/:id/members/:userId` — Updates member role (PM only).
- `DELETE /api/v1/projects/:id/members/:userId` — Removes member from project (PM only).

---

## 5. Task Management Core
- `POST /api/v1/projects/:projectId/tasks` — Creates task with sequential key (`FLOW-101`) & initial fractional order.
- `GET /api/v1/projects/:projectId/tasks` — Lists project tasks with keyword search and filters.
- `GET /api/v1/tasks/:id` — Retrieves task by MongoDB ID or taskKey (`FLOW-101`).
- `PATCH /api/v1/tasks/:id` — Updates task details with DOMPurify description sanitization.
- `DELETE /api/v1/tasks/:id` — Deletes task (PM only).

---

## 6. Kanban Board Mechanics & Drag-and-Drop (Phase 5)

### `GET /api/v1/projects/:id/board`
Retrieves the complete interactive Kanban board grouped into 5 discrete columns (`backlog`, `to_do`, `in_progress`, `review`, `done`), sorted by fractional `orderIndex: 1`.
- **Access:** Project Viewer or higher
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "project": {
        "id": "673fa1...",
        "name": "DevFlow Core Engine",
        "key": "FLOW",
        "role": "pm"
      },
      "summary": {
        "totalTasks": 12,
        "totalPoints": 45,
        "completedPoints": 15,
        "completionPercentage": 33
      },
      "columns": [
        {
          "id": "backlog",
          "title": "Backlog",
          "color": "slate",
          "count": 4,
          "totalPoints": 14,
          "tasks": [ ... ]
        },
        {
          "id": "to_do",
          "title": "To Do",
          "color": "indigo",
          "count": 3,
          "totalPoints": 11,
          "tasks": [ ... ]
        },
        {
          "id": "in_progress",
          "title": "In Progress",
          "color": "amber",
          "count": 3,
          "totalPoints": 12,
          "tasks": [ ... ]
        },
        {
          "id": "review",
          "title": "In Review",
          "color": "purple",
          "count": 1,
          "totalPoints": 3,
          "tasks": [ ... ]
        },
        {
          "id": "done",
          "title": "Done",
          "color": "emerald",
          "count": 1,
          "totalPoints": 5,
          "tasks": [ ... ]
        }
      ]
    }
  }
  ```

### `PATCH /api/v1/tasks/:id/move`
Updates a card's column and computes its new fractional `orderIndex` in $O(1)$ time without updating other cards (DEC-003). Broadcasts `task:moved` across the Socket.IO project room.
- **Access:** Developer or Project Manager
- **Request Body:**
  ```json
  {
    "columnId": "in_progress",
    "prevOrderIndex": 1000.0,
    "nextOrderIndex": 2000.0
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "message": "Task FLOW-101 moved to 'in_progress' at order 1500.0000.",
    "data": {
      "task": {
        "id": "673fa2...",
        "taskKey": "FLOW-101",
        "status": "in_progress",
        "orderIndex": 1500.0
      },
      "oldStatus": "backlog",
      "newStatus": "in_progress",
      "orderIndex": 1500.0,
      "rebalanced": false
    }
  }
  ```
- **Rebalancing Guard:** If $|\text{prevOrderIndex} - \text{nextOrderIndex}| < 0.000001$, the column is automatically re-spaced to $\{1000, 2000, 3000\dots\}$ and `rebalanced: true` is returned.

---

## 7. Collaboration, Comments & Mentions (Phase 6)

### `POST /api/v1/tasks/:taskId/comments`
Adds a discussion comment to a task with DOMPurify sanitization. Automatically scans content for `@username` mentions, resolves user records, creates recipient notification items, and logs an append-only activity.
- **Access:** Project Viewer or higher
- **Request Body:**
  ```json
  {
    "content": "Hey @john, can you inspect the Redis connection leak?",
    "attachments": []
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Comment posted successfully",
    "data": {
      "comment": {
        "_id": "673fa5...",
        "taskId": "673fa2...",
        "authorId": { "_id": "...", "name": "Jane Lead", "email": "lead@devflow.io" },
        "content": "Hey @john, can you inspect the Redis connection leak?",
        "mentions": ["673fa4..."],
        "createdAt": "2026-11-05T10:30:00.000Z"
      }
    }
  }
  ```

### `GET /api/v1/tasks/:taskId/comments`
Fetches chronological comment history for a specific task.
- **Access:** Project Viewer or higher
- **Response `200 OK`:** Returns array of comments with populated author avatars, names, and attachments.

### `DELETE /api/v1/comments/:id`
Deletes a comment. Only the original author, a Project Manager, or Workspace Admin can delete comments.
- **Access:** Comment Author, PM, or Admin
- **Response `200 OK`:** `{ "success": true, "message": "Comment deleted successfully" }`

---

## 8. Real-Time Notifications Inbox (Phase 6)

### `GET /api/v1/notifications`
Fetches notifications for the authenticated user, supporting `?unreadOnly=true` and pagination (`?page=1&limit=20`).
- **Access:** Authenticated User
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "notifications": [
        {
          "_id": "673fa6...",
          "type": "mention",
          "title": "Mentioned in FLOW-101",
          "message": "Jane Lead mentioned you: 'Hey @john...'",
          "read": false,
          "sender": { "name": "Jane Lead" }
        }
      ],
      "unreadCount": 1
    }
  }
  ```

### `PATCH /api/v1/notifications/:id/read`
Marks a specific notification as read.
- **Access:** Notification Recipient
- **Response `200 OK`:** `{ "success": true, "message": "Notification marked as read" }`

### `PATCH /api/v1/notifications/read-all`
Marks all pending unread notifications for the caller as read.
- **Access:** Authenticated User
- **Response `200 OK`:** `{ "success": true, "message": "All notifications marked as read" }`

---

## 9. Activity Feed & Audit History (Phase 6)

### `GET /api/v1/projects/:projectId/activities`
Retrieves paginated audit feed of actions executed across the project (`task:created`, `task:moved`, `comment:added`, `task:updated`).
- **Access:** Project Viewer or higher

### `GET /api/v1/tasks/:taskId/activities`
Retrieves the timeline of events for an individual task.
- **Access:** Project Viewer or higher

---

## 10. Real-Time Socket.IO Mesh Protocol (Phase 7 - DEC-009)

DevFlow utilizes a high-performance Socket.IO mesh for bidirectional real-time state synchronization, multi-tenant room isolation, and presence telemetry.

### Connection & Authentication Handshake
Clients connect to the root namespace with JWT credentials supplied via handshake `auth.token`, HTTP Authorization header, or HttpOnly session cookie (`devflow_token`). Unauthenticated or forged connection handshakes are rejected with an explicit `Authentication failed` error.
- **Endpoint:** `ws://localhost:5000/socket.io/` or `https://devflow.io/socket.io/`
- **Transport:** WebSocket with HTTP long-polling fallback.
- **Auto-Join:** Upon successful handshake, client sockets automatically join their private notification room: `user_<userId>`.

### Scoped Room Subscriptions & Authorization Guards

| Client Emitter | Arguments | Authorization Guard | Server Room Joined |
| :--- | :--- | :--- | :--- |
| `join:workspace` | `workspaceId, callback` | Verified `WorkspaceMembership` | `workspace_<workspaceId>` |
| `join:project` | `projectId, callback` | Verified `ProjectMembership` OR `WorkspaceMembership` (Admin) | `project_<projectId>` |
| `join:task` | `taskId, callback` | Verified project access via task lookup | `task_<taskId>` |
| `leave:workspace` | `workspaceId` | None | Leaves `workspace_<workspaceId>` |
| `leave:project` | `projectId` | None | Leaves `project_<projectId>` |
| `leave:task` | `taskId` | None | Leaves `task_<taskId>` |

### Client-to-Server Collaborative Events

| Event | Payload | Behavior |
| :--- | :--- | :--- |
| `task:typing` | `{ taskId: string, isTyping: boolean }` | Broadcasts `user:typing` to all other clients inside `task_<taskId>`. |

### Server Broadcast Events

| Event | Room | Payload Description |
| :--- | :--- | :--- |
| `task:created` | `project_<projectId>` | Full populated task object when a teammate adds a card. |
| `task:moved` | `project_<projectId>` | `{ taskId, taskKey, oldStatus, newStatus, newOrderIndex, rebalanced, task }`. Enables instant optimistic and remote board synchronization. |
| `task:updated` | `project_<projectId>`, `task_<taskId>` | Updated task object (title, points, assignee, tags). |
| `task:deleted` | `project_<projectId>` | `{ taskId, taskKey }` to purge card from active boards. |
| `task:assigned` | `user_<assigneeId>` | `{ taskKey, title, assignedBy, priority }` direct alert. |
| `comment:created` | `task_<taskId>`, `project_<projectId>` | Newly posted threaded comment with populated author. |
| `comment:deleted` | `task_<taskId>` | `{ commentId, taskId }`. |
| `notification:new` | `user_<recipientId>` | Direct in-app alert for user mentions or assigned tasks. |
| `user:typing` | `task_<taskId>` | `{ userId, name, taskId, isTyping }` collaborative indicator. |

---

## 11. GitHub Integration & Webhook Synchronization (Phase 8 - DEC-006, DEC-007, DEC-008)

### `GET /api/v1/github/oauth/connect?workspaceId=...`
Initiates GitHub OAuth 2.0 flow. Generates a cryptographically secure state nonce and sets a signed HttpOnly state cookie for CSRF defense.
- **Access:** Authenticated Workspace Member
- **Response `200 OK`:** Returns `{ authUrl, state }`.

### `GET /api/v1/github/oauth/callback?code=...&state=...`
Completes GitHub OAuth handshake: validates state cookie, exchanges code for access token, encrypts token with AES-256-GCM cipher, and persists integration.
- **Access:** Authenticated User
- **Response `200 OK`:** `{ success: true, message: "GitHub account connected successfully", data: { githubUsername: "octocat" } }`

### `GET /api/v1/github/status?workspaceId=...`
Checks integration status for caller in workspace. Token ciphertext is never returned.
- **Access:** Authenticated User
- **Response `200 OK`:** `{ success: true, data: { connected: true, githubUsername: "octocat", connectedAt: "..." } }`

### `GET /api/v1/github/repositories?workspaceId=...`
Fetches user's accessible GitHub repositories using the decrypted token.
- **Access:** Authenticated User with connected GitHub account

### `POST /api/v1/github/projects/:projectId/connect-repo`
Binds a GitHub repository (`owner/repo`) to a DevFlow project.
- **Access:** Project Manager or Workspace Admin
- **Request Body:** `{ "fullName": "devflow-org/core-engine", "owner": "devflow-org", "repo": "core-engine" }`
- **Response `200 OK`:** Returns updated project with `githubRepo` metadata.

### `DELETE /api/v1/github/projects/:projectId/disconnect-repo`
Unlinks GitHub repository from project.
- **Access:** Project Manager or Workspace Admin
- **Response `200 OK`:** `{ success: true, message: "GitHub repository disconnected from project." }`

### `DELETE /api/v1/github/disconnect?workspaceId=...`
Disconnects user's personal GitHub OAuth integration from the workspace.
- **Access:** Authenticated User

### `POST /api/v1/github/webhooks`
Public ingress for GitHub Webhooks.
- **Security:** Requires `X-Hub-Signature-256` HMAC-SHA256 signature verified against the unparsed raw request buffer using `crypto.timingSafeEqual` (DEC-007).
- **Idempotency:** Reads `X-GitHub-Delivery` UUID and checks the `WebhookEvent` ledger. Duplicate deliveries return `200 OK` with `{ duplicate: true }` and skip redundant processing (DEC-008).
- **Push Event Processing:** Scans commit messages for task keys via regex `/\b([A-Z0-9]{2,10}-\d+)\b/g`, automatically associates commits with matching tasks, and broadcasts real-time socket events.
- **Pull Request Event Processing:** Extracts task keys from PR titles, bodies, and branch names; associates PRs with tasks and syncs PR status (`open`, `closed`, `merged`). In accordance with project policy, PR merges do not unilaterally transition task status to `done`.

---

## 12. Sprints & Agile Milestones (Phase 9 - DEC-010)

### `POST /api/v1/projects/:projectId/sprints`
Creates a new sprint in `planned` status.
- **Access:** Project Manager or Workspace Admin
- **Request Body:** `{ "name": "Sprint 1", "goal": "Setup database", "startDate": "...", "endDate": "..." }`
- **Response `201 Created`:** Returns created sprint document.

### `GET /api/v1/projects/:projectId/sprints`
Lists all sprints for a project ordered by creation date descending.
- **Access:** Project Viewer or higher

### `GET /api/v1/sprints/:id`
Retrieves sprint details.
- **Access:** Project Viewer or higher

### `PATCH /api/v1/sprints/:id/start`
Activates a planned sprint. Computes and freezes committed story points based on all tasks allocated to this sprint. Enforces the invariant: **Only one sprint can be active per project at any given time**. Returns `400 ACTIVE_SPRINT_EXISTS` if another sprint is currently active.
- **Access:** Project Manager or Workspace Admin
- **Response `200 OK`:** `{ success: true, message: "Sprint 'Sprint 1' is now active.", data: { sprint } }`

### `PATCH /api/v1/sprints/:id/complete`
Completes an active sprint and triggers the automated rollover engine.
- **Access:** Project Manager or Workspace Admin
- **Request Body:**
  ```json
  {
    "rolloverTarget": "backlog" | "next_sprint",
    "targetSprintId": "673fa7..." // Required only if rolloverTarget === 'next_sprint'
  }
  ```
- **Automated Rollover:**
  - Tasks marked `done` remain associated with this sprint for historical telemetry.
  - Incomplete tasks (`status !== 'done'`) are atomically reassigned:
    - If `rolloverTarget === 'backlog'`: `sprintId = null`.
    - If `rolloverTarget === 'next_sprint'`: `sprintId = targetSprintId`.
- **Response `200 OK`:** Returns `{ sprint, completedPoints, rolledOverTasksCount, rolloverDestination }`.

### `GET /api/v1/sprints/:id/report`
Generates comprehensive sprint report metrics: total tasks, completed tasks, remaining tasks, total committed story points, completed story points, remaining story points, and completion percentage.
- **Access:** Project Viewer or higher

---

### `POST /api/v1/projects/:projectId/milestones`
Creates a delivery milestone with title, description, and required due date.
- **Access:** Project Manager or Workspace Admin

### `GET /api/v1/projects/:projectId/milestones`
Retrieves project milestones enriched with real-time task progress metrics (`totalTasks`, `completedTasks`, `completionPercentage`).
- **Access:** Project Viewer or higher

### `GET /api/v1/milestones/:id`
Retrieves milestone details along with an array of all linked task summaries.
- **Access:** Project Viewer or higher

### `PATCH /api/v1/milestones/:id/toggle`
Toggles milestone status between `open` and `completed`. Sets `completedAt` timestamp.
- **Access:** Project Manager or Workspace Admin

### `DELETE /api/v1/milestones/:id`
Deletes milestone and safely unlinks all associated tasks (`task.milestoneId = null`).
- **Access:** Project Manager or Workspace Admin

---

## 13. Analytics, Telemetry & Export Engine (Phase 10 - DEC-010)

### `GET /api/v1/sprints/:id/burndown`
Calculates and returns mathematical sprint burndown trajectory (DEC-010). Computes daily linear ideal burn lines and actual remaining points based on task completion timestamps across sprint duration.
- **Access:** Project Viewer or higher
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "sprint": {
        "id": "673fa1...",
        "name": "Sprint 1",
        "totalStoryPoints": 20,
        "completedStoryPoints": 8,
        "totalDays": 14
      },
      "burnData": [
        { "day": 0, "date": "2026-10-22", "label": "Day 0", "ideal": 20, "actual": 20 },
        { "day": 14, "date": "2026-11-05", "label": "Day 14", "ideal": 0, "actual": 12 }
      ]
    }
  }
  ```

### `GET /api/v1/projects/:id/analytics/velocity`
Calculates agile velocity across completed project sprints. Returns committed points, delivered points, completion rate per sprint, and the overall average team velocity.
- **Access:** Project Viewer or higher
- **Response `200 OK`:** Returns `{ averageVelocity, totalCompletedSprints, velocityHistory: [ ... ] }`.

### `GET /api/v1/projects/:id/analytics/workload`
Aggregates developer workload distribution across all project tasks. Computes total assigned tasks, open tasks, completed tasks, overdue tasks count, and story point breakdown per developer, plus unassigned backlog tasks.
- **Access:** Project Viewer or higher

### `GET /api/v1/projects/:id/analytics/distribution`
Aggregates project-wide distribution across the 5 Kanban columns (`backlog`, `to_do`, `in_progress`, `review`, `done`) and 4 priority levels (`urgent`, `high`, `medium`, `low`).
- **Access:** Project Viewer or higher

### `GET /api/v1/projects/:id/export?format=csv|xlsx`
Streams formatted task data reports for project management and compliance audits.
- **Supported Formats:**
  - `csv` (default): Streams RFC 4180 compliant CSV string with quoted fields and headers.
  - `xlsx` / `excel`: Generates styled Excel spreadsheet binary with brand headers and frozen header row.
- **Columns Exported:** Task Key, Title, Status, Priority, Story Points, Assignee, Assignee Email, Reporter, Sprint, Milestone, Due Date, Labels, Commits Count, Pull Requests Count, Created At.
- **Access:** Project Viewer or higher
- **Headers Returned:**
  - `Content-Type: text/csv` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `Content-Disposition: attachment; filename="<project_key>-tasks-<date>.<ext>"`

