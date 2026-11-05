# DevFlow — Automated Testing Strategy & Verification Guide (TESTING.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Testing Frameworks:** Vitest (Test Runner & Assertions) + Supertest (HTTP Integration) + Socket.IO Client  
**Execution Contract:** All tests must be executed via CLI with zero mocked passes or simulated results.  

---

## 1. Testing Philosophy & Strict Rules

1. **Never Assume Code is Correct:** Test actual runtime behavior, edge cases, concurrent conditions, and boundary constraints.
2. **Never Invent Test Results:** Distinguish clearly between code that was reviewed and test suites executed with exit code 0.
3. **Database Isolation:** All tests execute against an isolated test database (`devflow_test_db`) defined via `TEST_MONGODB_URI`.
4. **Clean Teardowns:** Test fixtures clean up collections in `beforeAll` and `afterAll` hooks to prevent state pollution.
5. **Deterministic Sequential Execution:** Configured with `fileParallelism: false` in `server/vitest.config.js` to ensure atomic transactions and sequence counters do not collide across test files.

---

## 2. Implemented Test Suites Overview (13 Suites / 128 Tests)

| Phase | Test Suite File | Tests | Target Invariants & Verification Criteria |
| :--- | :--- | :---: | :--- |
| **Phase 1** | `server/tests/health.test.js` | 3 | Health endpoint `/api/v1/health` returns 200, DB status, 404 handler, JSON parser error handling. |
| **Phase 2** | `server/tests/auth.test.js` | 8 | User registration, auto-provisioned workspace, Bcrypt 12-round hashing, JWT issuance, profile updates, password change. |
| **Phase 2** | `server/tests/workspace.test.js` | 8 | Workspace CRUD, slug uniqueness, member invitations with 7-day TTL, role updates (`admin`, `member`, `guest`), member eviction. |
| **Phase 3** | `server/tests/project.test.js` | 11 | Project key uppercase constraint (`FLOW`), project member roles (`pm`, `developer`, `viewer`), Two-Tier RBAC BOLA defense. |
| **Phase 4** | `server/tests/sequenceConcurrency.test.js` | 1 | Atomic task sequence generator under 25 concurrent parallel race requests (zero collision guarantee - DEC-005). |
| **Phase 4** | `server/tests/task.test.js` | 10 | Task creation with DOMPurify Markdown scrubbing, priority enums, story points validation, assignee validation, task search and filters. |
| **Phase 5** | `server/tests/kanbanFractional.test.js` | 8 | Fractional indexing math ($O(1)$ Lexorank drag-and-drop - DEC-003), top/bottom boundary drops, automatic precision rebalancer at $|\Delta| < 10^{-6}$. |
| **Phase 6** | `server/tests/commentsActivity.test.js` | 9 | Task threaded comments, `@username` mention detection via regex, automated in-app notifications, immutable append-only activity feed. |
| **Phase 7** | `server/tests/socketMesh.test.js` | 12 | Authenticated WebSockets, room authorization guards (`workspace_*`, `project_*`, `task_*`, `user_*`), multi-client live card move broadcast, typing indicators. |
| **Phase 8** | `server/tests/githubIntegration.test.js` | 17 | AES-256-GCM cipher encryption at rest (DEC-006), timing-safe HMAC-SHA256 verification (DEC-007), idempotency deduplication ledger (DEC-008), commit & PR regex linking. |
| **Phase 9** | `server/tests/sprintLifecycle.test.js` | 14 | 3-state sprint lifecycle (`planned` $\rightarrow$ `active` $\rightarrow$ `completed`), single active sprint constraint (DEC-010), automated task rollover to backlog or next sprint, milestone telemetry. |
| **Phase 10** | `server/tests/analyticsExport.test.js` | 8 | Mathematical linear burndown curves, agile team velocity calculation, developer workload telemetry, RFC 4180 CSV export, Excel (.xlsx) binary stream. |
| **Phase 11** | `server/tests/securityHardening.test.js` | 19 | Comprehensive BOLA/IDOR penetration tests, role privilege escalation defense, NoSQL operator injection defense, stored XSS scrubbing, credential isolation. |

---

## 3. Running Automated Tests

### Run All Server Test Suites
```powershell
cd server
npm test
```

### Run Tests in Watch Mode
```powershell
npm run test:watch
```

---

## 4. Latest Verified Terminal Execution Output

```
 RUN  v3.2.7 E:/vs code/All Main Main Projects/DevFlown Comprehensive/server

 ✓ tests/securityHardening.test.js (19 tests) 1679ms
 ✓ tests/workspace.test.js (8 tests) 1640ms
 ✓ tests/commentsActivity.test.js (9 tests) 2197ms
 ✓ tests/project.test.js (11 tests) 1600ms
 ✓ tests/task.test.js (10 tests) 1751ms
 ✓ tests/socketMesh.test.js (12 tests) 1646ms
 ✓ tests/kanbanFractional.test.js (8 tests) 1934ms
 ✓ tests/auth.test.js (8 tests) 1639ms
 ✓ tests/analyticsExport.test.js (8 tests) 1797ms
 ✓ tests/sprintLifecycle.test.js (14 tests) 1602ms
 ✓ tests/githubIntegration.test.js (17 tests) 1875ms
 ✓ tests/health.test.js (3 tests) 364ms
 ✓ tests/sequenceConcurrency.test.js (1 test) 99ms

 Test Files  13 passed (13)
      Tests  128 passed (128)
   Duration  87.10s
```
