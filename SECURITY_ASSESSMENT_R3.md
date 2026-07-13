# Independent Security Assessment — Round 3

**Scope:** TBHF Scholars Network (Next.js 16 + Supabase).
**Reviewer stance:** Fresh third-party review — no prior involvement in rounds 1–2. Read-only; **no code changed.** This is an assessment and a plan.
**Date:** 2026-07-13

---

## 1. Executive summary

The platform is in **good shape** after two prior hardening rounds. The core architectural decision — treating **Postgres RLS as the real authorization boundary** rather than trusting the app tier — is the right one and is what keeps the app safe even where other layers are thin.

I found **no new critical or high-severity vulnerabilities.** The remaining opportunities are about **depth and durability**: closing the last high-leverage gap in the CSP, adding abuse-resistance (rate limiting / bot protection) to auth surfaces, turning on two Supabase account-security toggles, and — most importantly for the long run — **making the security posture automated and repeatable instead of manual.**

Priority order: **P1** = do before/at next deploy · **P2** = this iteration · **P3** = ongoing habit.

---

## 2. What is already strong (verified this round)

These are genuinely well done — keep them:

- **RLS-first authorization.** Data access is gated in the database, not just the UI or middleware. This is defense-in-depth done correctly: even a middleware bypass or a forged client request can't read data the policy forbids.
- **No high-privilege secrets in the app.** Only the public anon key + URL are used (`lib/supabase/*`). No `service_role` key anywhere in `app/` or `lib/`. Git history scan found **no committed secrets**; `.env*` is gitignored and `.env.local` is untracked.
- **Dependencies clean.** `npm audit` (prod) = **0 vulnerabilities**. Framework is current (Next 16.2.10, React 19) — not exposed to the older Next middleware-bypass CVE.
- **Security headers + scoped CSP** in production (`next.config.ts`): `frame-ancestors 'none'` + `X-Frame-Options: DENY` (clickjacking), `nosniff`, HSTS w/ preload, tight `Permissions-Policy`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. `poweredByHeader:false`.
- **XSS hygiene.** No `dangerouslySetInnerHTML` in the codebase; React auto-escapes. External/user-supplied URL sinks are wrapped in `safeUrl()` (blocks `javascript:`/`data:`); the unwrapped `href` sinks I sampled are all internal app routes.
- **SECURITY DEFINER functions set `search_path = public`** — prevents search-path hijack, the classic definer-function privilege-escalation trick.
- **Round 1–2 fixes hold:** private member-content buckets + short-lived signed URLs; `profiles.email` column read revoked from `authenticated`; generic login error (no account enumeration); admin code is no longer an anonymous brute-force oracle; anon can't read the directory or enumerate enums.

---

## 3. Findings & recommendations (this round)

### P1 — Address before or at the next deploy

