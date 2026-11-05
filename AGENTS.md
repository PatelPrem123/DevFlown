# DevFlow — Autonomous Agent Engineering & Quality Contract (AGENTS.md)

This file governs all autonomous AI coding agents, senior engineers, and code review assistants working on **DevFlow**.

---

## 1. Master AI Code Testing & QA Rules

When performing testing, code reviews, or implementing features:
1. **Never Assume Code is Correct:** Inspect actual implementations, verify edge cases, and run tests.
2. **Never Invent Test Results:** Distinguish clearly between code that was manually reviewed and tests that were actually executed. Do not claim tests passed unless executed via terminal with exit code 0.
3. **Comprehensive Review Scope:** Every module must undergo:
   - **Code Quality Review:** Readability, dead code elimination, unused imports, naming conventions, DRY/KISS.
   - **Functional & Logic Verification:** Fractional indexing math, sprint rollover, sequence increments.
   - **Unit & Integration Testing:** Boundary conditions, Vitest assertions, Supertest API checks.
   - **Edge Case Hardening:** Null/undefined, empty strings, oversized inputs, float precision exhaustion, concurrent requests.
   - **Security Validation:** NoSQL injection, XSS, CSRF, BOLA/IDOR, OAuth token leakage, webhook HMAC spoofing.
   - **Performance & Concurrency Testing:** Atomic sequence increments, indexed queries, WebSocket event loop impact.
4. **Preserve Existing Business Logic:** Never break working functionality or silently alter database schemas, route paths, or expected JSON contracts.

---

## 2. Professional Human-Code Engineering Standards

All code generated, refactored, or reviewed must reflect senior developer standards:
- **Clean Code & SOLID:** Single responsibility per function and module, clean dependency separation.
- **KISS & DRY:** Avoid over-engineering, unnecessary abstractions, and redundant boilerplate.
- **Natural, Professional Style:** Avoid artificial comments explaining obvious syntax; write descriptive, context-rich code.
- **Strict Error Handling:** Centralized async wrappers, meaningful error responses, and zero unhandled promise rejections.
- **Strict Typing & Schema Validation:** Enforce Zod validation on all API boundaries.

---

## 3. Architecture & Decision Governance (DECISIONS.md)

1. **Mandatory Check:** Before making architecture or schema changes, consult `DECISIONS.md`.
2. **Honor Confirmed Decisions:** Decisions marked `CONFIRMED` (such as Fractional Indexing in `DEC-003`, Two-Tier RBAC in `DEC-004`, Atomic Task Sequencing in `DEC-005`, AES-256-GCM Token Cipher in `DEC-006`, and Timing-Safe HMAC in `DEC-007`) are non-negotiable constraints.
3. **No Unapproved Rewrites:** Never replace an intentional architectural pattern with a generic alternative without human approval.

---

## 4. Impact Mapping Protocol (IMPACT-MAP.md)

Before touching shared services, models, middleware, or socket handlers:
1. Cross-reference `IMPACT-MAP.md` to identify direct and indirect consumers.
2. Verify security boundaries (e.g. Workspace and Project membership checks).
3. Review corresponding test suites in `server/tests/`.

---

## 5. Security & Read-Only Backdoor Audit Protocol

1. **Zero Backdoors:** Strictly prohibit bypass flags (`BYPASS_AUTH`, `DEBUG=true`, `SKIP_AUTH`), hardcoded credentials, mock sessions, or undocumented endpoints in production.
2. **Credential Isolation:** Ensure raw GitHub OAuth tokens are NEVER sent to the client browser or logged in plain text.
3. **Input Sanitization:** Sanitize descriptions and comments with DOMPurify; validate payloads with Zod.
4. **Timing-Safe HMAC:** Webhooks must strictly use `crypto.timingSafeEqual` for signature comparisons.
