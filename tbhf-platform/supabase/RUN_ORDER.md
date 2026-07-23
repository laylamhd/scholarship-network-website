# Supabase SQL — run order & checklist

The schema is applied by hand in the Supabase SQL editor. Until the CLI migration
workflow is adopted (assessment finding **R3-04**), this file is the source of
truth for **what order to run things in** and **which files are safe to re-run**.

**On a fresh database:** run every file top-to-bottom in the order below.
**On the existing database:** you only need the files you haven't run yet (newest
at the bottom). All files are written to be **idempotent** — safe to re-run.

> ⚠️ **Deploy-ordering rule (read before running `security_hardening.sql`):**
> The local dev app and the Vercel production app share **one** Supabase
> database. Two blocks in `security_hardening.sql` have a code dependency:
> **BUG-010** (revokes read on `profiles.email`) and **BUG-007** (makes the
> `resources`/`research` buckets private). If you run those while production is
> still running the *old* code, production breaks. **Deploy the code to Vercel
> first, then run `security_hardening.sql`.** Everything else here is
> code-independent and safe to run anytime.

## Order

| # | File | Notes |
|---|------|-------|
| 1 | `setup_profiles_auth.sql` | base: profiles table, RLS, auth trigger |
| 2 | `phase1_writes.sql` | profile writes |
| 3 | `phase1b_profile_extras.sql` | |
| 4 | `phase1c_volunteer.sql` | |
| 5 | `phase2_follows.sql` | |
| 6 | `phase2b_messaging.sql` | |
| 7 | `phase2c_groups.sql` | |
| 8 | `phase2d_discussions.sql` | |
| 9 | `phase3_resources.sql` | |
| 10 | `phase4_opportunities.sql` | |
| 11 | `phase4b_opportunity_types.sql` | |
| 12 | `phase5_mentorship.sql` | |
| 13 | `phase6_stories.sql` | |
| 14 | `phase7_showcase.sql` | |
| 15 | `phase8_events.sql` | |
| 16 | `phase9_research.sql` | |
| 17 | `phase10_volunteer.sql` | |
| 18 | `phase11_alumni.sql` | |
| 19 | `phase12_admin.sql` | |
| 20 | `phase13_moderation.sql` | |
| 21 | `phase14_admin_access.sql` | admin access code (rotate the seed code — never commit the real one) |
| 22 | `phase15_communities.sql` | |
| 23 | `phase16_surveys.sql` | |
| 24 | `phase17_member_submissions.sql` | |
| 25 | `phase18_dashboard.sql` | |
| 26 | `phase19_moderators.sql` | |
| 27 | `phase20_admin_members_fix.sql` | fix for phase12 |
| 28 | `phase21_moderators_fix.sql` | fix for phase19 |
| 29 | `phase22_story_views.sql` | |
| 30 | `phase23_settings.sql` | |
| 31 | `phase24_notify_prefs_and_delete.sql` | |
| 32 | `phase25_notifications_all.sql` | |
| 33 | `phase26_event_reminders.sql` | needs `pg_cron` (hourly event reminders) |
| 34 | `phase27_moderator_enforcement.sql` | |
| 35 | `phase28_community_group_moderation.sql` | |
| 36 | `phase29_community_interactions.sql` | |
| 37 | `phase30_community_media.sql` | |
| 38 | `phase31_message_deletions.sql` | |
| 39 | `phase32_moderator_badge.sql` | |
| 40 | `phase33_field_privacy.sql` | per-field profile privacy (keep in sync with `lib/profiles.ts`) |
| 41 | `phase34_admin_redeem_hardening.sql` | redeem lockout (5 fails / 15 min) |
| 42 | `phase35_redeem_backoff.sql` | **R3-02** — adds exponential backoff to phase34; code-independent, run anytime |
| 43 | `security_hardening.sql` | audit fixes (rounds 1–2). **⚠️ obey the deploy-ordering rule above** |

## When you add a new migration

1. Give it the next `phaseNN_short_name.sql` number and add a row here.
2. Make it idempotent (`create or replace`, `add column if not exists`,
   `drop policy if exists` before `create policy`, etc.).
3. If it revokes access or flips a bucket to private, note the **deploy-ordering**
   dependency here and deploy the matching code first.
4. New tables ship **RLS-enabled with no policy** (deny-all) until a policy is
   written deliberately — secure by default.
