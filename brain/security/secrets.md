# Secrets Management & Exposure Audit (secrets.md)

**System:** DevFlow (Enterprise Agile Project Management & Live Developer Activity Platform)  
**Security Standard:** OWASP Top 10 A07:2021 (Identification and Authentication Failures) & Secrets Exposure Mitigation  
**Target Scope:** Backend environment variables, token encryption keys, OAuth client credentials, database connection strings.

---

## 1. Expected Secrets Inventory

The following secrets are strictly required for DevFlow production operation:

| Secret Identifier | Expected Storage Location | Cryptographic Nature / Format | Criticality |
| :--- | :--- | :--- | :---: |
| `JWT_SECRET` | Environment variable (`process.env`) | High-entropy random string ($\ge 256$ bits) | **CRITICAL** |
| `GITHUB_CLIENT_SECRET` | Environment variable (`process.env`) | GitHub OAuth App client secret token | **CRITICAL** |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Environment variable (`process.env`) | 32-byte hexadecimal string for AES-256-GCM | **CRITICAL** |
| `GITHUB_WEBHOOK_SECRET` | Environment variable (`process.env`) | High-entropy shared secret for HMAC-SHA256 | **CRITICAL** |
| `MONGODB_URI` | Environment variable (`process.env`) | Mongo connection URI containing credentials | **HIGH** |
| `COOKIE_SIGNING_SECRET` | Environment variable (`process.env`) | Cryptographic secret for signing state cookies | **HIGH** |

---

## 2. Environment & Configuration Handling Rules

1. **Strictly Out-of-Band Delivery:** Production secrets must be injected into the application runtime exclusively via environment variables or secret management vaults (e.g. AWS Secrets Manager, HashiCorp Vault, Doppler).
2. **Zero Plaintext Fallbacks:** The server startup sequence must crash immediately (`process.exit(1)`) if any critical secret variable is missing, undefined, or set to placeholder defaults (e.g. `'your-secret-here'` or `'secret123'`).
3. **Dedicated Configuration Module:** Environment variables must be validated through a centralized Zod schema (`server/src/config/env.js`) upon application boot to guarantee string length and cryptographic entropy.

---

## 3. Threat Vectors & Exposure Risks

### A. Hardcoded Secrets in Source Code
- **Risk:** Developers frequently embed temporary development secrets or fallback strings (`const secret = process.env.JWT_SECRET || 'dev_secret'`).
- **Impact:** Attackers can sign arbitrary JWTs with `role: 'workspace_admin'`, completely bypassing authentication and accessing all multi-tenant projects.
- **Evidence Requirement:** Scanned all `.js`, `.jsx`, `.ts`, `.json`, and `.md` files in the repository for hardcoded tokens, passwords, or API keys.

### B. Client-Side Exposure (Vite / React SPA)
- **Risk:** Accidentally prefixing sensitive environment variables with `VITE_` (e.g. `VITE_GITHUB_CLIENT_SECRET`), which causes Vite to bundle the secret into client-side public JavaScript chunks.
- **Impact:** Anyone opening browser Developer Tools can extract the GitHub OAuth Client Secret and impersonate DevFlow.
- **Rule:** Only non-sensitive public parameters (e.g. `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_GITHUB_CLIENT_ID`) may carry the `VITE_` prefix.

### C. Git History & Repository Leakage
- **Risk:** Committing `.env` files, `.env.local`, or test fixtures containing real credentials to Git.
- **Mitigation:** `.gitignore` must strictly ignore all `.env` variants:
  ```gitignore
  .env
  .env.local
  .env.*.local
  *.pem
  *.key
  ```
- **Pre-commit Guards:** Integration of Git hooks (`husky` + `gitleaks`) to abort commits containing high-entropy keys.

### D. Logging & Unhandled Exception Exposure
- **Risk:** Logging entire `req.body`, `req.headers`, or database query objects containing passwords, tokens, or encryption keys in Morgan / Winston / console outputs.
- **Mitigation:** Sensitive field masking middleware:
  - Mask `password`, `token`, `accessToken`, `encryptedAccessToken`, `authorization`.
  - Disable verbose stack traces in production (`NODE_ENV === 'production'`).

---

## 4. Secret Rotation & Key Lifecycle Protocol

1. **AES-256 Key Rotation:** If `GITHUB_TOKEN_ENCRYPTION_KEY` requires rotation:
   - Run a migration script that reads all `GitHubIntegration` records, decrypts with the legacy key, re-encrypts with the new key, and updates the database atomically.
2. **JWT Secret Invalidation:** In the event of a suspected JWT secret leak:
   - Update `JWT_SECRET` in the secret manager.
   - Force global user session logout by clearing cookies; users must re-authenticate.
3. **Webhook Secret Update:**
   - Update the secret in GitHub repository webhook settings and concurrently deploy the new `GITHUB_WEBHOOK_SECRET` environment variable.

---

## 5. Actual Findings & Verification Evidence

| Location | Finding / Evidence | Classification | Risk Level | Status / Recommended Fix |
| :--- | :--- | :---: | :---: | :--- |
| `server/src/config/env.js` | Startup environment validation schema | Expected Control | **HIGH** | Enforce Zod validation on startup to verify 32-byte key lengths. |
| `.gitignore` | Ignores `.env`, `.env.*` | Positive Control | **LOW** | Verified rule in `.gitignore`. |
| `server/src/services/githubService.js` | AES-256-GCM cipher implementation | Positive Control | **CRITICAL** | Uses dynamic IV (`crypto.randomBytes(16)`) and authentication tag per encryption operation. |
| Client Bundles (`client/src/`) | No server secrets bundled in frontend | Positive Control | **INFO** | Zero sensitive tokens exposed to Vite client build. |
