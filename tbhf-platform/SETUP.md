# TBHF Scholars Network — Setup (Phase 1: Profiles)

This is the real application (Next.js 16 + Supabase). Phase 1 implements the
**Scholar & Alumni Profiles** component end-to-end.

## 1. Create your Supabase project

1. Go to https://supabase.com → create a new project.
2. Pick a region close to your users (e.g. `eu-central-1` for MENA/Europe).
3. Save the database password somewhere safe.

## 2. Add your credentials

Open `.env.local` in this folder and fill in the two values from
**Supabase Dashboard → Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-OR-PUBLISHABLE-KEY
```

## 3. Run the database setup SQL

The normalized schema (profiles + academic + skills/languages/interests +
alumni, etc.) already exists in the project. Two setup scripts complete it:

1. [`supabase/setup_profiles_auth.sql`](supabase/setup_profiles_auth.sql) —
   signup trigger + read/own-write RLS. **(Already run by the project owner.)**
2. [`supabase/phase1_writes.sql`](supabase/phase1_writes.sql) — **run this one.**
   Adds the write functions (skills/languages/interests/academic/alumni), an
   enum-values helper, read RLS for `alumni_details`, and the `avatars`
   storage bucket.

Open **Supabase Dashboard → SQL Editor → New query**, paste the entire
contents of `phase1_writes.sql`, and click **Run**. It's idempotent (safe to
re-run).

## 4. (Dev only) Turn off email confirmation

So you can sign up and log in instantly while developing:

**Dashboard → Authentication → Sign In / Providers → Email** → turn **off**
"Confirm email". (Re-enable it before going live.)

## 5. Run the app

```bash
npm run dev
```

Open http://localhost:3000 — you'll be redirected to **/login**.
Click **Create an account**, sign up, and you'll land on your (empty) profile.
Hit **Edit profile** to fill it in, upload a photo, and set privacy.

## What works in Phase 1

- Sign up / sign in / sign out (Supabase Auth)
- Your profile page with real data: bio, skills, languages, interests,
  education history, and an alumni section
- Edit form: core fields, avatar upload, comma-separated tags, repeatable
  education records, alumni details (when you mark yourself alumni)
- Profile visibility (public / private) enforced by RLS
- Viewing another scholar's public profile at `/scholars/<their-id>`

## Project map

| Path | Purpose |
|------|---------|
| `app/login`, `app/signup` | Auth screens + server actions |
| `app/(app)/profile` | Own profile view |
| `app/(app)/profile/edit` | Edit form + save action (core + RPC writes) |
| `app/(app)/scholars/[id]` | View another scholar |
| `lib/supabase/*` | Supabase client (browser/server/proxy) |
| `lib/profiles.ts` | Profile data access (full profile + enum helper) |
| `lib/types.ts`, `lib/theme.ts` | Types + design tokens |
| `supabase/setup_profiles_auth.sql` | Trigger + read RLS (already run) |
| `supabase/phase1_writes.sql` | Write functions + storage bucket (run this) |
