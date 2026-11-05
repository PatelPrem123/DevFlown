# Architecture & Project Decisions (DECISIONS.md)

**Project:** DevFlow (Enterprise Agile Project Management & Real-Time Collaboration Platform)  
**Maintained For:** Senior Engineers, Software Architects, AI Coding Agents, QA Engineers, Security Reviewers  
**Document Version:** 1.0.0  
**Repository State:** Verified against `DevFlow_Comprehensive_Documentation.md`  

---

## Purpose

This document records and preserves foundational architectural, technical, security, data, API, infrastructure, and business-logic decisions for **DevFlow**. Its primary objective is to ensure that future developers, system maintainers, and autonomous AI coding agents do not repeatedly re-infer, contradict, or accidentally dismantle intentionally chosen architectural patterns.

---

## Rules for Future AI Agents

1. **Mandatory Pre-Flight Read:** Always consult this document before proposing, designing, or implementing architecture-level changes.
2. **Treat "CONFIRMED" Decisions as Hard Constraints:** Never bypass or contradict a `CONFIRMED` decision without explicit human review and approval.
3. **No Silent Replacements:** Naive implementations (e.g. replacing fractional indexing with array index splicing, or storing plain GitHub tokens in Mongo) are strictly prohibited.
4. **Identify Conflicts First:** If a requested feature appears to conflict with a confirmed decision, state the conflict and obtain human confirmation before proceeding.
5. **Preserve Rationale:** When modifying or superseding an architecture decision, preserve the historical entry, mark it as `SUPERSEDED`, and cross-reference the replacement.
6. **No Speculative Fabrications:** Only document decisions supported by repository evidence. If evidence is lacking, label the item as `INFERRED — NOT CONFIRMED`.

---

## Decision Index

| ID | Decision Name | Status | Area |
| :--- | :--- | :---: | :--- |
| **DEC-001** | Decoupled 3-Tier Architecture (React 18 SPA + Express REST API v1 + MongoDB 7.x) | CONFIRMED | Architecture |
| **DEC-002** | MongoDB 7.x with Mongoose ODM & Normalized Relational Collections | CONFIRMED | Database |
| **DEC-003** | Fractional Indexing Algorithm ($O(1)$ Lexorank Drag-and-Drop) with Rebalancing Guard | CONFIRMED | Business Logic / Performance |
| **DEC-004** | Two-Tier Hierarchical RBAC (Workspace Scope + Project Scope) with BOLA Defense | CONFIRMED | Security / Auth |
| **DEC-005** | Atomic Concurrency-Safe Task Key Sequence Engine (`[KEY]-[SEQ]`) | CONFIRMED | Database / Backend |
| **DEC-006** | AES-256-GCM Cryptographic Storage for GitHub OAuth Access Tokens | CONFIRMED | Security / Cryptography |
| **DEC-007** | Timing-Safe HMAC-SHA256 Signature Verification for Webhook Ingress | CONFIRMED | Security / API |
| **DEC-008** | Webhook Idempotency Deduplication via `X-GitHub-Delivery` UUID Ledger | CONFIRMED | Backend / Reliability |
| **DEC-009** | Scoped Hierarchical Socket.IO Room Mesh (`workspace`, `project`, `task`, `user`) | CONFIRMED | Real-Time / Networking |
| **DEC-010** | Mathematical Sprint Burndown Engine with Automated Task Rollover | CONFIRMED | Business Logic / Analytics |
| **DEC-011** | Dual-Layer Validation & Sanitization (Zod Schema Validation + DOMPurify) | CONFIRMED | Security / API |
| **DEC-012** | Vitest and Supertest Automated Testing Suite with Isolated Test DB Environments | CONFIRMED | QA / Testing |

---

## Documented Architectural Decisions

### DEC-001 — Decoupled 3-Tier Architecture (React 18 SPA + Express REST API v1 + MongoDB 7.x)
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Architecture
- **Decision:** Architect DevFlow as three decoupled tiers:
  1. Client Presentation Tier: React 18 SPA built with Vite, Tailwind CSS, dnd-kit, TanStack Query, and Zustand.
  2. Application & Gateway Tier: Node.js LTS with Express.js REST API (`/api/v1`), Socket.IO WebSocket mesh, and webhook receivers.
  3. Data Persistence Tier: MongoDB 7.x cluster with Mongoose ODM.
