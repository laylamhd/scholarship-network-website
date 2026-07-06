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
-- Caps upload size and restricts MIME types on the member-content buckets to curb
-- abuse / malicious uploads (only affects FUTURE uploads; adjust the allowlist if
-- you need other file types). The full private-bucket + signed-URL change is in
-- the "round 2" section at the bottom of this file.
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

-- ============================================================
-- Follow-up scan fixes (round 2)
-- ============================================================

-- ---------- BUG-014: gate @all broadcasts to community moderators ----------
-- @all now requires community_can_moderate() (admin, or a manage_communities
-- moderator who is a member of that community) instead of any platform mod.
create or replace function public.notify_community_mentions(
  p_community uuid, p_actor uuid, p_content text, p_entity_id uuid
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_name    text;
  v_snippet text;
  r         record;
  v_is_all  boolean;
begin
  select full_name into v_name from public.profiles where id = p_actor;
  v_snippet := left(regexp_replace(p_content, '@\[([^\]]+)\]\([0-9a-fA-F-]{36}\)', '@\1', 'g'), 140);

  v_is_all := p_content ~* '(^|[^[:alnum:]_])@all([^[:alnum:]_]|$)'
              and public.community_can_moderate(p_community);

  if v_is_all then
    for r in
      select profile_id as uid from public.community_members
      where community_id = p_community and profile_id <> p_actor
    loop
      perform public.notify_member(
        r.uid, 'mentions', 'mention',
        coalesce(v_name, 'Someone') || ' mentioned everyone',
        v_snippet, 'communities', p_community
      );
    end loop;
    return;
  end if;

  for r in
    select distinct (m)[1]::uuid as uid
    from regexp_matches(p_content, '\(([0-9a-fA-F-]{36})\)', 'g') as m
  loop
    if r.uid <> p_actor
       and exists (select 1 from public.community_members
                   where community_id = p_community and profile_id = r.uid) then
      perform public.notify_member(
        r.uid, 'mentions', 'mention',
        coalesce(v_name, 'Someone') || ' mentioned you',
        v_snippet, 'communities', p_community
      );
    end if;
  end loop;
end; $$;

-- ---------- BUG-010: block direct reads of profiles.email ----------
-- Only the owner (via auth session) and admins (via admin_* RPCs, which run as
-- the definer) need email. Remove column read access for anon/authenticated so
-- a logged-in member can't scrape everyone's email via ?select=email. The app
-- selects explicit non-email columns (see lib/profiles.ts).
revoke select on public.profiles from anon;
revoke select on public.profiles from authenticated;
-- Every profiles column EXCEPT email. If you add a new column to profiles, add it
-- here too (and to the explicit select in lib/profiles.ts getFullProfile).
grant select (
  id, full_name, avatar_url, role, country, nationality, gender, bio,
  profile_visibility, is_active, created_at, updated_at, onboarded_at,
  date_of_birth, phone, city, dashboard_layout, notification_prefs,
  field_privacy, research_interests, career_aspirations, volunteer_experience
) on public.profiles to authenticated;

-- ---------- BUG-007: private member-content buckets + read policy ----------
-- resources & research now hold members-only files; make them private so the
-- public object URL no longer works, and let authenticated members read via the
-- storage API / signed URLs. The app stores object PATHS and generates signed
-- URLs at render time (lib/resources.ts, lib/research.ts).
update storage.buckets set public = false where id in ('resources', 'research');

drop policy if exists member_content_read on storage.objects;
create policy member_content_read on storage.objects
  for select to authenticated
  using (bucket_id in ('resources', 'research'));
