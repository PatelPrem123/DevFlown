# DevFlow — Database Architecture & Schemas (DATABASE_SCHEMA.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Database:** MongoDB 7.x with Mongoose ODM  
**Design Pattern:** 13 Normalized Collections, Compound Indexing, Atomic Counters (DEC-002, DEC-005)  

---

## 1. Schema Entity Relationship Overview

```
┌──────────────────┐               ┌──────────────────────────────┐
│       User       │◄─────────────►│    WorkspaceMembership       │
└────────┬─────────┘               └──────────────┬───────────────┘
         │                                        │
         │ (Owns)                                 │ (Belongs to)
         ▼                                        ▼
┌──────────────────┐               ┌──────────────────────────────┐
│    Workspace     │◄──────────────┤          Workspace           │
└────────┬─────────┘               └──────────────────────────────┘
         │
         │ (Has Many)
         ▼
┌──────────────────┐               ┌──────────────────────────────┐
│     Project      │◄─────────────►│      ProjectMembership       │
└────────┬─────────┘               └──────────────┬───────────────┘
         │                                        │
         │ (Has Many)                             │ (Assignee/Reporter)
         ▼                                        ▼
┌──────────────────┐                       ┌──────────────┐
│       Task       │◄──────────────────────┤     User     │
└────────┬─────────┘                       └──────────────┘
         │
         │ (Has Many - Phase 6)
         ▼
┌──────────────────┐
│     Comment      │
└──────────────────┘
```

---

## 2. Implemented Collections (Phase 1 - Phase 9)

### 1. `User` Collection (`users`)
Stores developer and manager identities, credentials, and linked third-party metadata.
- **Indexes:** `{ email: 1 }` (Unique), `{ githubId: 1 }` (Sparse).

### 2. `Workspace` Collection (`workspaces`)
The top-level multi-tenant container for projects, members, and organizational settings.
- **Indexes:** `{ slug: 1 }` (Unique), `{ ownerId: 1 }`.

### 3. `WorkspaceMembership` Collection (`workspacememberships`)
Junction collection governing multi-tenant access control and organizational roles (`admin`, `member`, `guest`).
- **Compound Index:** `{ workspaceId: 1, userId: 1 }` (Unique).

### 4. `Project` Collection (`projects`)
Project container grouping Kanban tasks, sprints, milestones, and Git activity.
- **Fields:** `name`, `key`, `description`, `workspaceId`, `ownerId`, `status`, `visibility`, `startDate`, `endDate`, `githubRepo` (`{ owner, repo, fullName, connectedAt, webhookId }`).
- **Compound Indexes:** `{ workspaceId: 1, key: 1 }` (Unique), `{ workspaceId: 1, status: 1 }`, `{ 'githubRepo.fullName': 1 }`.

### 5. `ProjectMembership` Collection (`projectmemberships`)
Granular project-level access control and team member role mapping (`pm`, `developer`, `viewer`).
- **Compound Indexes:** `{ projectId: 1, userId: 1 }` (Unique), `{ workspaceId: 1, userId: 1 }`.

### 6. `Counter` Collection (`counters`)
Atomic concurrency-safe sequence generator for task keys (`FLOW-101`) (DEC-005).
- **Index:** `{ name: 1 }` (Unique).

### 7. `Task` Collection (`tasks`)
The core work item in DevFlow: tracks title, sanitized description, Kanban column, fractional index, points, assignee, and Git associations.

| Field | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `_id` | `ObjectId` | Primary Key, Auto | Unique document identifier. |
| `taskKey` | `String` | Required, Unique, Indexed | Scoped sequential identifier (`FLOW-101`). |
| `title` | `String` | Required, Max 200, Trim | Concise task title. |
| `description` | `String` | Optional, Max 20000 | DOMPurify-sanitized Markdown description. |
| `projectId` | `ObjectId` | Ref: `Project`, Required, Indexed | Parent project reference. |
| `workspaceId` | `ObjectId` | Ref: `Workspace`, Required, Indexed | Parent workspace reference (BOLA defense). |
| `status` | `String` | Enum: `['backlog', 'to_do', 'in_progress', 'review', 'done']` | Current Kanban column position. |
| `priority` | `String` | Enum: `['low', 'medium', 'high', 'urgent']` | Urgency indicator (Default: `'medium'`). |
| `orderIndex` | `Number` | Required, Double, Indexed | Fractional order index for $O(1)$ Lexorank drag-and-drop. |
| `storyPoints` | `Number` | Optional, Min 0, Max 100 | Scrum story points estimation. |
| `assigneeId` | `ObjectId` | Ref: `User`, Optional, Indexed | Assigned developer. |
| `reporterId` | `ObjectId` | Ref: `User`, Required, Indexed | Task author/creator. |
| `sprintId` | `ObjectId` | Ref: `Sprint`, Optional, Indexed | Associated sprint iteration. |
| `milestoneId` | `ObjectId` | Ref: `Milestone`, Optional, Indexed | Associated delivery milestone. |
| `dueDate` | `Date` | Optional, Indexed | Completion deadline. |
| `labels` | `[String]` | Array of strings, Indexed | Custom search tags (`frontend`, `api`, `bug`). |
| `githubCommits` | `[Object]` | Array of commit objects | Linked commits (`commitHash`, `message`, `author`, `url`). |
| `githubPullRequests` | `[Object]` | Array of PR objects | Linked PRs (`prNumber`, `prUrl`, `title`, `state`). |