- **Why:** Full separation of concerns permits independent scaling of static frontend bundles via CDNs and stateful API/WebSocket gateways. The decoupling provides a strictly versioned REST API contract (`/api/v1`) suitable for external webhooks, developer CLI tools, and the browser SPA.
- **Problem Solved:** Prevents tightly-coupled server-rendered monoliths where real-time drag-and-drop state, WebSocket events, and heavy GitHub webhook ingestion compete for CPU cycles and complicate isolated testing.
- **Alternatives Considered:** Next.js Server-Side Rendered (SSR) Monolith.
- **Why Alternatives Were Rejected:** Complex real-time WebSocket state management, complex dnd-kit client drag sessions, and high-frequency webhook ingest run with lower latency and simpler connection lifecycle control on a dedicated Express + Socket.IO process.
- **Constraints:** Requires robust CORS policies, unified cookie/token handling across HTTP REST and WebSocket handshakes, and reverse-proxy route forwarding.
- **Impact:** Entire repository structure (`client/`, `server/`), deployment scripts, API versioning.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 2 & Chapter 10).
- **Change Risk:** Critical. Changing the 3-tier architecture invalidates the client-server contract, routing, and deployment topologies.
- **Related Decisions:** DEC-002, DEC-008, DEC-009.

---

### DEC-002 — MongoDB 7.x with Mongoose ODM & Normalized Relational Collections
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Database
- **Decision:** Utilize MongoDB 7.x managed with Mongoose ODM, structuring the data model into 13 normalized collections (`User`, `Workspace`, `WorkspaceMembership`, `Project`, `ProjectMembership`, `Task`, `Comment`, `Sprint`, `Milestone`, `ActivityLog`, `Notification`, `GitHubIntegration`, `WebhookEvent`). Comments, activity logs, and members are stored in separate collections rather than unbounded embedded arrays.
- **Why:** Kanban tasks, sprint histories, and project activity generate high-frequency writes. Unbounded embedded arrays in MongoDB risk exceeding the 16MB document size limit and cause severe document relocation overhead on disk. Normalized collections enable efficient compound indexing and granular atomic updates.
- **Problem Solved:** Document growth overflow, write locks on massive parent documents, and sluggish pagination of task activity timelines.
- **Alternatives Considered:** Relational database (PostgreSQL with Prisma / Drizzle).
- **Why Alternatives Were Rejected:** Agile tasks contain heterogeneous attributes (custom fields, story points, GitHub metadata, fractional order indexes) that map naturally to document structures, while MongoDB 7.x provides multi-document transactions and atomic counter operations.
- **Constraints:** Compound indexes must be strictly declared on `{ projectId: 1, status: 1, orderIndex: 1 }` and `{ workspaceId: 1, userId: 1 }`.
- **Impact:** All 13 schema definitions in `server/src/models/`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 7).
- **Change Risk:** Critical. Altering database design requires database migration, index rebuilding, and API payload restructuring.
- **Related Decisions:** DEC-003, DEC-005, DEC-008.

---

### DEC-003 — Fractional Indexing Algorithm ($O(1)$ Lexorank Drag-and-Drop) with Rebalancing Guard
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Business Logic / Performance
- **Decision:** Order Kanban cards using a fractional floating-point indexing algorithm (`orderIndex`) rather than maintaining sorted arrays of ObjectIds in column records:
  - Moving Card C between Card A ($1000.0$) and Card B ($2000.0$) calculates:
    $$\text{newOrder} = \frac{\text{prevOrder} + \text{nextOrder}}{2} = 1500.0$$
  - Top drop: $\text{lowestOrder} - 1000.0$; Bottom drop: $\text{highestOrder} + 1000.0$.
  - Precision guard: When $|\text{prevOrder} - \text{nextOrder}| < 0.000001$, trigger an asynchronous background column re-balance resetting order indexes to $\{1000, 2000, 3000\dots\}$.
