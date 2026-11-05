# DevFlow — GitHub Integration & Webhook Ingress Architecture (GITHUB_INTEGRATION.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Security Standards:** AES-256-GCM Credential Cipher (DEC-006), Timing-Safe HMAC-SHA256 (DEC-007), Idempotency Ledger (DEC-008)  

---

## 1. Architectural Overview

DevFlow connects directly to GitHub to provide bi-directional synchronization between agile Kanban cards, developer pull requests, and Git commit histories.

```
┌─────────────────┐             ┌─────────────────────────┐             ┌────────────────────────┐
│  Developer Git  │             │   GitHub REST & OAuth   │             │   DevFlow API & Mesh   │
│  Push / PR Event│────Push────►│       Webhooks          │────POST────►│   /api/v1/github/      │
└─────────────────┘             └─────────────────────────┘             └───────────┬────────────┘
                                                                                    │
                                                                   1. HMAC-SHA256 Verification
                                                                      (crypto.timingSafeEqual)
                                                                   2. X-GitHub-Delivery Ledger
                                                                      (Idempotent Check)
                                                                   3. Regex Task Key Extraction
                                                                      (/\b([A-Z0-9]+-\d+)\b/g)
                                                                                    │
                                                                                    ▼
                                                                        ┌───────────────────────┐
                                                                        │  MongoDB & Sockets    │
                                                                        │  - Task.githubCommits │
                                                                        │  - Task.githubPRs     │
                                                                        │  - Socket 'task:moved'│
                                                                        └───────────────────────┘
```

---

## 2. GitHub OAuth 2.0 Flow & Cryptographic Storage (DEC-006)

DevFlow never stores GitHub user access tokens or personal access tokens (PAT) in plain text.

### Handshake & CSRF Protection
1. **Initiation (`GET /api/v1/github/oauth/connect?workspaceId=...`):**
   - User initiates authorization from the workspace settings.
   - Server generates a cryptographically secure 32-byte hexadecimal nonce.
   - Server sets a signed HttpOnly cookie: `github_oauth_state` with a 15-minute TTL.
   - Returns GitHub authorization URL with requested scopes: `repo read:user user:email`.
2. **Callback (`GET /api/v1/github/oauth/callback?code=...&state=...`):**
   - Validates that the returned `state` nonce strictly matches the signed cookie to neutralize Cross-Site Request Forgery (CSRF).
   - Exchanges code for `access_token` via GitHub OAuth token endpoint.
   - Queries GitHub REST API (`https://api.github.com/user`) for user identity.

### AES-256-GCM Encryption Cipher
- Master Key: 256-bit key supplied via `GITHUB_TOKEN_ENCRYPTION_KEY` (64-character hexadecimal string).
- Each token encryption operation generates a unique 12-byte initialization vector (`IV`) via `crypto.randomBytes(12)`.
- Produces ciphertext and a 16-byte authentication tag via `cipher.getAuthTag()`.
- Persisted in MongoDB `GitHubIntegration` collection as:
  $$\text{Payload} = \text{iv}_{\text{hex}} : \text{authTag}_{\text{hex}} : \text{ciphertext}_{\text{hex}}$$
- Any tampering or byte corruption of the stored string causes `decipher.final()` to throw an integrity violation, preventing token leakage.
- `GitHubIntegration.toJSON` explicitly deletes `encryptedAccessToken` during serialization.

---

## 3. Timing-Safe HMAC Webhook Ingress (DEC-007)

GitHub webhooks deliver event payloads signed with HMAC-SHA256 in the `X-Hub-Signature-256` header.

### Vulnerability Addressed
Standard string comparisons (`signature === expected`) terminate at the first differing byte, leaking character timing information that enables iterative signature forgery attacks.

### Invariant Implementation
- Express captures the unparsed raw buffer in `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })`.
- Signature is computed:
  $$\text{Expected} = \text{sha256} = \text{HMAC-SHA256}(\text{rawBody}, \text{GITHUB\_WEBHOOK\_SECRET})$$
- Verification strictly uses Node.js `crypto.timingSafeEqual` between two equal-length Buffers:
  ```javascript
  const signatureBuffer = Buffer.from(signatureHex, 'hex');
  const expectedBuffer = Buffer.from(expectedHex, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  ```

---

## 4. Webhook Idempotency Deduplication Ledger (DEC-008)

GitHub guarantees at-least-once webhook delivery. Network retries can cause identical webhook payloads to arrive multiple times.

### Ledger Implementation
- Every processed delivery is recorded in MongoDB `WebhookEvent` with a unique index on `{ deliveryId: 1 }` (`X-GitHub-Delivery` GUID).
- Before processing:
  ```javascript
  const existing = await WebhookEvent.findOne({ deliveryId });
  if (existing) {
    return res.status(200).json({ success: true, duplicate: true, message: 'Skipped duplicate delivery.' });
  }
  ```
- Automatically pruned after 30 days via MongoDB TTL index (`expireAfterSeconds: 2592000`).

---

## 5. Commit & Pull Request Association

### Task Key Regex Matching
DevFlow scans commit messages, PR titles, PR descriptions, and branch names using the standard agile key regex:
```regex
/\b([A-Z0-9]{2,10}-\d+)\b/g
```
*Examples matched:* `FLOW-101`, `DEV-42`, `PROJ-891`.

### Commit Linking
- When a `push` webhook arrives, commits matching task keys in connected repositories are appended to `task.githubCommits`:
  ```json
  {
    "commitHash": "a1b2c3d4...",
    "message": "fix(auth): resolve JWT race condition FLOW-101",
    "author": "Octocat",
    "timestamp": "2026-11-05T10:30:00Z",
    "url": "https://github.com/org/repo/commit/a1b2c3d4..."
  }
  ```
- Duplicate commits with identical `commitHash` are deduplicated.
- Dispatches real-time WebSocket update: `task:commit_linked` to task room.

### Pull Request Tracking
- When a `pull_request` event arrives (`opened`, `closed`, `reopened`, `synchronize`), the PR is associated with matching tasks in `task.githubPullRequests`.
- Status is synced: `open`, `closed`, `merged`.
- **Governing Rule:** *Pull request merges do not unilaterally transition task status to 'done'* unless explicitly configured, ensuring QA inspection gates are respected.

---

## 6. Configuring GitHub Webhooks

1. Navigate to your GitHub repository: **Settings $\rightarrow$ Webhooks $\rightarrow$ Add webhook**.
2. **Payload URL:** `https://your-domain.com/api/v1/github/webhooks`
3. **Content type:** `application/json`
4. **Secret:** Set to matching `GITHUB_WEBHOOK_SECRET` environment variable.
5. **Events:** Select **Pushes** and **Pull requests**.
6. Click **Add webhook**.
