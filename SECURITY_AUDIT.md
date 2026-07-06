# Security Audit Instructions

**Repository:** https://github.com/laylamhd/scholarship-network-website.git
**Live deployment (for runtime checks):** https://scholarship-network-website.vercel.app

## Task

Perform a comprehensive cybersecurity audit of this web application.
Do NOT modify any code yet — first produce a full report, then wait for approval
before fixing anything.

## Review Areas

### 1. Authentication & Session Management
- Password storage (hashing algorithm, salting)
- Session token generation, expiration, and invalidation
- JWT handling (if used): signature verification, algorithm confusion, expiry
- Multi-factor auth gaps, brute-force/rate-limiting on login endpoints

### 2. Input Validation & Injection
- SQL/NoSQL injection in all database queries
- XSS (stored, reflected, DOM-based) — check all places user input is rendered,
  including bilingual Arabic/English dynamic content rendering
- Command injection, path traversal, template injection
- File upload validation (type, size, content, storage location)

### 3. Access Control
- Broken object-level authorization (IDOR) — can users access others' data by changing IDs?
- Missing function-level access checks (e.g. admin routes reachable by regular users)
- Insecure direct references in APIs

### 4. API & Client-Server Trust
- Are security checks duplicated on the backend, not just the frontend?
- CORS configuration (overly permissive origins?)
- Rate limiting and abuse protection on public endpoints
- Sensitive data exposure in API responses (over-fetching)

### 5. Configuration & Secrets
- Hardcoded API keys, credentials, or tokens in source code, .env files, or git history
- .gitignore coverage for secrets
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
  (check both the repo config and the live deployment's actual response headers)
- Debug mode / verbose error messages left enabled in production

### 6. Dependencies
- Run a dependency audit (npm audit or equivalent) for known CVEs
- Flag outdated packages with known vulnerabilities

### 7. Data Protection
- Encryption in transit (HTTPS enforced everywhere, verify on live URL)
- Sensitive data at rest (PII, tokens) — encrypted or exposed in logs?
- CSRF protection on state-changing requests

### 8. Business Logic
- Any workflow that could be abused by skipping steps or manipulating client-side state

## Output Format

Compile every finding into an Excel (.xlsx) file with these columns:

| Column | Description |
|---|---|
| ID | Sequential, e.g. BUG-001 |
| Title | Short description |
| Category | From the sections above |
| Severity | Critical / High / Medium / Low |
| File & Line Number | Exact location |
| Exploit Scenario | How an attacker would actually use it |
| Recommended Fix | Concrete remediation |
| Status | Default: "Open" |
| Verification Notes | What was tested to confirm the fix works and nothing broke (filled in later) |

Sort rows by Severity (Critical first, then High, Medium, Low). Within each
severity tier, order by ease-of-exploitation (easiest/most-likely-to-be-attacked first).

## Fix & Verify Workflow

When fixing each bug (one at a time, in priority order):

1. Before making the fix, briefly note the expected behavior of the affected
   feature (what should still work after the change).
2. Apply the fix.
3. Test that the specific vulnerability is actually closed (e.g. re-attempt the
   injection/exploit scenario and confirm it now fails safely).
4. Run a regression check on related functionality to confirm nothing else broke:
   - Auth/session fix → test login, logout, session expiry, and protected routes
   - Input validation fix → test that legitimate/valid input is still accepted
     and only malicious input is blocked
   - API/access control fix → test that authorized users can still perform
     their normal actions
   - Config/header change → test that the site still loads and functions
     normally across pages
5. If the fix breaks something else, resolve that before moving to the next bug.
6. Only after the fix is confirmed safe AND the app is confirmed stable, update
   the Status column to "Fixed" and note what was tested in the Verification Notes column.

Do not move to the next bug until the current one is fixed, verified, and
confirmed not to have broken any other part of the app.

## Ongoing Use

This file is meant to be reused across sessions. For follow-up scans, re-run
the audit, append any new findings to the same Excel tracker, and re-sort
until the sheet shows zero open Critical/High/Medium items.