**R3-01 · CSP still allows `script-src 'unsafe-inline'` (Medium). — ✅ IMPLEMENTED 2026-07-13.**
This was the single highest-leverage remaining weakness. With `'unsafe-inline'` on scripts, *any* HTML-injection foothold becomes script execution — it neutralizes most of what the CSP is there to prevent. The `style-src 'unsafe-inline'` is far lower risk (inline styles can't run code) and is a reasonable trade for the app's inline-style approach.
**What was done:** the CSP moved from static `next.config.ts` headers into the middleware (`lib/supabase/middleware.ts`), which now mints a **fresh per-request nonce** (`btoa(crypto.randomUUID())`), forwards it to Next via the request `Content-Security-Policy` header (so Next stamps the nonce onto its own bootstrap/hydration scripts), and enforces `script-src 'self' 'nonce-…' 'strict-dynamic'` on the response — `'unsafe-inline'` for scripts is **gone**. `style-src 'unsafe-inline'` retained (documented trade-off; nonces don't cover style attributes). Production-only; dev keeps stock Next responses. No custom `<script>`/`next/script`/`eval` exists in the app, so nothing else needed nonce-ing. Verified: `tsc` clean; dev server unaffected (no CSP in dev, HTTP 200). **Runtime verification against a production build is still pending** (deliberately not run locally to avoid the `.next` corruption that a build alongside the dev server previously caused) — verify header output after the next Vercel deploy.

**R3-02 · No rate limiting / bot protection on auth & abuse surfaces (Medium). — PARTIAL: SQL cap done 2026-07-13; dashboard items pending.**
Login, public signup, and the admin-code redeem RPC lacked app-level throttling or CAPTCHA. Supabase Auth applies coarse built-in limits, but the custom `redeem_admin_access` RPC isn't covered by those.
**What was done (SQL):** the admin-code redeem path is now brute-force-hardened in the database. phase34 already added a per-account lockout (5 wrong codes → 15-min lock); `phase35_redeem_backoff.sql` supersedes it to add **per-account exponential backoff** — each repeat lockout doubles the wait (15m → 30m → 1h … capped 24h). Deliberately per-account (no global counter), so it can never lock a legitimate new admin out of onboarding. With the 128-bit code (BUG-001) + email-confirmation friction, redeem is not a practical target.
**Still pending (Supabase dashboard — not code):** enable **Auth CAPTCHA** (hCaptcha/Turnstile) for signup + sign-in to stop bulk/bot account creation, and add edge/IP rate limiting on the auth routes. These are the parts I can't do from the repo.

**R3-03 · Turn on Supabase account-security toggles (Medium).**
Two dashboard settings from prior rounds remain open: **leaked-password protection** (HIBP check on signup/change) and **MFA for admin accounts**. Admins can grant roles and read all PII — their accounts deserve a second factor.
**Plan:** enable leaked-password protection globally; require MFA enrollment for any account with the `admin` role.

### P2 — This iteration

**R3-04 · Migrations are applied by hand (Medium — operational).**
42 phase SQL files plus `security_hardening.sql` are run manually in the SQL editor, in an order the operator has to remember. This *already* produced a real hazard — the deploy-ordering trap where running the SQL before shipping the matching code would break production. Manual application invites drift, skipped steps, and wrong-order mistakes.
**Plan:** adopt the **Supabase CLI migration workflow** (versioned `supabase/migrations/`, `db push` from CI against staging→prod), so schema changes are ordered, reviewable, and reproducible. Until then, keep a written run-order checklist in the repo.

**R3-05 · Signup leaks account existence (Low).**
`signup()` / `adminSignup()` return `error.message` verbatim, which can surface "User already registered" — an enumeration signal that `login()` was already fixed to avoid.
**Plan:** return a generic "check your email" notice regardless (email confirmation already hides the true state); log the real error server-side only.

**R3-06 · Middleware accepts a signed-out-but-unexpired token for navigation (Low, by design).**
`getClaims()` verifies the JWT signature locally (fast) but a revoked/signed-out token still passes middleware until it expires. This is **acceptable** — RLS re-checks every query, so no data leaks — but the window should be small and the boundary documented.
**Plan:** set a **short access-token TTL** (e.g. 30–60 min) in Supabase Auth; add a one-line note that middleware is a UX gate, not the security boundary (RLS is).

### P3 — Ongoing habits (see §4)

**R3-07 · No automated security regression.** The audits were manual and won't catch tomorrow's regression. Add CI: `npm audit`, a production-headers smoke test, and an **anonymous-read probe** (assert anon `GET` on sensitive tables returns `[]`/401).
**R3-08 · Run Supabase's built-in advisors** (`get_advisors` security lint) on a schedule — it flags RLS-off tables, exposed functions, and missing policies automatically.
**R3-09 · Least-privilege cadence.** You revoke aggressively (good). Keep the column-grant allowlist and RPC `EXECUTE` grants documented, and re-review whenever a table/RPC is added.
**R3-10 · Audit logging & alerting.** Log and alert on admin-role grants (`redeem_admin_access`), bursts of failed logins, and storage-upload spikes.

---

## 4. Professional habits — how teams keep web apps *strongly* secure

These are the practices mature security teams treat as non-negotiable. Most of them you already partly do; the value is doing them **consistently and automatically**, not heroically once per audit.

1. **Threat-model before you build.** For each new feature ask the STRIDE-lite questions — who can call this, what can they forge, what's the worst input? Ten minutes of "how would I attack this?" beats a post-hoc audit.
2. **Defense in depth — never trust one layer.** Client validation is UX; server actions are a checkpoint; **the database policy is the guarantee.** Assume every layer above the DB can be bypassed. (You do this — it's why the app is safe.)
3. **Least privilege, everywhere.** Narrow column grants, scoped RPC `EXECUTE`, private buckets, role-scoped policies. Default to *deny*, grant the minimum, revisit on every change.
4. **Secure defaults / fail closed.** New tables ship with RLS on and no policy (deny-all) until a policy is written deliberately — never "open now, lock down later."
5. **Secrets discipline.** Never in code or git; keep the high-privilege `service_role` key server-only and out of the repo; rotate on staff changes; use the platform's secret store.
6. **Automate security in CI (shift left).** Dependency audit, secret scanning, a headers/anon-read smoke test, and static analysis on every PR. A check that runs on every commit outperforms a quarterly manual review.
7. **Patch dependencies continuously.** Dependabot/Renovate + `npm audit` gate. Most real-world breaches ride a known, unpatched CVE.
8. **Rate-limit and bot-protect every abuse surface.** Auth, password reset, invite/redeem, uploads, search. CAPTCHA on account creation. Assume traffic is adversarial and automated.
9. **Strong identity controls.** MFA (especially for admins), breached-password blocking, sensible session TTLs, secure cookie flags (HttpOnly/Secure/SameSite).
10. **Data minimization & privacy by design.** Only collect what you need, only expose what the caller may see (per-field privacy — which you have), and keep PII like email off broadly-granted columns.
11. **Monitor, log, alert, and rehearse response.** Centralized logs for security events, alerts on the dangerous ones (privilege grants, auth failure spikes), and a written incident-response runbook you've actually practiced.
12. **Version-controlled, reviewed, reproducible schema changes.** Migrations in the repo, applied by pipeline, reviewed like code — so security policies can't silently drift between environments.
13. **Regular external eyes.** Periodic re-audit, an occasional pentest, a `security.txt` and a disclosure path so researchers can report to you instead of exploiting.
14. **Backups + *tested* restores.** Encrypted, access-controlled backups, and a restore you've actually run — an untested backup is a hope, not a control.

---

## 5. Suggested sequence

1. **P1 now:** nonce-based CSP (R3-01) · CAPTCHA + auth rate limiting (R3-02) · leaked-password protection + admin MFA (R3-03).
2. **P2 this iteration:** Supabase CLI migrations + run-order checklist (R3-04) · generic signup response (R3-05) · short token TTL (R3-06).
3. **P3 as habit:** CI security checks (R3-07) · scheduled Supabase advisors (R3-08) · least-privilege review cadence (R3-09) · audit logging/alerting (R3-10).

No open Critical/High remains. The work from here is about making "secure" the **default state that stays true on its own**, not a state you have to re-establish by hand each round.
