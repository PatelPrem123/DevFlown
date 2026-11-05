# DevFlow — System Architecture & Technical Specifications (ARCHITECTURE.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Standard:** Decoupled Micro-Modular SaaS Architecture  
**Document Version:** 1.0.0  

---

## 1. High-Level Architectural Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER                               │
│       React 18 + Vite SPA  •  Tailwind CSS  •  dnd-kit  •  Recharts    │
│   [Workspace Dashboard]  [Interactive Kanban Board]  [Sprint Charts]   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ HTTPS REST (/api/v1) & WSS Socket.IO
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   APPLICATION & GATEWAY TIER                           │
│   Express.js API Gateway  •  Helmet / Rate Limiting  •  JWT Auth       │
│   ├─► Workspace & Project RBAC Middleware (BOLA Defense)               │
│   ├─► Kanban Fractional Indexing Engine ($O(1)$ Lexorank Drag)         │
│   ├─► GitHub Integration Engine (OAuth 2.0, AES-256 Token Cipher)      │
│   ├─► Webhook Ingest Engine (HMAC-SHA256, Idempotent UUID Ledger)      │
│   └─► Socket.IO Real-Time Mesh (Rooms: workspace, project, task, user) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    │ Mongoose ODM Operations (Compound Indexes)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       DATA PERSISTENCE TIER                            │
│   MongoDB 7.x Database Cluster (Normalized 13 Collections)             │
│   ├─► Users, Workspaces & Memberships                                  │
│   ├─► Projects, Sprints, Milestones & Tasks (KEY-SEQ)                  │
│   ├─► Comments & Append-Only ActivityLogs                              │
│   └─► GitHubIntegrations & WebhookEvents (Idempotency)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Two-Tier Hierarchical Access Control (RBAC)

DevFlow protects resources using a strict two-tier permission barrier to support multi-tenant organizations with external contractors:

1. **Workspace Scope (Organization):**
   - **Workspace Administrator:** Organization settings, project creation, member invites, billing.
   - **Workspace Member:** Views public workspace projects; can be assigned to internal projects.
   - **Workspace Guest:** Restricted external contractor; can strictly access only projects they are assigned to.

2. **Project Scope (Project Team):**
   - **Project Manager (PM):** Full project authority; creates sprints, milestones, links GitHub repositories, assigns tasks.
   - **Developer / Contributor:** Core team member; creates/edits tasks, drags Kanban cards, writes comments, links Git commits.
   - **Viewer:** Read-only stakeholder; views boards and sprint velocity reports; cannot mutate state.

---

## 3. Fractional Indexing Algorithm (Lexorank Math)

Standard naive implementations store ordered arrays of task IDs inside column documents. Dragging a card from position 50 to position 2 requires modifying 48 documents, creating massive write locks.

DevFlow orders tasks using floating-point fractional indexes:
- Midpoint calculation:
  $$\text{newOrder} = \frac{\text{prevOrder} + \text{nextOrder}}{2}$$
- Dropping at top of column: $\text{lowestOrder} - 1000.0$
- Dropping at bottom of column: $\text{highestOrder} + 1000.0$
- Persistence cost: **$O(1)$ single-document update** in MongoDB. Zero other cards are touched.
- Precision Guard: If $|\text{prevOrder} - \text{nextOrder}| < 0.000001$, a background worker re-spaces column cards evenly ($1000, 2000, 3000\dots$).

---

## 4. GitHub OAuth & Webhook Pipeline

1. **OAuth 2.0 Security:**
   - Generates signed CSRF state cookie with `crypto.randomBytes(32)`.
   - Access tokens encrypted at rest via AES-256-GCM (`iv:authTag:ciphertext`).
   - Tokens are NEVER exposed over client REST endpoints.

2. **Webhook Ingestion:**
   - Validates `X-Hub-Signature-256` using timing-safe comparisons (`crypto.timingSafeEqual`).
   - Deduplicates requests using `X-GitHub-Delivery` UUID ledger in `WebhookEvent`.
   - Parses commit messages via `/([A-Z0-9]+-\d+)/g` and links commits/PRs to task activity timelines.

---

## 5. Socket.IO Real-Time Mesh

WebSocket connections are authenticated via JWT cookies during the handshake. Clients are joined strictly to authorized channels:
- `workspace_<id>`: Macro organization announcements and new project creation.
- `project_<id>`: Active Kanban card drag movements, sprint launches, task creation.
- `task_<id>`: Real-time comment streams, typing indicators, and attachments.
- `user_<id>`: Personal direct assignment alerts and @mention push notifications.
