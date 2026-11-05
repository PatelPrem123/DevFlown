# Attack Surface Analysis (attack-surface.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Standard:** OWASP Attack Surface Verification Architecture  
**Scope:** Public endpoints, authenticated surfaces, WebSockets, external webhook ingress, database access, background workers.

---

## 1. Network & Public Entry Surfaces

| Endpoint Route | HTTP Method | Authentication | Rate Limiting | Purpose & Attack Vector |
| :--- | :---: | :---: | :---: | :--- |
| `/api/v1/auth/register` | `POST` | Public | 5 req / 15 min | Account creation; target for mass bot registration. |
| `/api/v1/auth/login` | `POST` | Public | 5 req / 15 min | User authentication; target for credential stuffing. |
| `/api/v1/auth/refresh` | `POST` | Cookie JWT | 20 req / 15 min | Token renewal; target for session hijacking. |
| `/api/v1/github/webhooks` | `POST` | HMAC-SHA256 | 100 req / min | GitHub webhook ingress; target for payload forgery and DoS. |
| `/api/v1/github/oauth/connect` | `GET` | Authenticated | 10 req / min | Initiates OAuth flow; target for CSRF state manipulation. |
| `/api/v1/github/oauth/callback`| `GET` | Public / State | 10 req / min | Receives GitHub auth code; target for code interception. |
| `/socket.io/` | `WSS / GET` | JWT Handshake | Gateway-limited | WebSocket upgrade; target for unauthorized room snooping. |

---

## 2. Authenticated Internal API Surfaces

All endpoints below require an active `access_token` JWT verified via HttpOnly cookies and subject to two-tier RBAC:

### A. Workspace Management Surface
* `GET /api/v1/workspaces` — List workspaces where caller is a member.
* `POST /api/v1/workspaces` — Create new organization tenant.
* `POST /api/v1/workspaces/:id/invitations` — Invite user. Requires `Workspace Administrator`.
* `PATCH /api/v1/workspaces/:id` — Update workspace settings/billing. Requires `Workspace Administrator`.

### B. Project Management Surface
* `GET /api/v1/projects` — List projects visible to user.
* `POST /api/v1/projects` — Create project with unique prefix key (`FLOW`). Requires `Workspace Administrator`.
* `GET /api/v1/projects/:id/board` — Fetch Kanban board columns and fractional cards. Requires `Viewer` or higher.
* `POST /api/v1/projects/:id/members` — Add member with project role. Requires `Project Manager` or `Admin`.

### C. Task & Kanban Orchestration Surface
* `POST /api/v1/projects/:id/tasks` — Create task with atomic sequential key (`FLOW-101`). Requires `Developer` or `PM`.
* `PATCH /api/v1/tasks/:id/move` — Drag card; update status and fractional `orderIndex`. Requires `Developer` or `PM`.
* `PATCH /api/v1/tasks/:id` — Update task details (title, description, assignee, story points, priority). Requires `Developer` or `PM`.
* `DELETE /api/v1/tasks/:id` — Soft-delete or archive task. Requires `Project Manager`.

### D. Agile Sprint & Telemetry Surface
* `GET /api/v1/projects/:id/sprints` — List project sprints. Requires `Viewer` or higher.
* `POST /api/v1/projects/:id/sprints` — Create planned sprint. Requires `Project Manager`.
* `PATCH /api/v1/sprints/:id/start` — Launch sprint. Enforces single active sprint guard. Requires `Project Manager`.
* `PATCH /api/v1/sprints/:id/complete` — Complete sprint and trigger automated incomplete task rollover. Requires `Project Manager`.
* `GET /api/v1/projects/:id/analytics/burndown` — Retrieve mathematical ideal vs actual burndown metrics.

### E. Collaborative Discussions & File Attachments Surface
* `GET /api/v1/tasks/:id/comments` — Fetch threaded comments. Requires `Viewer` or higher.
* `POST /api/v1/tasks/:id/comments` — Post comment with `@mentions`. Requires `Developer` or `PM`.
* `POST /api/v1/tasks/:id/attachments` — Upload file attachment. Requires `Developer` or `PM`.

