-- ============================================================
-- security_hardening.sql  —  Fixes from the security audit (SECURITY_AUDIT.md).
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
-- Each block is tagged with its BUG id from SECURITY_AUDIT_FINDINGS.
-- NOTE: BUG-001 (admin code rotation) is intentionally NOT here — it's a secret
-- and must be set directly, never committed to the repo.
-- ============================================================

-- ---------- BUG-002: profiles readable by anon (PII/email exposure) ----------
-- Require an authenticated caller for the directory. Owner + public-visibility
-- logic is unchanged for logged-in users.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (auth.uid() = id or profile_visibility = 'public');

-- ---------- BUG-003: profile-linked tables readable by anon ----------
-- Harden the shared gate function to reject anonymous callers...
create or replace function public.can_view_profile(p uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p
      and auth.uid() is not null
      and (id = auth.uid() or profile_visibility = 'public')
  );
$$;

-- ...and restrict every profile-linked select policy to authenticated.
drop policy if exists sar_select on public.scholar_academic_records;
create policy sar_select on public.scholar_academic_records
  for select to authenticated using (public.can_view_profile(profile_id));

drop policy if exists profile_skills_select on public.profile_skills;
create policy profile_skills_select on public.profile_skills
  for select to authenticated using (public.can_view_profile(profile_id));

drop policy if exists profile_languages_select on public.profile_languages;
create policy profile_languages_select on public.profile_languages
  for select to authenticated using (public.can_view_profile(profile_id));

drop policy if exists profile_interests_select on public.profile_interests;
create policy profile_interests_select on public.profile_interests
  for select to authenticated using (public.can_view_profile(profile_id));

drop policy if exists alumni_details_select on public.alumni_details;
create policy alumni_details_select on public.alumni_details
  for select to authenticated using (public.can_view_profile(profile_id));

-- ---------- BUG-004: admin-code verify oracle exposed to anon ----------
-- Remove the public true/false oracle. redeem_admin_access() (SECURITY DEFINER)
-- still validates the code internally as the function owner. The app no longer
-- pre-checks the code (see app/login/actions.ts adminSignup).
revoke execute on function public.verify_admin_code(text) from public;
revoke execute on function public.verify_admin_code(text) from anon;
revoke execute on function public.verify_admin_code(text) from authenticated;

-- ---------- BUG-007: storage upload limits (member-content buckets) ----------
-- Non-breaking hardening applied now (full private-bucket + signed-URL migration
-- is deferred — see SECURITY_AUDIT_FINDINGS). Caps upload size and restricts MIME
-- types on the member-content buckets to curb abuse / malicious uploads. Only
-- affects FUTURE uploads. Adjust the allowlist if you need other file types.
update storage.buckets
   set file_size_limit = 26214400,  -- 25 MiB
       allowed_mime_types = array[
         'application/pdf',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.ms-powerpoint',
         'application/vnd.openxmlformats-officedocument.presentationml.presentation',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
         'text/plain', 'text/csv',
         'image/png', 'image/jpeg', 'image/gif', 'image/webp',
         'application/zip'
       ]
 where id in ('resources', 'research');

-- Image-only buckets (avatars/covers/posters/project images): 10 MiB + images.
update storage.buckets
   set file_size_limit = 10485760,  -- 10 MiB
       allowed_mime_types = array['image/png','image/jpeg','image/gif','image/webp']
 where id in ('avatars', 'story-covers', 'event-posters', 'projects');

-- Mixed-media buckets (showcase, community-media hold video/presentations too):
-- cap size only, leave MIME unrestricted so legit videos/decks still upload.
update storage.buckets
   set file_size_limit = 104857600  -- 100 MiB
 where id in ('showcase', 'community-media');

-- ---------- BUG-012: get_enum_values() exposed to anon ----------
-- Dropdowns are only built after login; don't let anon enumerate enum defs.
revoke execute on function public.get_enum_values(text) from public;
revoke execute on function public.get_enum_values(text) from anon;
grant execute on function public.get_enum_values(text) to authenticated;
