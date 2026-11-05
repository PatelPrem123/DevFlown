# 🚀 DEVFLOW (ENGINEERING WORKSPACE)
### Developer Project Management & Agile Team Collaboration Platform
**Complete Technical Architecture, Database Schemas, GitHub Integration & Real-Time Specifications**  
*Version: 1.0.0 (Production Release) | Tech Stack: React 18, Vite, Node.js, Express, MongoDB, Socket.IO, dnd-kit, GitHub REST/OAuth*

---

> ### 📌 CORE MISSION & EXECUTIVE STATEMENT
> **DevFlow** is a production-grade, developer-centric project management and collaboration platform engineered to eliminate friction between engineering task tracking and real-world code repositories. Combining drag-and-drop Kanban orchestration with automated GitHub commit/PR synchronization, fractional indexing, sprint burndown telemetry, and hierarchical two-tier authorization, DevFlow unifies agile planning with live developer activity in a secure, real-time workspace.

---

## 📋 System Metadata & Specifications

| Attribute | System Specification |
| :--- | :--- |
| **Project Name** | DevFlow (Enterprise Agile Platform v1.0.0) |
| **System Architecture** | Decoupled Modern SaaS (RESTful API v1 + WebSocket Event Mesh + Webhook Ingestion) |
| **Frontend Tech Stack** | React 18, Vite, React Router v6, Tailwind CSS, dnd-kit, TanStack Query, Zustand, Recharts |
| **Backend Tech Stack** | Node.js (LTS), Express.js, Socket.IO, JWT, Bcrypt, Zod Validation, Crypto (AES-256) |
| **Database Layer** | MongoDB 7.x with Mongoose ODM (Atomic Counter Collections, Compound Indexes, BOLA Defense) |
| **Third-Party Integrations** | GitHub REST API v3, GitHub OAuth 2.0, GitHub Webhooks (HMAC-SHA256 Signatures) |
| **Target Capabilities** | Two-Tier RBAC, Drag-and-Drop Kanban with Fractional Indexing, GitHub Commit/PR Linking, Sprint Burndown Analytics |

---

## 📑 Table of Contents