- **Why:** In traditional array-based boards, dragging a card from position 50 to position 1 requires modifying 49 task records or locking the entire column document, producing high database write contention and frequent race conditions during concurrent multi-user dragging.
- **Problem Solved:** Reduces Kanban card movement persistence from $O(N)$ writes to a single $O(1)$ document update in MongoDB.
- **Alternatives Considered:** Integer rank shifting (`UPDATE tasks SET rank = rank + 1 WHERE rank >= target`); Ordered ObjectId arrays on Column documents.
- **Why Alternatives Were Rejected:** Integer shifting causes massive write amplification and table/collection locks. Array embedding causes document bloat and write collisions when two users move cards simultaneously.
- **Constraints:** Requires a 64-bit IEEE 754 floating-point field and an automated precision rebalancer to prevent floating-point underflow.
- **Impact:** `server/src/services/kanbanService.js`, `Task.orderIndex`, `client/src/components/kanban/`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 4).
- **Change Risk:** High. Changing card ordering algorithms directly breaks drag-and-drop mechanics and Socket.IO broadcast payloads.
- **Related Decisions:** DEC-002, DEC-009.

---

### DEC-004 — Two-Tier Hierarchical RBAC (Workspace Scope + Project Scope) with BOLA Defense
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Security / Auth
- **Decision:** Enforce access control via a two-tier hierarchy:
  1. Organization Scope: Workspace Administrator, Workspace Member, Workspace Guest.
  2. Project Scope: Project Manager (PM), Developer / Team Member, Viewer.
  - Every API controller and WebSocket event handler must validate the requesting user's active membership in both the Workspace and the specific Project before executing reads or mutations.
- **Why:** Modern software teams include external contractors, clients, and multi-team developers. Organization-only roles either over-expose sensitive projects or force teams to create fragmented workspaces. Project-level scoping ensures guests only access projects they are explicitly invited to.
- **Problem Solved:** Broken Object Level Authorization (BOLA / IDOR) where users query or modify resources by guessing MongoDB ObjectIds in URL parameters.
- **Alternatives Considered:** Single-tier workspace roles (Admin / Member); Attribute-Based Access Control (ABAC) engine.
- **Why Alternatives Were Rejected:** Single-tier roles cannot accommodate external contractors securely. ABAC adds runtime policy parsing overhead without concrete business benefit for agile sprint workflows.
- **Constraints:** Middleware must reject requests with `403 Forbidden` if a user has workspace membership but lacks project-level membership for non-public projects.
- **Impact:** `server/src/middleware/rbac.js`, all route definitions in `server/src/routes/`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 3 & Chapter 11).
- **Change Risk:** Critical. Flaws or modifications in RBAC create systemic privilege escalation vulnerabilities.
- **Related Decisions:** DEC-001, DEC-009.

---

### DEC-005 — Atomic Concurrency-Safe Task Key Sequence Engine (`[KEY]-[SEQ]`)
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Database / Backend
- **Decision:** Generate human-readable task keys (e.g. `FLOW-101`, `DEV-204`) using a dedicated `Counter` collection with atomic `findOneAndUpdate({ name }, { $inc: { seq: 1 } }, { upsert: true, new: true })` calls.
- **Why:** Developers navigate and link tasks via memorable keys (similar to Jira/Linear) rather than opaque 24-character hexadecimal MongoDB ObjectIds.
- **Problem Solved:** Concurrency collisions. Simply doing `Task.countDocuments()` or `find().sort()` before inserting causes duplicate keys when two developers create tasks at the exact same millisecond.
- **Alternatives Considered:** Client-generated UUIDs; Pre-allocated sequence ranges; Client timestamp hashing.
- **Why Alternatives Were Rejected:** UUIDs cannot be referenced concisely in Git commit messages (`[FLOW-101]`); timestamp hashes are non-sequential and lack team readability.
- **Constraints:** The `taskKey` field on `Task` must have a unique compound index: `{ projectId: 1, taskKey: 1 }`.
- **Impact:** `server/src/services/sequenceService.js`, `server/src/models/Counter.js`, `Task.taskKey`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 2, 7, 12).
- **Change Risk:** High. Regressions here corrupt task identity and break GitHub commit message parser linkage.
- **Related Decisions:** DEC-002, DEC-007.

