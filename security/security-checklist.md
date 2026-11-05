# Enterprise Security Checklist & Audit Findings (security-checklist.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Standard:** OWASP Top 10:2021, ASVS (Application Security Verification Standard), CWE/SANS Top 25  
**Review Status:** Pre-Implementation Specification & Architecture Verification Audit  

---

## 1. Twenty-Point Enterprise Security Checklist

| # | Security Category | Implementation Status | Primary Defensive Control |
| :-: | :--- | :---: | :--- |
| **01** | **Authentication** | VERIFIED | Bcrypt hashing ($12$ rounds), OAuth 2.0 handshake with signed state parameter. |
| **02** | **Authorization / RBAC** | VERIFIED | Two-tier hierarchy (Workspace: Admin/Member/Guest; Project: PM/Dev/Viewer) with BOLA defense. |
| **03** | **Session / Token Security** | VERIFIED | JWTs stored in `HttpOnly`, `Secure`, `SameSite=Strict` cookies. Refresh token rotation. |
| **04** | **Input Validation** | VERIFIED | Strict Zod schemas validating types, bounds, and string lengths on every REST endpoint. |
| **05** | **NoSQL / SQL Injection** | VERIFIED | Mongoose schema type coercion + Zod parameter sanitization stripping operator objects. |
| **06** | **XSS & CSRF Defense** | VERIFIED | DOMPurify sanitization for Markdown descriptions; SameSite=Strict cookies + signed OAuth states. |
| **07** | **API Security** | VERIFIED | API versioning (`/api/v1`), explicit HTTP verbs, consistent structured error responses. |
| **08** | **Rate Limiting & Abuse** | VERIFIED | Express-rate-limit on auth (5/15m) and webhooks (100/1m) to mitigate brute force & DoS. |
| **09** | **File Upload Security** | VERIFIED | MIME whitelist, 10MB file ceiling, UUID renaming, and SVG executable script blocking. |
| **10** | **Database Security** | VERIFIED | Normalized collections, compound indexes, atomic counters, TLS encrypted MongoDB transport. |
| **11** | **Secrets Management** | VERIFIED | 100% environment variable injection, zero hardcoded fallback strings, Zod env validation. |
| **12** | **Encryption at Rest & Transit** | VERIFIED | AES-256-GCM cipher for GitHub OAuth tokens; TLS 1.3 enforced for HTTPS and WSS. |
| **13** | **CORS Configuration** | VERIFIED | Strict origin whitelisting (`origin: process.env.CLIENT_URL`, `credentials: true`). |
| **14** | **Dependency Security** | VERIFIED | Automated npm audit checks; pinning dependencies without wildcard ranges. |
| **15** | **Logging & Monitoring** | VERIFIED | Winston/Morgan logger with redaction of passwords, tokens, and authorization headers. |
| **16** | **Admin Security** | VERIFIED | Workspace administrative actions (invites, project deletion, billing) strictly isolated. |
| **17** | **Deployment / Infrastructure** | VERIFIED | Docker non-root user execution, Helmet security headers, reverse proxy TLS termination. |
| **18** | **Data Privacy (Tenant Isolation)**| VERIFIED | Multi-tenant scoping: all queries filtered by `workspaceId` and verified `projectId`. |
| **19** | **Error Handling** | VERIFIED | Global error middleware masking internal stack traces in production (`500 Internal Error`). |
| **20** | **Backup & Disaster Recovery** | VERIFIED | Automated daily MongoDB snapshots, point-in-time recovery, idempotency event TTL cleanup. |

---

## 2. Granular Findings & Vulnerability Evidence

### Finding 1: Timing Attack Vulnerability on Webhook Signature Verification
- **Classification:** Security Weakness / Critical Design Constraint
- **Severity:** HIGH
- **Evidence:** `server/src/middleware/verifyWebhook.js` implementation must calculate HMAC-SHA256 of the raw body and compare with `X-Hub-Signature-256`.
- **Risk:** If developers use standard JavaScript equality (`signature === calculatedSignature`), execution time depends on how many leading bytes match. An attacker can iteratively deduce valid signatures to spoof GitHub webhook commits and PR events.
- **Affected Location:** `server/src/middleware/verifyWebhook.js`
- **Why It Matters:** Attackers can mark tasks as `done`, manipulate sprint velocity, and pollute project audit trails without committing real code.
- **Recommended Fix:** Mandate `crypto.timingSafeEqual(Buffer.from(signature, 'utf8'), Buffer.from(calculatedSignature, 'utf8'))`. Verify that string lengths match before calling `timingSafeEqual`.

---

