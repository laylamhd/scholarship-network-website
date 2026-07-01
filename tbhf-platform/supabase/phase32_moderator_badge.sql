-- ============================================================
-- phase32_moderator_badge.sql  —  Show a "Moderator" badge on profiles.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- The moderators table is only readable by admins and the moderator
-- themselves (see phase21), so a scholar viewing someone else's profile
-- can't tell whether that person is a moderator. This adds a tiny
-- SECURITY DEFINER helper that exposes ONLY a boolean (never the
-- capability list), so the profile page can render the badge for anyone.
-- ============================================================

create or replace function public.is_profile_moderator(p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators where profile_id = p_id);
$$;
grant execute on function public.is_profile_moderator(uuid) to authenticated;