- [Chapter 1: Executive Overview & Product Definition](#chapter-1-executive-overview--product-definition)
- [Chapter 2: High-Level System Topology & Architecture](#chapter-2-high-level-system-topology--architecture)
- [Chapter 3: Two-Tier Hierarchical RBAC & Security Boundaries](#chapter-3-two-tier-hierarchical-rbac--security-boundaries)
- [Chapter 4: Kanban Board Mechanics & Fractional Indexing Algorithm](#chapter-4-kanban-board-mechanics--fractional-indexing-algorithm)
- [Chapter 5: Sprint Management & Milestone Velocity Engine](#chapter-5-sprint-management--milestone-velocity-engine)
- [Chapter 6: GitHub Integration Architecture (OAuth & Webhooks)](#chapter-6-github-integration-architecture-oauth--webhooks)
- [Chapter 7: Database Architecture & Complete Mongoose Schemas](#chapter-7-database-architecture--complete-mongoose-schemas)
- [Chapter 8: Real-Time Event-Driven Architecture (Socket.IO)](#chapter-8-real-time-event-driven-architecture-socketio)
- [Chapter 9: Complete REST API Specification (/api/v1)](#chapter-9-complete-rest-api-specification-apiv1)
- [Chapter 10: Production Directory Architecture & Modular Inventory](#chapter-10-production-directory-architecture--modular-inventory)
- [Chapter 11: Enterprise Security Hardening & Threat Mitigation](#chapter-11-enterprise-security-hardening--threat-mitigation)
- [Chapter 12: QA Automation & Automated Testing Strategy](#chapter-12-qa-automation--automated-testing-strategy)
- [Chapter 13: 12-Phase Engineering Implementation Roadmap](#chapter-13-12-phase-engineering-implementation-roadmap)

---

## Chapter 1: Executive Overview & Product Definition

In modern engineering teams, Jira or Linear often feel disconnected from the developer's daily reality inside IDEs, terminal windows, and GitHub PRs. Developers frequently forget to update tickets because doing so requires context switching out of their development flow.

**DevFlow** bridges this operational gap by binding agile sprint planning directly to code commits, pull requests, and branch workflows:

1. **Automated Git-to-Board Synchronization:** Commits referencing task keys (e.g. `[DEV-104] Fix memory leak in auth worker`) automatically link to the corresponding task, updating status and embedding commit hashes.
2. **Two-Tier Enterprise Governance:** Multi-workspace tenancy with granular project-level role permissions ensures contractors and guests cannot access confidential internal codebases.
3. **High-Performance Kanban Drag-and-Drop:** Powered by fractional indexing (Lexorank algorithm), moving a card persists in $O(1)$ time without updating entire column arrays in MongoDB.
4. **Live Real-Time Collaboration:** Authenticated WebSocket mesh synchronizes board movements, comments, mentions, and blocker alerts instantaneously across all active members.
5. **Agile Velocity & Burndown Telemetry:** Automated calculation of story points completed, sprint velocity, developer workloads, and mathematical burndown progress.

---

## Chapter 2: High-Level System Topology & Architecture

DevFlow implements a decoupled 3-tier micro-modular architecture:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          CLIENT PRESENTATION TIER                                 │
│      React 18 + Vite SPA  •  Tailwind CSS  •  dnd-kit  •  TanStack Query          │
│  [Workspace Directory]   [Interactive Kanban Board]   [Sprint Burndown Charts]    │
└────────────────────────┬──────────────────────────────────┬───────────────────────┘
                         │ HTTPS REST Requests (/api/v1)   │ Bi-directional WebSockets
                         ▼                                  ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION, GATEWAY & REAL-TIME TIER                         │
│  Express.js API Gateway  •  Helmet / Rate Limiting  •  JWT Auth  •  Zod Guards   │
│  ├── Workspace & Project RBAC Middleware (BOLA Defense)                          │
│  ├── Kanban & Fractional Indexing Service (O(1) drag-and-drop persistence)        │
│  ├── GitHub Integration Service (OAuth 2.0, AES-256 token encryption)            │
│  ├── GitHub Webhook Ingest Engine (HMAC-SHA256 signature verification)            │
│  └── Socket.IO Real-Time Mesh (Rooms: workspace_<id>, project_<id>, task_<id>)   │
└────────────────────────┬──────────────────────────────────────────────────────────┘
                         │ Mongoose ODM Operations (Atomic Operations & Compound Indexes)
                         ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           DATA PERSISTENCE TIER                                   │
│  MongoDB 7.x Database Cluster                                                    │
│  ├── Users & Workspaces              ├── Projects & ProjectMemberships            │
│  ├── Tasks (KEY-SEQ, Fractional Pos) ├── Sprints & Milestones                     │
│  ├── Comments & ActivityLogs         ├── GitHubIntegrations (Encrypted Tokens)    │
│  └── WebhookEvents (Idempotency)     └── Counters (Atomic Sequence Generators)    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Chapter 3: Two-Tier Hierarchical RBAC & Security Boundaries

Access control is enforced via a two-tier organizational hierarchy:

### 1. Workspace-Level Roles (Organization Scope)
* **Workspace Administrator:** Complete organization control. Manages projects, invites members, configures billing, and edits workspace settings.
* **Workspace Member:** Standard member. Can view public workspace projects and participate in assigned projects.
* **Workspace Guest:** External contractor. Can only access projects to which they are explicitly invited.

### 2. Project-Level Roles (Project Scope)
* **Project Manager (PM):** Full management authority over the project. Creates sprints, defines milestones, links GitHub repositories, and assigns tasks.
* **Developer / Team Member:** Active contributor. Creates and edits tasks, drags Kanban cards, posts comments, and links Git branches/PRs.
* **Viewer:** Read-only stakeholder. Inspects boards, reports, and activity feeds without edit permissions.

### Hierarchical RBAC Permission Matrix

| Capability | Workspace Admin | Project Manager | Developer | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| **Create New Project** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Invite Workspace Members** | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied |
| **Configure GitHub Integrations** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Create Sprints & Milestones** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Create & Assign Tasks** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Move Tasks on Kanban (Drag)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Post Comments & Mentions** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Attach Files to Tasks** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ Denied |
| **Close Sprints & Generate Reports** | ✅ Allowed | ✅ Allowed | ❌ Denied | ❌ Denied |
| **Export CSV / Excel Project Data** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **View Kanban Board & Roadmap** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Delete Project / Workspace** | ✅ Allowed (Admin) | ❌ Denied | ❌ Denied | ❌ Denied |

---

## Chapter 4: Kanban Board Mechanics & Fractional Indexing Algorithm

Standard drag-and-drop implementations store ordered arrays of task IDs inside column documents. When a card moves from position 50 to position 2, the server must update 48 separate documents, leading to write locks and race conditions.

DevFlow implements **Fractional Indexing** (Lexorank algorithm):

```
Column: IN PROGRESS
┌─────────────────────────┐  orderIndex: 1000.0
│ Task DEV-101            │
└─────────────────────────┘
            ▼  (Dropped here -> newOrder = (1000.0 + 2000.0) / 2 = 1500.0)
┌─────────────────────────┐  orderIndex: 2000.0
│ Task DEV-102            │
└─────────────────────────┘
┌─────────────────────────┐  orderIndex: 3000.0
│ Task DEV-103            │
└─────────────────────────┘
```

1. **Midpoint Calculation:** Moving Card C between Card A ($1000.0$) and Card B ($2000.0$) computes $\text{newOrder} = 1500.0$.
2. **Single-Document $O(1)$ Update:** The server only updates Card C with `{ status: 'in_progress', orderIndex: 1500.0 }`. Zero other cards are touched in MongoDB!
3. **Boundary Placement:** Dropping at the top sets $\text{lowestOrder} - 1000.0$; dropping at the bottom sets $\text{highestOrder} + 1000.0$.
4. **Precision Re-balancing Guard:** If the difference between adjacent orders drops below $0.000001$, a background worker re-spaces the column cards evenly ($1000, 2000, 3000\dots$), maintaining floating-point precision.

### Kanban Column Lifecycle

| Column ID | Display Name | Agile Meaning & Transition Guard | Allowed Next Columns |
| :--- | :--- | :--- | :--- |
| `backlog` | Backlog | Unrefined product requirements awaiting sprint triage. | `to_do` |
| `to_do` | To Do | Scheduled for current sprint; ready for developer pickup. | `in_progress`, `backlog` |
| `in_progress` | In Progress | Actively being developed by assigned engineer. | `review`, `to_do` |
| `review` | In Review | Pull Request opened; peer code review / QA ongoing. | `done`, `in_progress` |
| `done` | Done | PR merged and validated; story points credited to velocity. | `review` |

---

## Chapter 5: Sprint Management & Milestone Velocity Engine

### Sprint Lifecycle
1. **Planning (`Planned`):** PM sets sprint goal, start/end dates, and allocates backlog tasks with story points (Fibonacci sequence: 1, 2, 3, 5, 8, 13).
2. **Activation (`Active`):** Sprint is launched. Exactly one sprint may be active per project.
3. **Completion (`Completed`):** PM completes sprint. DevFlow computes completed velocity vs carry-over debt, automatically rolling over unfinished tasks to the backlog or next sprint.

### Sprint Burndown Formulation
* **Total Effort:** $S_{\text{total}} = \sum \text{StoryPoints of all sprint tasks at launch}$
* **Ideal Daily Burn:** $\text{Burn}_{\text{ideal}}(\text{day}) = S_{\text{total}} - \left(\frac{S_{\text{total}}}{\text{SprintDays}}\right) \times \text{day}$
* **Actual Remaining:** $\text{Burn}_{\text{actual}}(\text{day}) = S_{\text{total}} - \sum \text{StoryPoints of tasks with status} = \text{'done'}$

---

## Chapter 6: GitHub Integration Architecture (OAuth & Webhooks)

```
Developer Push/PR                  GitHub Webhook Engine                    DevFlow Server
      │                                     │                                     │
      ├───── git commit -m "[DEV-42]..." ──►│                                     │
      │                                     ├───── POST /github/webhooks ────────►│
      │                                     │      (X-Hub-Signature-256)          ├─► 1. Verify HMAC-SHA256
      │                                     │                                     ├─► 2. Check Idempotency UUID
      │                                     │                                     ├─► 3. Parse [DEV-42] Key
      │                                     │                                     ├─► 4. Append Commit/PR to Task
      │                                     │◄──── HTTP 200 OK ───────────────────┤
      │                                     │                                     ├─► 5. Socket.IO Broadcast to Board
```

### 1. OAuth 2.0 Security & Token Cipher
* **CSRF Protection:** Signed state cookie generated with `crypto.randomBytes(32).toString('hex')`.
* **AES-256-GCM Encryption:** GitHub personal access tokens are encrypted with AES-256-GCM before database write. Secret master key never leaves the server environment.

### 2. Webhook Ingestion & Signature Verification
* **HMAC-SHA256 Check:** Headers contain `X-Hub-Signature-256`. DevFlow computes signature and compares using `crypto.timingSafeEqual` to prevent timing attacks.
* **Idempotency Deduplication:** The `X-GitHub-Delivery` UUID is logged in `WebhookEvent`. Re-deliveries immediately return `HTTP 200 OK` without re-processing.
* **Automatic Linkage:** Commit messages parsed via `/([A-Z0-9]+-\d+)/g`. Commits and PRs attach directly to task activity timelines.

---

## Chapter 7: Database Architecture & Complete Mongoose Schemas

### 13 Normalized Mongoose Schemas:
1. **User** — Identity, bcrypt credentials, avatar, linked GitHub username.
2. **Workspace** — Tenant entity, organization slug, owner reference.
3. **WorkspaceMembership** — User-to-Workspace junction with organization roles.
4. **Project** — Project container with unique key (`FLOW`, `DEV`), dates, visibility.
5. **ProjectMembership** — User-to-Project junction with project roles (PM, Developer, Viewer).
6. **Task** — Core work item: scoped identifier (`KEY-SEQ`), status, priority, orderIndex, story points.
7. **Comment** — Threaded comments supporting `@mentions` and attachments.
8. **Sprint** — Time-boxed iterations, goals, dates, velocity scores.
9. **Milestone** — High-level deliverables grouping tasks and deadlines.
10. **ActivityLog** — Standalone append-only timeline events (never embedded unbounded).
11. **Notification** — In-app alerts for assignments, mentions, and PR reviews.
12. **GitHubIntegration** — Encrypted credentials, webhook IDs, linked repository slugs.
13. **WebhookEvent** — Idempotency ledger storing processed GitHub delivery UUIDs.

---

## Chapter 8: Real-Time Event-Driven Architecture (Socket.IO)

### Room Channels
* `workspace_<workspaceId>` — Macro organization events (new project, member invite).
* `project_<projectId>` — Board state synchronization (card drag, status update, sprint launch).
* `task_<taskId>` — Modal level collaboration (live comments, typing indicators).
* `user_<userId>` — Private notifications (direct assignments, mentions).

### WebSocket Event Matrix

| Event Name | Emitter | Target Room | Payload Description |
| :--- | :--- | :--- | :--- |
| `task:created` | Task Service | `project_<id>` | Full task document with orderIndex and assignee. |
| `task:moved` | Kanban Service | `project_<id>` | Task ID, oldStatus, newStatus, newOrderIndex. |
| `task:assigned` | Task Service | `user_<assigneeId>` | Task key, title, assignedBy, priority. |
| `comment:created` | Comment Service | `task_<id>` | Comment author, content, timestamp, attachments. |
| `sprint:started` | Sprint Service | `project_<id>` | Sprint ID, name, goal, allocated task count. |
| `github:sync` | Webhook Ingest | `project_<id>` | Task key, commit hash, PR state change alert. |
| `mention:alert` | Comment Service | `user_<mentionedId>` | Comment author, task key, snippet. |

---

## Chapter 9: Complete REST API Specification (/api/v1)

* `POST /api/v1/auth/register` — Register user; creates personal default workspace.
* `POST /api/v1/auth/login` — Authenticate and receive HttpOnly JWT cookie.
* `GET /api/v1/workspaces` & `POST /api/v1/workspaces` — Multi-workspace management.
* `POST /api/v1/workspaces/:id/invitations` — Invite members with workspace roles.
* `GET /api/v1/projects` & `POST /api/v1/projects` — Project CRUD with project keys.
* `GET /api/v1/projects/:id/board` — Fetch Kanban columns with fractional order cards.
* `POST /api/v1/projects/:id/tasks` — Create task with atomic `KEY-SEQ` generation.
* `PATCH /api/v1/tasks/:id/move` — Update card status and orderIndex ($O(1)$ fractional drag).
* `PATCH /api/v1/tasks/:id` — Update task metadata (assignee, points, due date).
* `GET /api/v1/tasks/:id/comments` & `POST /api/v1/tasks/:id/comments` — Threaded comments.
* `GET /api/v1/projects/:id/sprints` & `POST /api/v1/projects/:id/sprints` — Sprint CRUD.
* `PATCH /api/v1/sprints/:id/start` & `PATCH /api/v1/sprints/:id/complete` — Sprint transitions.
* `GET /api/v1/projects/:id/analytics/burndown` — Ideal vs actual burndown telemetry.
* `GET /api/v1/github/oauth/connect` & `GET /api/v1/github/oauth/callback` — OAuth flow.
* `POST /api/v1/github/webhooks` — Public endpoint verifying HMAC-SHA256 signatures.
* `GET /api/v1/projects/:id/reports/export` — Stream CSV/Excel project progress exports.

---

## Chapter 10: Production Directory Architecture & Modular Inventory

```
devflow/
├── server/
│   ├── src/
│   │   ├── config/              # DB connection, env loader, AES cipher keys
│   │   ├── controllers/         # HTTP request handlers (auth, project, task, sprint)
│   │   ├── services/            # Domain logic: Kanban ordering, sprint math, git sync
│   │   ├── models/              # 13 Mongoose schemas
│   │   ├── middleware/          # Two-tier RBAC guards, rate limiters, auth, upload
│   │   ├── validators/          # Zod input schemas
│   │   ├── integrations/        # GitHub Octokit client, OAuth & webhook verification
│   │   ├── sockets/             # Socket.IO connection & room handlers
│   │   └── utils/               # Fractional indexing helpers, CSV export streams
│   └── tests/                   # Vitest & Supertest automated test suites
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── kanban/          # dnd-kit Kanban Board, Column, Card, DragOverlay
│   │   │   ├── sprints/         # Sprint planning modal, backlog drawer, velocity
│   │   │   ├── tasks/           # Task Detail Slide-over, markdown, Git commit badge
│   │   │   └── charts/          # Recharts sprint burndown curve, workload bars
│   │   ├── store/               # Zustand stores: useAuthStore, useKanbanStore
│   │   ├── hooks/               # TanStack Query hooks: useTasks, useMoveTaskMutation
│   │   ├── services/            # Axios API client & Socket client singleton
│   │   └── pages/               # WorkspaceDashboard, ProjectBoard, SprintPage, Reports
│   ├── tailwind.config.js
│   └── vite.config.js
```

---

## Chapter 11: Enterprise Security Hardening & Threat Mitigation

| Threat / Attack Vector | Severity | Hardened Defense Implementation |
| :--- | :---: | :--- |
| **Broken Object Level Auth (BOLA)** | **CRITICAL** | Every request validates user membership in both Workspace and Project. Modifying URL IDs returns `403 Forbidden`. |
| **GitHub Token Compromise** | **CRITICAL** | OAuth tokens encrypted via AES-256-GCM. Raw tokens are never transmitted to client. |
| **Webhook Forgery / Spoofing** | **CRITICAL** | Validates `X-Hub-Signature-256` using timing-safe comparisons (`crypto.timingSafeEqual`). |
| **NoSQL Injection** | **HIGH** | Mongoose schema typing and Zod sanitizers strip query operators (`$gt`, `$where`). |
| **Cross-Site Scripting (XSS)** | **HIGH** | All task descriptions and comment Markdown are sanitized via DOMPurify before persistence. |
| **Brute Force Attacks** | **MEDIUM** | Rate-limited authentication endpoints (5 failed attempts per 15-min window). |
| **CSRF / Session Hijacking** | **MEDIUM** | JWTs stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies; OAuth uses signed state cookies. |

---

## Chapter 12: QA Automation & Automated Testing Strategy

Automated test suites executed with **Vitest** and **Supertest**:
* **Two-Tier RBAC Suite:** Asserts Workspace Guests and Viewers receive 403 on task drag and creation.
* **Kanban Fractional Order Suite:** Verifies midpoint calculations and precision re-balancing guards.
* **Atomic Task Sequence Suite:** Simulates 50 concurrent submissions; confirms non-colliding `KEY-SEQ` IDs.
* **GitHub OAuth & Webhook Suite:** Tests state verification, token cipher, and verifies rejection of invalid HMAC signatures.
* **Idempotency Suite:** Tests duplicate `X-GitHub-Delivery` UUIDs; verifies tasks are updated exactly once.
* **Burndown Engine Suite:** Validates mathematical ideal and actual burn curves across varying sprint dates.

---

## Chapter 13: 12-Phase Engineering Implementation Roadmap

```
Phase 1: Architecture & Monorepo Setup (Vite + Express monorepo, dnd-kit, Tailwind, Vitest)
   │
   ▼
Phase 2: Authentication & Workspaces (User auth, JWT cookies, multi-workspace tenancy)
   │
   ▼
Phase 3: Project Management & Roles (Project entity, project keys, two-tier RBAC guards)
   │
   ▼
Phase 4: Task Management Core (Atomic task sequences, Zod schemas, story point estimation)
   │
   ▼
Phase 5: Kanban Board & dnd-kit Drag (Interactive dnd-kit board, fractional indexing persistence)
   │
   ▼
Phase 6: Comments, Mentions & Timeline (Threaded discussions, @mentions, ActivityLog ledger)
   │
   ▼
Phase 7: Socket.IO Real-Time Mesh (Live card drag sync, task assignment push alerts)
   │
   ▼
Phase 8: GitHub Integration & OAuth (OAuth handshake, AES-256 token cipher, webhook HMAC)
   │
   ▼
Phase 9: Sprints & Agile Milestones (Sprint activation/completion, rollover logic, milestones)
   │
   ▼
Phase 10: Analytics & Burndown Charts (Recharts burndown curve, team velocity reports)
   │
   ▼
Phase 11: Security Hardening & QA Audit (BOLA audit, timing-safe checks, Supertest suites)
   │
   ▼
Phase 12: Documentation & Production Release (Runbooks, API contracts, deployment guides)
```

---

### Definition of Done (DoD)
The platform is complete when:
1. Workspace Admin creates workspace → PM creates project with key `FLOW`.
2. Developers are invited with project-level roles.
3. Tasks created with atomic identifiers (`FLOW-101`).
4. Developers drag cards on Kanban board with instantaneous $O(1)$ fractional index updates.
5. GitHub commit with message `[FLOW-101] Fix auth` pushes via webhook, verifies HMAC signature, and links commit hash to task timeline.
6. PM launches sprint, monitors Recharts burndown curve, and completes sprint with automated task rollover.
7. All data persists reliably in MongoDB with an indelible Activity Trail.
