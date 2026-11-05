# DevFlow — System Impact Map (IMPACT-MAP.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Evaluated Architecture:** Decoupled Modern SaaS (React 18 SPA + Express.js REST API v1 + Socket.IO + MongoDB 7.x)  
**Maintenance Rule:** This document maps verified dependencies and ripples across the codebase. Review this document BEFORE modifying any shared service, controller, model, middleware, or socket event handler.

---

## 1. Purpose

This Impact Map protects DevFlow against breaking regressions, corrupted fractional card positions, privilege escalation across workspace/project boundaries, leaked OAuth credentials, broken webhook idempotency, and WebSocket room cross-talk.

Whenever an engineer or AI agent modifies a core file or function, this map provides an auditable, pre-verified breakdown of:
- Direct consumers that will break if method signatures or return types change.
- Indirect consumers affected through events, state transitions, or database hooks.
- Security and authorization boundaries that could be invalidated.
- Test suites that must be re-executed before releasing changes.

---

## 2. Component Impact Maps

### Component 1: `server/src/services/kanbanService.js` → `calculateFractionalOrder()` & `moveCard()`
- **Role:** Computes $O(1)$ floating-point order indexes for Kanban cards during drag-and-drop operations and triggers background precision re-balancing when difference $< 0.000001$.
- **Directly affected:**
  - `server/src/controllers/taskController.js` (`moveTask`)
  - `server/src/sockets/taskSocket.js` (`emitTaskMoved`)
  - `server/src/models/Task.js` (`orderIndex` update)
- **Potentially affected:**
  - `client/src/components/kanban/KanbanBoard.jsx` (dnd-kit drag-and-drop ordering).
  - `client/src/store/useKanbanStore.js` (optimistic card position updating).
  - `server/src/services/activityService.js` (records card transition in `ActivityLog`).
- **API impact:** `PATCH /api/v1/tasks/:id/move`. Expects `{ columnId, prevOrderIndex, nextOrderIndex }`. Returns `{ success: true, task: { id, status, orderIndex } }`.
- **Data impact:** Updates single `Task` document with `{ status: columnId, orderIndex: newCalculatedOrder }`. Zero other cards in the collection are modified.
- **Security impact:** Must verify requesting user holds at least `Developer` or `PM` role in the parent project. Rejects `Viewer` or non-members with `403 Forbidden`.
- **Runtime impact:** Fires Socket.IO broadcast `task:moved` to room `project_<projectId>` containing `{ taskId, status, orderIndex }`.
- **Frontend impact:** Causes instantaneous re-ordering of card on all active team members' screens without full board re-fetch.
- **Tests to review:** `server/tests/kanbanFractional.test.js`, `server/tests/kanbanRebalance.test.js`.
- **Infrastructure impact:** None. Eliminates bulk write locks in MongoDB.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 4 (Kanban Board Mechanics & Fractional Indexing Algorithm).

---

### Component 2: `server/src/middleware/rbac.js` → `requireWorkspaceRole()` & `requireProjectRole()`
- **Role:** Gatekeeper enforcing the two-tier hierarchical authorization model (Workspace Level: Admin, Member, Guest; Project Level: PM, Developer, Viewer) and defending against Broken Object Level Authorization (BOLA).
- **Directly affected:**
  - All route handlers in `server/src/routes/projectRoutes.js`
  - All route handlers in `server/src/routes/taskRoutes.js`
  - All route handlers in `server/src/routes/sprintRoutes.js`
  - All route handlers in `server/src/routes/githubRoutes.js`
- **Potentially affected:**
  - Client navigation guards (`client/src/components/common/ProtectedRoute.jsx`).
  - Action buttons rendering (Create Task, Start Sprint, Settings) based on permissions.