---

### DEC-006 — AES-256-GCM Cryptographic Storage for GitHub OAuth Access Tokens
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Security / Cryptography
- **Decision:** Encrypt all GitHub OAuth user tokens and personal access tokens at rest using AES-256-GCM before writing to the `GitHubIntegration` collection. Store the Initialization Vector (IV) and authentication tag alongside the ciphertext (`iv:authTag:ciphertext`).
- **Why:** GitHub tokens provide read/write access to source code repositories. Storing plaintext access tokens exposes organizations to catastrophic supply-chain breaches if a database dump or backup is compromised.
- **Problem Solved:** Plaintext credential exposure in database backups, logs, or secondary read replicas.
- **Alternatives Considered:** Plaintext token storage with database-level disk encryption; Hash-based storage.
- **Why Alternatives Were Rejected:** Hashes cannot be decrypted to make authenticated GitHub REST API calls. Database-level encryption does not protect against compromised database connection credentials or application-level SQL/NoSQL dumps.
- **Constraints:** Master encryption key must be supplied via a 32-byte hexadecimal environment variable (`GITHUB_TOKEN_ENCRYPTION_KEY`) and must never be committed to Git.
- **Impact:** `server/src/services/githubService.js`, `server/src/models/GitHubIntegration.js`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 6 & Chapter 11).
- **Change Risk:** Critical. Changing encryption algorithms or corrupting keys renders all connected GitHub integrations unusable.
- **Related Decisions:** DEC-007, DEC-008.

---

### DEC-007 — Timing-Safe HMAC-SHA256 Signature Verification for Webhook Ingress
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Security / API
- **Decision:** Verify the `X-Hub-Signature-256` header on every incoming GitHub webhook using HMAC-SHA256 computed over the raw unparsed request buffer, comparing digest hashes exclusively with Node.js `crypto.timingSafeEqual`.
- **Why:** Standard string equality (`signature === computedSignature`) terminates on the first mismatched character, leaking timing metadata that allows attackers to iteratively forge valid HMAC signatures.
- **Problem Solved:** Webhook request forgery and unauthorized state updates on Kanban boards.
- **Alternatives Considered:** Standard string comparison (`===`); Token parameter in webhook URL query string.
- **Why Alternatives Were Rejected:** String equality is susceptible to side-channel timing attacks. URL tokens appear in web server access logs and browser history.
- **Constraints:** Express must capture the raw body buffer (`express.raw({ type: 'application/json' })`) before any JSON middleware parses the payload, otherwise whitespace and key order discrepancies invalidate the HMAC digest.
- **Impact:** `server/src/middleware/verifyWebhook.js`, `server/src/routes/githubRoutes.js`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 6 & Chapter 11).
- **Change Risk:** High. Incorrect body parsing or signature mismatch causes silent rejection of legitimate GitHub commits and PR events.
- **Related Decisions:** DEC-006, DEC-008.

---

### DEC-008 — Webhook Idempotency Deduplication via `X-GitHub-Delivery` UUID Ledger
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Backend / Reliability
- **Decision:** Record every processed GitHub webhook delivery GUID (`X-GitHub-Delivery`) in a dedicated `WebhookEvent` collection with a unique index. If an incoming delivery UUID already exists in the ledger, immediately return `HTTP 200 OK` and skip processing.
- **Why:** GitHub guarantees at-least-once delivery for webhooks. Network retries, timeout recoveries, and transient server restarts can cause the same webhook payload to be delivered multiple times.
- **Problem Solved:** Duplicate task status updates, repeated commit entries on task timelines, and multiple WebSocket notification alerts for a single Git commit.
- **Alternatives Considered:** In-memory set of recently seen UUIDs; Redis cache TTL ledger.
- **Why Alternatives Were Rejected:** In-memory sets are lost upon server restart or across horizontal API instances. A Mongo `WebhookEvent` collection provides persistence without adding an external Redis dependency for baseline operation.
- **Constraints:** `WebhookEvent` collection must feature a TTL index on `createdAt` (e.g. 30 days) to prevent perpetual storage growth.
- **Impact:** `server/src/models/WebhookEvent.js`, `server/src/controllers/githubWebhookController.js`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 6 & Chapter 7).
- **Change Risk:** Medium. Failure in idempotency checks causes duplicate comments and double-counting of sprint velocity.
- **Related Decisions:** DEC-002, DEC-007.