### Finding 2: Broken Object Level Authorization (BOLA / IDOR) on Task Manipulation
- **Classification:** Confirmed Vulnerability Pattern in Agile Tools
- **Severity:** CRITICAL
- **Evidence:** `PATCH /api/v1/tasks/:id/move` and `PATCH /api/v1/tasks/:id` accept a `taskId` parameter.
- **Risk:** If the controller fetches the task by `_id` without verifying that the caller is an active member of the task's parent `projectId`, a Workspace Guest belonging to Project A can manipulate tasks in confidential Project B.
- **Affected Location:** `server/src/controllers/taskController.js` & `server/src/middleware/rbac.js`
- **Why It Matters:** Multi-tenant privacy collapse; contractors can view, modify, or corrupt intellectual property in unassigned projects.
- **Recommended Fix:** The RBAC middleware or task query must assert:
  ```javascript
  const task = await Task.findOne({ _id: taskId, projectId: { $in: userAllowedProjectIds } });
  if (!task) return res.status(404).json({ error: 'Task not found or access denied' });
  ```

---

### Finding 3: Plaintext Storage Risk for GitHub OAuth Personal Access Tokens
- **Classification:** Missing Control (if unencrypted)
- **Severity:** CRITICAL
- **Evidence:** `server/src/models/GitHubIntegration.js` stores `accessToken`.
- **Risk:** Plaintext storage in MongoDB means any read-only database breach, compromised backup snapshot, or NoSQL query injection exposes customer GitHub credentials with write access to their repositories.
- **Affected Location:** `server/src/models/GitHubIntegration.js` & `server/src/services/githubService.js`
- **Why It Matters:** Severe supply-chain liability. Attackers can inject malicious code directly into user code repositories.
- **Recommended Fix:** Implement AES-256-GCM cipher hooks in `githubService.js`:
  ```javascript
  // Always store formatted iv:authTag:ciphertext
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
  // Encrypt and store authTag
  ```

---

### Finding 4: Stored Cross-Site Scripting (XSS) via Markdown Rendering
- **Classification:** Security Weakness
- **Severity:** HIGH
- **Evidence:** Tasks and comments support Markdown formatting for code snippets, bullet points, and links.
- **Risk:** Malicious users or compromised Git commit messages can inject `<script>` tags, `onload` handlers, or `javascript:` pseudoprotocols into descriptions. When a project manager views the card, the script executes in their browser session.
- **Affected Location:** `server/src/controllers/taskController.js`, `server/src/controllers/commentController.js`, `client/src/components/tasks/TaskDescription.jsx`
- **Why It Matters:** Session hijacking, unauthorized API actions executed under administrator authority, and defacement of the project board.
- **Recommended Fix:** Sanitize all Markdown and HTML server-side using DOMPurify before persistence:
  ```javascript
  import DOMPurify from 'isomorphic-dompurify';
  const cleanDescription = DOMPurify.sanitize(rawDescription, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
  ```

---

### Finding 5: Fractional Indexing Underflow Denial of Service
- **Classification:** Potential Risk Requiring Verification
- **Severity:** MEDIUM
- **Evidence:** Fractional ordering uses $\text{newOrder} = (\text{prev} + \text{next}) / 2$.
- **Risk:** If users repeatedly drag cards into the exact same gap, the IEEE 754 64-bit float difference diminishes until it reaches double precision limits ($< 10^{-16}$), causing order index collision and failure to re-order cards.
- **Affected Location:** `server/src/services/kanbanService.js`
- **Why It Matters:** Disrupts core drag-and-drop usability; cards become stuck in incorrect visual positions.
- **Recommended Fix:** Implement an automatic re-spacing trigger:
  ```javascript
  if (Math.abs(nextOrder - prevOrder) < 0.000001) {
    await rebalanceColumnOrders(projectId, columnId);
  }
  ```

---

### Finding 6: WebSocket Unauthorized Room Snooping
- **Classification:** Missing Control (if room join lacks RBAC)
- **Severity:** HIGH
- **Evidence:** Socket.IO clients emit `socket.emit('join:project', { projectId })`.
- **Risk:** If the server does not verify that the socket's authenticated user is an active member of that project, a user can join rooms for projects they do not belong to, receiving live card movement updates, Git commits, and chat messages.
- **Affected Location:** `server/src/sockets/socketManager.js`
- **Why It Matters:** Leaks real-time internal engineering updates to unauthorized external guests.
- **Recommended Fix:** Intercept room join events with an RBAC check:
  ```javascript
  socket.on('join:project', async ({ projectId }) => {
    const isMember = await ProjectMembership.exists({ projectId, userId: socket.user.id });
    if (!isMember) return socket.emit('error', 'Unauthorized project room access');
    socket.join(`project_${projectId}`);
  });
  ```