- **Compound Indexes:**
  - `{ projectId: 1, status: 1, orderIndex: 1 }` — High-performance Kanban column rendering.
  - `{ workspaceId: 1, assigneeId: 1 }` — Developer workload telemetry across projects.

### 8. `Comment` Collection (`comments`)
Normalized collection storing discussion threads, markdown comments, and user mentions on tasks (DEC-002).
- **Fields:** `taskId`, `projectId`, `workspaceId`, `authorId`, `content` (sanitized markdown), `mentions` (`[ObjectId]`), `attachments` (`[{ name, url, size, mimeType }]`), `createdAt`, `updatedAt`.
- **Compound Indexes:**
  - `{ taskId: 1, createdAt: 1 }` — Ascending chronological task comment threads.

### 9. `Notification` Collection (`notifications`)
User notification inbox storing in-app alerts for user mentions, task assignments, status changes, and GitHub PR reviews.
- **Fields:** `recipientId`, `senderId`, `workspaceId`, `projectId`, `type` (`mention`, `assignment`, `comment`, `status_change`, `pr_review`), `title`, `message`, `link`, `read`, `createdAt`.
- **Compound Indexes:**
  - `{ recipientId: 1, read: 1, createdAt: -1 }` — Fast retrieval of unread notifications ordered by date.

### 10. `ActivityLog` Collection (`activitylogs`)
Immutable append-only audit trail recording user and system actions across projects and tasks.
- **Fields:** `projectId`, `workspaceId`, `taskId`, `actorId`, `action` (`task:created`, `task:moved`, `comment:added`, etc.), `details` (`Mixed`), `createdAt`.
- **Compound Indexes:**
  - `{ projectId: 1, createdAt: -1 }` — Project activity feed.
  - `{ taskId: 1, createdAt: -1 }` — Task-specific audit history.

### 11. `GitHubIntegration` Collection (`githubintegrations`)
Stores encrypted OAuth credentials and integration metadata for GitHub account synchronization (DEC-006).
- **Fields:** `workspaceId`, `userId`, `githubUserId`, `githubUsername`, `githubEmail`, `githubAvatar`, `encryptedAccessToken` (`iv:authTag:ciphertext`), `scopes`, `installationId`, `connectedAt`.
- **Security Constraint:** `encryptedAccessToken` is explicitly scrubbed during JSON transformation (`toJSON`) and is never sent to the client browser.
- **Compound Indexes:**
  - `{ workspaceId: 1, userId: 1 }` (Unique) — One integration per user per workspace.
  - `{ workspaceId: 1, githubUsername: 1 }` — Workspace account lookup.

### 12. `WebhookEvent` Collection (`webhookevents`)
Idempotent delivery ledger preventing duplicate webhook processing and race conditions (DEC-008).
- **Fields:** `deliveryId` (`X-GitHub-Delivery`), `event` (`push`, `pull_request`, `ping`), `action`, `sender`, `repository`, `status` (`processed`, `duplicate_skipped`, `failed`), `payloadSummary`, `error`, `processedAt`.
- **Indexes:**
  - `{ deliveryId: 1 }` (Unique) — Idempotency constraint.
  - `{ createdAt: 1 }` with `expireAfterSeconds: 2592000` (30-day automatic TTL document cleanup).

### 13. `Sprint` Collection (`sprints`)
Governs Scrum iterations, committed velocity, and automated rollover (DEC-010).
- **Fields:** `name`, `projectId`, `workspaceId`, `goal`, `status` (`planned`, `active`, `completed`), `startDate`, `endDate`, `totalStoryPoints`, `completedStoryPoints`, `startedAt`, `completedAt`.
- **Business Constraint:** Strict 3-state finite lifecycle. Maximum ONE active sprint allowed per project.
- **Compound Indexes:**
  - `{ projectId: 1, status: 1 }`
  - `{ projectId: 1, createdAt: -1 }`

### 14. `Milestone` Collection (`milestones`)
Tracks high-level delivery targets, release deadlines, and aggregate completion telemetry across linked tasks.
- **Fields:** `title`, `description`, `projectId`, `workspaceId`, `dueDate`, `status` (`open`, `completed`), `completedAt`.
- **Compound Indexes:**
  - `{ projectId: 1, dueDate: 1 }`
  - `{ projectId: 1, status: 1 }`