---

### DEC-009 — Scoped Hierarchical Socket.IO Room Mesh (`workspace`, `project`, `task`, `user`)
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Real-Time / Networking
- **Decision:** Partition WebSocket events into four discrete, authorized room hierarchies:
  1. `workspace_<id>`: Macro organizational events (project created, member invited).
  2. `project_<id>`: Active board synchronization (card dragged, sprint launched, task created).
  3. `task_<id>`: Micro collaboration (live comments, typing indicators).
  4. `user_<id>`: Private notifications (direct task assignment, @mentions).
  - Socket handshakes authenticate via JWT; client room subscriptions are validated against project RBAC before joining.
- **Why:** Broadcasting all events to a global channel causes massive network amplification, leaks sensitive project activity to unauthorized workspace guests, and forces client devices to deserialize irrelevant messages.
- **Problem Solved:** Information leakage across project boundaries and unnecessary client-side re-renders.
- **Alternatives Considered:** Single global workspace room with client-side event filtering; HTTP polling.
- **Why Alternatives Were Rejected:** Client-side filtering is insecure because unauthorized events reach the client browser. HTTP polling adds unnecessary server load and introduces multi-second latency for live drag-and-drop collaboration.
- **Constraints:** Socket disconnect handlers must cleanly evict sockets; authentication middleware must intercept the `io.use()` handshake.
- **Impact:** `server/src/sockets/`, `client/src/services/socket.js`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 8).
- **Change Risk:** High. Modifying room naming or event schemas breaks real-time card synchronization across multi-user boards.
- **Related Decisions:** DEC-001, DEC-004.

---

### DEC-010 — Mathematical Sprint Burndown Engine with Automated Task Rollover
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Business Logic / Analytics
- **Decision:** Calculate sprint burndown curves programmatically:
  - Total Committed Story Points = sum of story points of all tasks in sprint at launch.
  - Ideal Remaining points on day $t$:
    $$\text{Ideal}(t) = \text{TotalPoints} - \left( \frac{\text{TotalPoints}}{D} \times t \right)$$
    where $D$ is total sprint duration in days.
  - Actual Remaining: Sum of points for tasks whose status is NOT `done` on date $t$.
  - Automated Task Rollover: Upon sprint completion, incomplete tasks (`status !== 'done'`) are atomically migrated to the project backlog (`sprintId = null`) or to the next planned sprint.
- **Why:** Provides deterministic, objective agile velocity telemetry. Automated rollover prevents unfinished tasks from vanishing or remaining orphaned in closed sprints.
- **Problem Solved:** Inconsistent burndown metrics and manual, error-prone sprint closing procedures.
- **Alternatives Considered:** Client-side burndown calculation from raw task logs; Storing daily manual point snapshots.
- **Why Alternatives Were Rejected:** Computing burndown on the client exposes entire project history over the wire. Automated daily snapshots in Mongo ensure fast chart rendering for Recharts components without re-computing from raw logs on every request.
- **Constraints:** Sprints must follow an immutable 3-state finite lifecycle: `Planned` $\rightarrow$ `Active` $\rightarrow$ `Completed`. Only one sprint can be `Active` per project at any given time.
- **Impact:** `server/src/services/sprintService.js`, `client/src/components/charts/BurndownChart.jsx`.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 5).
- **Change Risk:** Medium. Breaking rollover logic risks corrupting sprint velocity historical reporting.
- **Related Decisions:** DEC-002, DEC-004.

---

### DEC-011 — Dual-Layer Validation & Sanitization (Zod Schema Validation + DOMPurify)
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** Security / API
- **Decision:** Enforce a strict dual-layer input defense on all API boundaries:
  1. Structural & Type Validation: Zod schemas validate every incoming request body, query parameter, and route parameter, stripping unexpected fields and rejecting type mismatches with descriptive 400 errors.
  2. XSS Content Sanitization: All rich text, Markdown descriptions, and user comments are passed through DOMPurify with strict HTML tag whitelisting before saving to MongoDB.