---

## 3. Real-Time WebSocket Mesh Attack Surface

The WebSocket mesh is reachable via Socket.IO connections. Authentication occurs during the initial handshake:
* **Connection Gate:** `io.use(socketAuthMiddleware)` rejects connections lacking a valid JWT.
* **Room Access Controls:**
  - `join:project` — Validates user has active `ProjectMembership` before executing `socket.join('project_' + projectId)`.
  - `join:task` — Validates user has access to the parent project before joining `task_<taskId>`.
* **Risk Surface:** If room subscription events allow arbitrary room names without server-side permission checks, unauthorized users can eavesdrop on private cards, comments, and commit messages.

---

## 4. User Input & Content Injection Surfaces

| Input Location | Expected Format | Validation Guard | Sanitization Defense | Attack Vector |
| :--- | :--- | :--- | :--- | :--- |
| **Task Title** | String (1-200 chars) | Zod `string().min(1).max(200)` | Stripped of control chars | Persistent XSS, HTML injection |
| **Task Description** | Markdown / HTML | Zod `string().max(20000)` | DOMPurify HTML sanitizer | Stored XSS via Markdown / links |
| **Comments** | Markdown / Text | Zod `string().min(1).max(5000)` | DOMPurify HTML sanitizer | Stored XSS, phishing links |
| **Fractional Order** | Float (`1500.0`) | Zod `number().finite()` | Float boundary clamping | Float underflow, NaN injection |
| **Story Points** | Number ($0, 1, 2, 3\dots$) | Zod `number().int().min(0).max(100)` | Integer casting | Negative points, integer overflow |
| **Project Key** | Alpha uppercase (2-10 chars)| Zod `string().regex(/^[A-Z0-9]{2,10}$/)` | Strict regex validation | Path traversal, SQL/NoSQL injection |

---

## 5. File Uploads & Storage Surface

* **Upload Endpoint:** `POST /api/v1/tasks/:id/attachments`
* **File Constraints:**
  - Maximum file size: $10\text{ MB}$ per file.
  - MIME Type Whitelist: `image/png`, `image/jpeg`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`, `application/zip`.
  - Storage naming: Cryptographic UUIDs (`${uuidv4()}.${ext}`) to prevent directory traversal and overwrite attacks.
  - Executable Blocking: Rejection of `.exe`, `.bat`, `.sh`, `.php`, `.js`, `.html`, `.svg` (to prevent SVG-based stored XSS).

---

## 6. External Integrations & Webhook Ingress Surface

### GitHub OAuth 2.0 Integration
- **Outgoing:** Redirects user to `https://github.com/login/oauth/authorize` with signed CSRF state cookie.
- **Incoming:** GitHub redirects back to `/api/v1/github/oauth/callback` with authorization `code` and `state`.
- **Exchange:** Server exchanges `code` for OAuth access token over secure TLS channel directly with `github.com`.
- **Storage:** Token is encrypted via AES-256-GCM before write to MongoDB.

### GitHub Webhooks Ingress
- **Ingress Route:** `POST /api/v1/github/webhooks`
- **Authentication:** `X-Hub-Signature-256` header validated using timing-safe HMAC-SHA256 comparison.
- **Idempotency:** `X-GitHub-Delivery` GUID logged in `WebhookEvent` unique index. Duplicate deliveries are dropped immediately with `HTTP 200`.

---

## 7. Database & Persistence Surface

* **MongoDB 7.x Connection:** Authenticated via TLS connection URI.
* **NoSQL Injection Defense:** Mongoose schema definitions reject raw query operators (`$gt`, `$where`, `$ne`). Request parameters are strictly validated via Zod before reaching Mongoose queries.
* **Resource Attribution:** Atomic counters and updates utilize `{ $inc: { seq: 1 } }` and `{ $set: { ... } }` to eliminate race conditions.
