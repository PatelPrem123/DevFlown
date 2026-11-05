# DevFlow — Developer Project Management & Team Collaboration Platform

> **Production-Grade Enterprise Agile Platform for Software Teams**  
> *Built with React 18, Vite, Node.js, Express, Socket.IO, MongoDB 7.x, dnd-kit, and GitHub REST/OAuth*

---

## 🚀 Overview

**DevFlow** is a modern, developer-centric project management and collaboration platform engineered to eliminate friction between engineering task tracking and real-world code repositories. Combining drag-and-drop Kanban orchestration with automated GitHub commit/PR synchronization, fractional indexing, sprint burndown telemetry, and hierarchical two-tier authorization, DevFlow unifies agile planning with live developer activity in a secure, real-time workspace.

---

## 📑 Core Architecture & Capabilities

1. **Two-Tier Hierarchical Governance:**
   - **Workspace Level:** Administrator, Member, Guest.
   - **Project Level:** Project Manager (PM), Developer / Contributor, Viewer.
   - Built-in Broken Object Level Authorization (BOLA / IDOR) defense on all endpoints.

2. **Kanban Board with Fractional Indexing ($O(1)$ Drag-and-Drop):**
   - Implements Lexorank fractional order calculations. Moving a card persists in $O(1)$ time without updating entire column arrays in MongoDB.
   - Precision rebalancing guard automatically re-spaces cards when adjacent orders converge.

3. **Live Real-Time Collaboration (Socket.IO):**
   - Hierarchical room topologies: `workspace_<id>`, `project_<id>`, `task_<id>`, `user_<id>`.
   - Real-time card movements, comment updates, and assignment alerts.

4. **GitHub Integration & Webhook Ingestion Engine:**
   - OAuth 2.0 handshake with signed state verification and AES-256-GCM token encryption.
   - Webhook ingress verifying `X-Hub-Signature-256` via timing-safe HMAC comparisons (`crypto.timingSafeEqual`).
   - Idempotent delivery deduplication via `X-GitHub-Delivery` UUID ledger.
   - Automatic commit and pull request association parsing `[KEY-SEQ]` identifiers.

5. **Scrum Sprint & Milestone Telemetry:**
   - 3-State sprint lifecycle: `Planned` → `Active` → `Completed`.
   - Recharts burndown curve rendering ideal vs. actual daily velocity.
   - Automated incomplete task rollover to backlog or subsequent sprints.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, dnd-kit, TanStack Query, Zustand, Recharts, Lucide React |
| **Backend** | Node.js (LTS), Express.js v1, Socket.IO, JWT, Bcrypt, Zod Validation, Crypto (AES-256-GCM) |
| **Database** | MongoDB 7.x with Mongoose ODM (Atomic Counter Collections, Compound Indexes) |
| **Testing** | Vitest, Supertest, Ephemeral Test DB Environments |

---

## 📁 Repository Structure

```
DevFlown Comprehensive/
├── .agents/skills/             # Autonomous AI engineering skills (audit, ui, diagrams)
├── brain/security/             # STRIDE threat model, secrets, checklist, attack surface
├── client/                     # React 18 + Vite SPA Frontend
│   ├── src/
│   │   ├── components/         # Kanban, Sprints, Tasks, Charts, Common UI
│   │   ├── pages/              # Workspace, Project Board, Sprints, Analytics
│   │   ├── store/              # Zustand state stores
│   │   ├── hooks/              # TanStack Query custom hooks
│   │   └── services/           # Axios API client & Socket.IO singleton
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Express.js REST API & Real-Time Gateway
│   ├── src/
│   │   ├── config/             # Zod env validation, Mongoose connection, constants
│   │   ├── controllers/        # REST route controllers
│   │   ├── middleware/         # RBAC, auth, rate limiters, centralized error handling
│   │   ├── models/             # 13 Mongoose normalized schemas
│   │   ├── routes/             # Standardized /api/v1 router
│   │   ├── services/           # Kanban math, sprint engine, sequence counters
│   │   ├── sockets/            # Socket.IO room manager & publishers
│   │   └── validators/         # Zod payload schemas
│   ├── tests/                  # Vitest & Supertest automated test suites
│   └── vitest.config.js
├── AGENTS.md                   # AI Agent Engineering & Quality Contract
├── DECISIONS.md                # Architecture Decision Audit & Preservation (DEC-001 - DEC-012)
├── GITHUB_REPOSITORIES.md      # Curated repository guide (Top 10 AI + Testing tools)
└── IMPACT-MAP.md               # System component dependency & risk map
```