- **API impact:** Intercepts incoming requests. Validates `req.user.id` against `WorkspaceMembership` and `ProjectMembership`. Returns `401 Unauthorized` (no token) or `403 Forbidden` (insufficient role).
- **Data impact:** None directly; queries `WorkspaceMembership` and `ProjectMembership` with compound index `{ workspaceId: 1, userId: 1 }` and `{ projectId: 1, userId: 1 }`.
- **Security impact:** Core security boundary. A bug or bypass here exposes private source code links, tickets, and repository configurations to unauthorized guests.
- **Runtime impact:** Executes synchronously on every protected API call.
- **Frontend impact:** Displays permission-denied toasts or redirects unauthorized users away from restricted project dashboards.
- **Tests to review:** `server/tests/rbac.test.js`, `server/tests/bolaDefense.test.js`.
- **Infrastructure impact:** Database read load mitigated by indexing membership collections.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 3 (Two-Tier Hierarchical RBAC & Security Boundaries).

---

### Component 3: `server/src/services/sequenceService.js` → `getNextTaskKey()`
- **Role:** Generates concurrency-safe, gapless, human-readable task identifiers (`FLOW-101`, `DEV-204`) using atomic MongoDB counter operations.
- **Directly affected:**
  - `server/src/controllers/taskController.js` (`createTask`)
  - `server/src/models/Counter.js`
- **Potentially affected:**
  - GitHub commit message parser (`server/src/services/githubWebhookService.js`).
  - Task search, URL routing (`/projects/:key/tasks/:taskKey`), and breadcrumbs.
- **API impact:** Included in payload of `POST /api/v1/projects/:id/tasks`. Response includes `{ taskKey: "FLOW-101", ... }`.
- **Data impact:** Atomically increments `Counter.seq` where `name = 'project_counter_<projectId>'`. Sets unique `taskKey` on `Task` document.
- **Security impact:** Non-sensitive sequential counter. Task access is strictly guarded by RBAC checks on every route regardless of predictable keys.
- **Runtime impact:** Single atomic document write with zero multi-document locking overhead.
- **Frontend impact:** Displayed as primary chip badge on task cards, PR status indicators, and modal headers.
- **Tests to review:** `server/tests/sequenceConcurrency.test.js`.
- **Infrastructure impact:** Minimal.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 2, Chapter 7, and Chapter 12.

---

### Component 4: `server/src/services/githubService.js` → `encryptToken()` & `decryptToken()`
- **Role:** Encrypts and decrypts GitHub OAuth personal access tokens using AES-256-GCM with unique Initialization Vectors (IV) and authentication tags.
- **Directly affected:**
  - `server/src/controllers/githubAuthController.js` (`oauthCallback`)
  - `server/src/services/githubApiService.js` (making authenticated GitHub REST API calls)
  - `server/src/models/GitHubIntegration.js`
- **Potentially affected:**
  - Repository branch listing, commit fetching, and webhook creation.
- **API impact:** Protects stored credentials during `GET /api/v1/github/oauth/callback`. Raw tokens are never returned over REST APIs.
- **Data impact:** Stores formatted string `${iv}:${authTag}:${encryptedData}` in `GitHubIntegration.encryptedAccessToken`.
- **Security impact:** Protects third-party repository read/write credentials from database dump leakage or SQL/NoSQL injection exposure.
- **Runtime impact:** Lightweight Node.js native cryptographic calculation.
- **Frontend impact:** Client only sees boolean integration status `{ isConnected: true, repository: 'org/repo' }`.
- **Tests to review:** `server/tests/cryptoToken.test.js`.
- **Infrastructure impact:** Depends on `GITHUB_TOKEN_ENCRYPTION_KEY` environment variable.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 6 (GitHub Integration Architecture) and Chapter 11.

---

### Component 5: `server/src/middleware/verifyWebhook.js` → `verifyGitHubWebhookSignature()`
- **Role:** Intercepts incoming GitHub webhooks and validates the `X-Hub-Signature-256` header against the raw body buffer using HMAC-SHA256 and `crypto.timingSafeEqual`.
- **Directly affected:**
  - `server/src/routes/githubWebhookRoutes.js` (`POST /api/v1/github/webhooks`)
  - `server/src/controllers/githubWebhookController.js`
- **Potentially affected:**
  - Automated task status transitions on PR merges and commit pushes.