- **Why:** Single-point sanitization frequently fails when developers assume ORM type casting prevents script injection or NoSQL operator injection (`$gt`, `$where`).
- **Problem Solved:** Stored Cross-Site Scripting (XSS) in Markdown cards and NoSQL injection through crafted JSON payloads.
- **Alternatives Considered:** Express-validator; Joi; Client-only Markdown sanitization.
- **Why Alternatives Were Rejected:** Client-only sanitization is easily bypassed via direct REST API calls. Zod provides TypeScript-ready schema inference and superior composability compared to older validator libraries.
- **Constraints:** Unsanitized raw user input must never reach Mongoose query filters or WebSocket broadcast payloads.
- **Impact:** `server/src/validation/`, all controller request handlers.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 2 & Chapter 11).
- **Change Risk:** High. Weakening validation allows malformed payloads and malicious scripts into the database.
- **Related Decisions:** DEC-001, DEC-004.

---

### DEC-012 — Vitest and Supertest Automated Testing Suite with Isolated Test DB Environments
- **Status:** CONFIRMED
- **Date:** 2026-11-05
- **Area:** QA / Testing
- **Decision:** Standardize automated testing on **Vitest** for fast unit/service tests and **Supertest** for HTTP API integration testing. Tests execute against dedicated, ephemeral MongoDB instances (or MongoMemoryServer) to guarantee isolation.
- **Why:** Fast feedback loops are essential for complex state machines (RBAC matrix, Lexorank calculations, webhook HMAC verification). Vitest integrates seamlessly with Vite tooling and ESM modules, offering $10\times$ faster startup than legacy Jest configurations.
- **Problem Solved:** Slow test suites, flaky tests resulting from shared database state, and unexecuted test assumptions.
- **Alternatives Considered:** Jest + ts-jest; Mocha + Chai.
- **Why Alternatives Were Rejected:** Jest incurs significant ESM module configuration friction with modern Vite/Node setups and executes slower than Vitest in concurrent test runs.
- **Constraints:** All test suites must execute via standard terminal commands (`npm run test`) and output real non-zero exit codes upon failure. Simulated or mock-passed tests are strictly forbidden.
- **Impact:** `server/tests/`, `package.json` test scripts.
- **Evidence:** `DevFlow_Comprehensive_Documentation.md` (Chapter 12).
- **Change Risk:** Low to Medium. Changes to test frameworks affect CI pipelines but do not modify production runtime code.
- **Related Decisions:** DEC-001, DEC-003, DEC-004.

---

## Decision Dependency Analysis

```
DEC-001 (Decoupled 3-Tier Architecture)
  ├── DEC-002 (MongoDB Normalized Schemas)
  │     ├── DEC-003 (Fractional Indexing $O(1)$)
  │     ├── DEC-005 (Atomic Task Key Sequencer)
  │     ├── DEC-008 (Webhook Idempotency Ledger)
  │     └── DEC-010 (Sprint Burndown Engine)
  ├── DEC-004 (Two-Tier RBAC & BOLA Defense)
  │     └── DEC-009 (Scoped Socket.IO Room Mesh)
  ├── DEC-006 (AES-256-GCM GitHub Token Cipher)
  │     └── DEC-007 (Timing-Safe Webhook HMAC)
  ├── DEC-011 (Dual-Layer Zod + DOMPurify Sanitization)
  └── DEC-012 (Vitest & Supertest Automated QA)
```

---

## Change Protocol for Future AI Agents

Before altering any confirmed decision:
1. Locate the existing decision ID in this registry.
2. Read the architectural rationale and problem solved.
3. Identify all directly and indirectly dependent decisions in the graph above.
4. Consult `IMPACT-MAP.md` to trace affected files, routes, and database models.
5. Provide a technical justification explaining why the decision is no longer viable.
6. Present the proposed replacement and migration plan for human approval.
7. **DO NOT modify code before explicit human approval is granted.**