---

## 🚦 Quick Start Guide

### Prerequisites
- Node.js $\ge 18$ (LTS recommended)
- MongoDB $\ge 7.0$ running locally or URI
- Git

### Installation & Launch

```powershell
# 1. Install Server Dependencies
cd server
npm install
npm test

# 2. Start API Gateway
npm run dev

# 3. In a new terminal, launch Frontend Client
cd ../client
npm install
npm run dev
```

The application client will be accessible at `http://localhost:5173` and the API gateway at `http://localhost:5000/api/v1`.

---

## 📊 Comprehensive Verification Summary

DevFlow enforces rigorous engineering discipline governed by [`AGENTS.md`](./AGENTS.md), [`DECISIONS.md`](./DECISIONS.md), and [`TESTING.md`](./TESTING.md).

```
========================================================================
Test Files  13 passed (13 suites)
Tests       128 passed (128 assertions)
Exit Code   0 (Zero Failures, Zero Mocked Passes)
Client      1,728 modules transformed cleanly via Vite in 10.51s
========================================================================
```

| Phase | Module / Subsystem | Test Suite File | Tests Passed | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | Core Architecture & Gateway Health | `tests/health.test.js` | 3 | **VERIFIED** |
| **02** | Multi-Tenant Auth & Workspaces | `tests/auth.test.js`, `tests/workspace.test.js` | 16 | **VERIFIED** |
| **03** | Project Governance & Two-Tier RBAC | `tests/project.test.js` | 11 | **VERIFIED** |
| **04** | Atomic Task Sequencing & Concurrency | `tests/sequenceConcurrency.test.js`, `tests/task.test.js` | 11 | **VERIFIED** |
| **05** | $O(1)$ Fractional Indexing Kanban | `tests/kanbanFractional.test.js` | 8 | **VERIFIED** |
| **06** | Comments, @Mentions & Activity Audit | `tests/commentsActivity.test.js` | 9 | **VERIFIED** |
| **07** | Socket.IO Real-Time Mesh & Auth | `tests/socketMesh.test.js` | 12 | **VERIFIED** |
| **08** | GitHub OAuth, AES-256-GCM & Webhooks | `tests/githubIntegration.test.js` | 17 | **VERIFIED** |
| **09** | Sprints, Rollover & Agile Milestones | `tests/sprintLifecycle.test.js` | 14 | **VERIFIED** |
| **10** | Burndown Engine & Data Export (CSV/XLSX)| `tests/analyticsExport.test.js` | 8 | **VERIFIED** |
| **11** | Security Hardening & Penetration Testing | `tests/securityHardening.test.js` | 19 | **VERIFIED** |
| **12** | Master Documentation & Production Release| `DEPLOYMENT.md`, `GITHUB_INTEGRATION.md` | - | **DELIVERED** |

---

## 📚 Technical Documentation Index

- [`DECISIONS.md`](./DECISIONS.md) — Architectural Decisions Record (DEC-001 through DEC-012).
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System Topology, Monorepo Pipelines, and Subsystems.
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — Complete REST & WebSocket Contract Reference (Sections 1 - 13).
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — MongoDB 14 Normalized Collections and Compound Indexes.
- [`TESTING.md`](./TESTING.md) — Automated Vitest & Supertest Execution Guide.
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production Operations, Nginx WebSocket Proxy & Docker Compose Guide.
- [`GITHUB_INTEGRATION.md`](./GITHUB_INTEGRATION.md) — GitHub OAuth 2.0, AES-256-GCM & Webhook Sync Specification.
- [`IMPACT-MAP.md`](./IMPACT-MAP.md) — Component Dependency & Security Boundary Ripple Map.
