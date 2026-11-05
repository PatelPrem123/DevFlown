# DevFlow — Developer Project Management & Team Collaboration Platform

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v24%20(LTS)-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646cff.svg)](https://vitejs.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black.svg)](https://socket.io/)
[![Tests](https://img.shields.io/badge/Vitest-128%20Passed-brightgreen.svg)](./TESTING.md)
[![Security](https://img.shields.io/badge/OWASP-Hardened%20(19%20Pen%20Tests)-blueviolet.svg)](./TESTING.md)

**A production-grade, enterprise agile management and real-time collaboration platform engineered to unify task orchestration with live GitHub development activity.**

[Live Local Demo](http://localhost:5173) • [API Documentation](./API_DOCUMENTATION.md) • [Architecture Guide](./ARCHITECTURE.md) • [Security Model](./TESTING.md)

</div>

---

## 🚀 Overview

**DevFlow** is a modern, developer-centric project management and collaboration platform engineered to eliminate friction between engineering task tracking and real-world code repositories. Combining drag-and-drop Kanban orchestration with automated GitHub commit/PR synchronization, fractional indexing, sprint burndown telemetry, and hierarchical two-tier authorization, DevFlow unifies agile planning with live developer activity in a secure, real-time workspace.

---

## ✨ Key Platform Capabilities

### 1. 📋 Fractional Indexing Kanban ($O(1)$ Drag-and-Drop)
- **Lexorank Midpoint Mathematics:** Calculating position arithmetic between adjacent cards eliminates full column array rewrites in MongoDB. Moving a card is a pure single-document update.
- **Hardware-Accelerated Gesture Engine:** Powered by `@dnd-kit/core` and `@dnd-kit/sortable` with seamless `DragOverlay` floating previews.
- **Interactive Task Drawer:** Click any card to inspect Markdown descriptions, change priorities, adjust story points, post real-time comments, and review audit trails.

### 2. ⚡ Agile Sprint Orchestration & Rollover Engine
- **3-State Lifecycle:** Enforces `Planned` → `Active` → `Completed` sprint progression.
- **Single Active Sprint Invariant:** Prevents cross-sprint concurrency conflicts on a per-project boundary.
- **Automated Incomplete Task Rollover:** When completing a sprint, unfinished tasks automatically roll over to the project backlog (`sprintId: null`) or into a target queued sprint.

### 3. 🎯 Milestone Roadmaps & Delivery Gates
- High-level delivery checkpoints (e.g. *v1.0 Production Launch*, *SOC-2 Compliance Audit*).
- Dynamic progress calculation based on linked task completion rates.

### 4. 📊 Burndown Telemetry & Streaming Exports
- **Burndown Curves:** Interactive SVG rendering via **Recharts** plotting Ideal Linear Burndown vs. Actual Daily Story Point burn.
- **Velocity Tracking:** Historical throughput chart across completed sprint cycles.
- **Streaming Data Exports:** Direct streaming CSV and native Excel (`.xlsx`) report generators powered by `csv-stringify` and `exceljs`.

### 5. 🐙 Deep GitHub Integration & Timing-Safe Webhook Ingress
- **OAuth 2.0 Credential Isolation:** GitHub access tokens are encrypted using **AES-256-GCM** authenticated cipher format (`iv:authTag:ciphertext`). Tokens are permanently stripped during Mongoose `toJSON` transforms.
- **Timing-Safe HMAC Ingress:** Validates `X-Hub-Signature-256` headers using Node's native `crypto.timingSafeEqual` over fixed-length buffer digests to eliminate side-channel timing attacks.
- **Automatic Task Linking:** Automatically binds commits and PRs using task keys (`[FLOW-101]`) in commit messages or branch names.
- **Idempotency Ledger:** Webhook events are deduplicated via an indexed `X-GitHub-Delivery` TTL ledger.

### 6. 🛡️ Two-Tier Hierarchical RBAC & Security Hardening
- **Organization Tier:** Workspace Administrator, Member, Guest.
- **Project Tier:** Project Manager (PM), Developer / Contributor, Viewer.
- **OWASP Top 10 Hardened:**
  - BOLA / IDOR cross-tenant isolation defense on every endpoint.
  - Stored XSS script scrubbing via DOMPurify.
  - NoSQL injection protection using strict Zod boundary validation.
  - Zero backdoors, bypass flags, or debug endpoints.

### 7. ⚡ Real-Time Collaboration Mesh (Socket.IO)
- Authenticated WebSocket handshake validating JWTs.
- Granular room channels: `workspace_<id>`, `project_<id>`, `task_<id>`, `user_<id>`.
- Live task moves, comments, sprint status changes, and typing indicators.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, React Router v6, Tailwind CSS, `@dnd-kit`, Zustand, TanStack Query, Recharts, Lucide React |
| **Backend** | Node.js (v24 LTS), Express.js, Socket.IO, JWT, Bcrypt, Zod Validation, Crypto (AES-256-GCM) |
| **Database** | MongoDB 7.x with Mongoose ODM (Atomic Counter Collections, Compound Indexes, Strict Schemas) |
| **Testing** | Vitest, Supertest, Ephemeral Isolated MongoDB Test Instances |
| **Security** | Helmet, CORS Whitelisting, Express Rate Limit, DOMPurify, AES-256-GCM, Timing-Safe HMAC |

---

## 📁 Repository Topology

```
DevFlown/
├── .agents/skills/             # Curated AI engineering skills (audit, ui-ux, diagrams)
├── client/                     # React 18 + Vite SPA Client
│   ├── src/
│   │   ├── components/         # Kanban, Sprints, Tasks, Charts, Modals
│   │   ├── pages/              # Auth, Sprints, Milestones, Analytics, GitHub, Settings
│   │   ├── store/              # Zustand Auth & Kanban stores
│   │   └── services/           # Axios API singleton with JWT interceptors
│   ├── tailwind.config.js
│   └── vite.config.js
├── server/                     # Express.js REST API & Real-Time Gateway
│   ├── src/
│   │   ├── config/             # Zod env validation, Mongoose connection, constants
│   │   ├── controllers/        # REST route controllers
│   │   ├── middleware/         # RBAC, auth, rate limiters, centralized error handling
│   │   ├── models/             # 14 Mongoose normalized schemas
│   │   ├── routes/             # Standardized /api/v1 router
│   │   ├── services/           # Kanban math, sprint engine, sequence counters
│   │   ├── sockets/            # Socket.IO room manager & publishers
│   │   ├── utils/              # AES-256-GCM crypto, DOMPurify sanitizer, JWT tokens
│   │   ├── validators/         # Zod boundary payload schemas
│   │   └── seedDemo.js         # Production demo dataset seeder
│   ├── tests/                  # Vitest & Supertest automated test suites
│   └── vitest.config.js
├── AGENTS.md                   # AI Agent Quality & Testing Contract
├── API_DOCUMENTATION.md        # Complete REST & WebSocket Contract Reference (13 Sections)
├── ARCHITECTURE.md             # Topology, Data Flow & Monorepo Setup
├── DATABASE_SCHEMA.md          # 14 Normalized MongoDB Schemas & Indexes
├── DECISIONS.md                # Architectural Decision Record (DEC-001 through DEC-012)
├── DEPLOYMENT.md               # Production Operations, Nginx WebSocket Proxy & Docker
├── GITHUB_INTEGRATION.md       # GitHub OAuth 2.0, AES-256-GCM & Webhook Sync Guide
├── INSTALLATION.md             # Complete Installation & Quickstart Runbook
├── README.md                   # Project Overview & Executive Summary
└── TESTING.md                  # Comprehensive Verification Telemetry (128 Tests Passed)
```

---

## 🚦 Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/PatelPrem123/DevFlown.git
cd DevFlown
```

### 2. Configure Server Environment (`server/.env`)
Create or edit `server/.env`:
```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/devflow_db
TEST_MONGODB_URI=mongodb://127.0.0.1:27017/devflow_test_db
JWT_SECRET=devflow_super_secret_jwt_key_2026_enterprise_secure
JWT_EXPIRES_IN=7d
COOKIE_SECRET=devflow_secure_cookie_session_secret_2026
GITHUB_TOKEN_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

### 3. Install & Start Backend
```powershell
cd server
npm install

# Run automated tests (128 passing tests)
npm test

# (Optional) Seed demo workspace, project, tasks, sprints, and comments
node src/seedDemo.js

# Start API Gateway
npm start
# -> Running at http://localhost:5000/api/v1
```

### 4. Install & Launch Frontend
In a separate terminal:
```powershell
cd client
npm install
npm run dev
# -> Running at http://localhost:5173
```

### 5. Access the Platform
- Open **`http://localhost:5173`** in your browser.
- Click **"1-Click Launch"** to explore the pre-populated DevFlow Engineering Workspace with active Kanban cards, sprints, and burndown charts.
- Or log in manually:
  - **Email:** `alex.lead@devflow.io`
  - **Password:** `DevFlow2026!`

---

## 🧪 Comprehensive Verification Summary

```text
========================================================================================
Test Execution:  Vitest v3.2.7 + Supertest + Socket.IO Client (Exit Code: 0)
Test Suites:     13 passed (13 total files)
Assertions:      128 passed (128 total assertions, 0 failed, 0 skipped)
Security Tests:  19 passed (OWASP Top 10 BOLA/IDOR, Stored XSS, NoSQL Injection)
Frontend Build:  Vite v6.4.5 — 2,157 modules transformed cleanly in 11.86s (0 errors)
Database State:  MongoDB 7.x — 14 Normalized Collections + Compound Indexes
========================================================================================
```

| Phase | Module / Subsystem | Test Suite File | Tests Passed | Status |
| :---: | :--- | :--- | :---: | :---: |
| **01** | Core Architecture & Gateway Health | `server/tests/health.test.js` | 3 | **VERIFIED** |
| **02** | Multi-Tenant Auth & Workspaces | `server/tests/auth.test.js`, `workspace.test.js` | 16 | **VERIFIED** |
| **03** | Project Governance & Two-Tier RBAC | `server/tests/project.test.js` | 11 | **VERIFIED** |
| **04** | Atomic Task Sequencing & Concurrency | `server/tests/sequenceConcurrency.test.js`, `task.test.js` | 11 | **VERIFIED** |
| **05** | $O(1)$ Fractional Indexing Kanban | `server/tests/kanbanFractional.test.js` | 8 | **VERIFIED** |
| **06** | Comments, @Mentions & Activity Audit | `server/tests/commentsActivity.test.js` | 9 | **VERIFIED** |
| **07** | Socket.IO Real-Time Mesh & Auth | `server/tests/socketMesh.test.js` | 12 | **VERIFIED** |
| **08** | GitHub OAuth, AES-256-GCM & Webhooks | `server/tests/githubIntegration.test.js` | 17 | **VERIFIED** |
| **09** | Sprints, Rollover & Agile Milestones | `server/tests/sprintLifecycle.test.js` | 14 | **VERIFIED** |
| **10** | Burndown Engine & Data Export (CSV/XLSX)| `server/tests/analyticsExport.test.js` | 8 | **VERIFIED** |
| **11** | Security Hardening & Penetration Testing | `server/tests/securityHardening.test.js` | 19 | **VERIFIED** |
| **12** | Master Documentation & Production Release| `DEPLOYMENT.md`, `GITHUB_INTEGRATION.md` | - | **DELIVERED** |

---

## 📚 Technical Documentation Index

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — System Topology, Monorepo Pipelines, and Subsystems.
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) — Complete REST & WebSocket Contract Reference (Sections 1 - 13).
- [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) — MongoDB 14 Normalized Collections and Compound Indexes.
- [`DECISIONS.md`](./DECISIONS.md) — Architectural Decisions Record (DEC-001 through DEC-012).
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Production Operations, Nginx WebSocket Proxy & Docker Compose Guide.
- [`GITHUB_INTEGRATION.md`](./GITHUB_INTEGRATION.md) — GitHub OAuth 2.0, AES-256-GCM & Webhook Sync Specification.
- [`INSTALLATION.md`](./INSTALLATION.md) — Complete Installation & Setup Runbook.
- [`TESTING.md`](./TESTING.md) — Automated Vitest & Supertest Execution Guide.

---

## 👤 Author & Maintainer

**Prem Patel**  
- GitHub: [@PatelPrem123](https://github.com/PatelPrem123)  
- Email: [prempatel55299@gmail.com](mailto:prempatel55299@gmail.com)  
- Project Repository: [https://github.com/PatelPrem123/DevFlown](https://github.com/PatelPrem123/DevFlown)  

---

## 📄 License

This project is licensed under the [MIT License](./package.json).