- **API impact:** Public unauthenticated endpoint. Returns `401 Unauthorized` with `{ error: 'Invalid signature' }` if HMAC check fails.
- **Data impact:** None on failure. Passes valid raw buffer to webhook controller.
- **Security impact:** Prevents unauthorized external parties from spoofing GitHub webhooks to close tasks, inject fake commits, or manipulate sprint velocity.
- **Runtime impact:** Performs SHA256 digest computation per incoming webhook payload.
- **Frontend impact:** Webhook trigger pushes real-time updates to connected Kanban clients via Socket.IO.
- **Tests to review:** `server/tests/webhookSignature.test.js`.
- **Infrastructure impact:** Raw buffer capture requires specialized Express body parser configuration before standard JSON parser.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 6 and Chapter 11.

---

### Component 6: `server/src/controllers/githubWebhookController.js` → `handleWebhookEvent()` & Idempotency Engine
- **Role:** Deduplicates webhook deliveries via `X-GitHub-Delivery` UUIDs, parses commit messages for task keys (`[KEY-SEQ]`), updates task status, and links commit hashes.
- **Directly affected:**
  - `server/src/models/WebhookEvent.js` (records processed delivery UUID)
  - `server/src/models/Task.js` (appends commit to `githubCommits` array)
  - `server/src/models/ActivityLog.js` (logs external GitHub event)
  - `server/src/sockets/taskSocket.js` (`emitGitHubSync`)
- **Potentially affected:**
  - Kanban board card column position (e.g. moving task to `review` when PR is opened, or `done` when merged).
  - Sprint velocity calculation.
- **API impact:** Incoming `POST /api/v1/github/webhooks`. Returns `200 OK` with `{ status: 'processed' }` or `{ status: 'ignored_duplicate' }`.
- **Data impact:** Inserts record into `WebhookEvent`. Updates matching `Task` documents.
- **Security impact:** Ensures duplicate requests do not cause replay attacks or race conditions.
- **Runtime impact:** Regex matching on commit messages (`/([A-Z0-9]+-\d+)/g`).
- **Frontend impact:** Pushes live Git badge and commit link into Task Detail drawer and shifts Kanban card position.
- **Tests to review:** `server/tests/webhookIdempotency.test.js`, `server/tests/commitParser.test.js`.
- **Infrastructure impact:** Dependent on MongoDB unique index on `WebhookEvent.deliveryId`.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 6 (Webhook Ingestion & Signature Verification).

---

### Component 7: `server/src/services/sprintService.js` → `startSprint()`, `completeSprint()`, `calculateBurndown()`
- **Role:** Governs sprint transitions (`Planned` → `Active` → `Completed`), enforces single active sprint rule, executes automated task rollover, and calculates ideal vs actual burndown metrics.
- **Directly affected:**
  - `server/src/controllers/sprintController.js`
  - `server/src/controllers/analyticsController.js` (`getBurndownData`)
  - `server/src/models/Sprint.js`
  - `server/src/models/Task.js` (`sprintId` reassignment on rollover)
- **Potentially affected:**
  - `client/src/components/charts/BurndownChart.jsx` (Recharts burndown curve).
  - `client/src/components/sprints/SprintPlanningModal.jsx`.
- **API impact:**
  - `PATCH /api/v1/sprints/:id/start`
  - `PATCH /api/v1/sprints/:id/complete` (Expects `{ rolloverTargetSprintId?: string }`)
  - `GET /api/v1/projects/:id/analytics/burndown`
- **Data impact:** Updates `Sprint.status`, `Sprint.actualPointsCompleted`, and reassigns incomplete tasks (`status !== 'done'`) to backlog or next sprint.
- **Security impact:** Only Project Managers and Workspace Admins are authorized to initiate or terminate sprints.
- **Runtime impact:** Emits `sprint:started` and `sprint:completed` to room `project_<projectId>`.
- **Frontend impact:** Switches Kanban board view to active sprint filter, updates velocity history charts.
- **Tests to review:** `server/tests/sprintLifecycle.test.js`, `server/tests/burndownEngine.test.js`.
- **Infrastructure impact:** None.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 5 (Sprint Management & Milestone Velocity Engine).

---

### Component 8: `server/src/sockets/socketManager.js` → Room Routing & Connection Lifecycle
- **Role:** Manages real-time WebSocket mesh, authenticates JWT connections, binds clients to authorized rooms (`workspace_<id>`, `project_<id>`, `task_<id>`, `user_<id>`), and handles graceful disconnects.
- **Directly affected:**
  - `server/src/index.js` (Socket.IO server attachment)
  - All event emitters across `taskService`, `kanbanService`, `commentService`, `sprintService`
- **Potentially affected:**
  - `client/src/services/socket.js` (singleton connection client)
  - `client/src/store/useKanbanStore.js` (real-time listeners)
- **API impact:** WebSocket handshake over `/socket.io/`. Authenticates via cookie JWT or auth header.
- **Data impact:** None. In-memory socket room tracking.
- **Security impact:** Prevents unauthorized eavesdropping on project activity by verifying project membership before permitting `socket.join('project_' + projectId)`.
- **Runtime impact:** High-concurrency event routing over Node.js event loop.
- **Frontend impact:** Powers all live card drags, typing indicators, assignment badges, and comment pushes.
- **Tests to review:** `server/tests/socketRooms.test.js`, `server/tests/socketAuth.test.js`.
- **Infrastructure impact:** Requires WebSocket sticky sessions if scaled across multiple horizontal Node.js containers.
- **Confidence:** Verified.
- **Evidence:** Documented in Chapter 8 (Real-Time Event-Driven Architecture).

---

## 3. Critical Change Paths

| Component / Function | Affected Areas | Reason | System Risk |
| :--- | :--- | :--- | :---: |
| **`kanbanService.js` (`calculateFractionalOrder`)** | Task schema, DragOverlay, WebSocket sync, MongoDB | Central to all board interactions. Corrupted ordering disrupts visual card layout across all clients. | **CRITICAL** |
| **`rbac.js` (`requireProjectRole`)** | All API routes, project boards, sprints, tasks | Enforces data isolation between organizations, teams, and external guests. | **CRITICAL** |
| **`verifyWebhook.js` (`verifyGitHubWebhookSignature`)** | Webhook ingest, commit parser, task auto-close | Any breakage blocks live GitHub commit linking or exposes the system to signature forgery. | **CRITICAL** |
| **`sequenceService.js` (`getNextTaskKey`)** | Task creation, GitHub commit regex, board URLs | Race conditions produce duplicate task keys (`FLOW-101`), corrupting task identification. | **HIGH** |
| **`githubService.js` (`encryptToken` / `decryptToken`)** | OAuth handshake, GitHub REST calls | Key corruption invalidates all third-party repository integrations. | **HIGH** |
| **`socketManager.js` (`roomRouting`)** | Live updates, card movements, notifications | Unchecked room joins cause information leakage across tenant project boundaries. | **HIGH** |

---

## 4. Change-Impact Checklist

Before deploying changes to any mapped component, verify:
- [ ] Direct consumer function signatures verified and unchanged.
- [ ] Indirect listeners and event handlers confirmed compatible.
- [ ] REST API contract (`/api/v1`) backwards compatibility preserved.
- [ ] MongoDB schema validation, compound indexes, and atomic updates verified.
- [ ] Two-tier RBAC rules and BOLA object ownership checks tested.
- [ ] Background workers and idempotency ledgers verified.
- [ ] Client Zustand stores and TanStack Query cache invalidations checked.
- [ ] Automated Vitest and Supertest test suites executed with exit code 0.
- [ ] Environment variable dependencies (`GITHUB_TOKEN_ENCRYPTION_KEY`, `WEBHOOK_SECRET`) validated.
- [ ] Critical user journeys (Workspace creation → Project setup → Card drag → Webhook ingest) verified.

---

## 5. Unknown Dependencies & Unverified Areas

The following areas require explicit verification upon code implementation:
1. **WebSocket Cluster Redis Adapter:** If scaled horizontally across multiple Node.js instances, an external `@socket.io/redis-adapter` will be required to sync room broadcasts between cluster nodes.
2. **GitHub Webhook Rate Limits:** High-frequency commit pushes on massive repositories may require an asynchronous message queue (e.g. BullMQ) to avoid blocking the webhook listener event loop.
