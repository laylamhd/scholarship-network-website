-- ============================================================
-- phase33_field_privacy.sql  —  Enforce per-field privacy server-side.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- PENTEST FINDING PT3-01: profiles.field_privacy ("hide this field") was only
-- applied in the React UI. Every column was still granted to the `authenticated`
-- role, so ANY logged-in member could read a "hidden" phone / date_of_birth /
-- city / bio / etc. of any other member directly via the REST API
-- (GET /rest/v1/profiles?select=phone). The toggle gave users false assurance.
--
-- Fix: (1) revoke the raw column SELECT grant for the personal fields, and
-- (2) serve them only through a SECURITY DEFINER function that applies
-- field_privacy and the viewer's identity (owner + admin always see their own
-- data; other members see a field only when it is not hidden). This mirrors how
-- profiles.email was locked down in BUG-010.
-- ============================================================

-- ---------- 1) Privacy-aware reader for a single profile ----------
-- Returns the profile as jsonb with personal fields masked (null) when the
-- caller is neither the owner nor an admin and the field is hidden. Fields with
-- no UI toggle and no reason to show to others (date_of_birth, gender) are
-- owner/admin-only. Row visibility mirrors the profiles_select RLS policy
-- (own row, or profile_visibility = 'public') so this exposes nothing new.
create or replace function public.get_profile_full(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  r       public.profiles%rowtype;
  is_self boolean;
  is_adm  boolean;
  fp      jsonb;
begin
  -- Must be authenticated (same gate as the profiles_select policy).
  if auth.uid() is null then
    return null;
  end if;

  select * into r
    from public.profiles
   where id = p_id
     and (id = auth.uid() or profile_visibility = 'public');
  if not found then
    return null;
  end if;

  is_self := (r.id = auth.uid());
  is_adm  := public.is_admin();
  fp      := coalesce(r.field_privacy, '{}'::jsonb);

  -- A toggle-gated field is visible unless explicitly hidden (key = false).
  -- (fp->>'key' is distinct from 'false'  ==  not hidden)
  return jsonb_build_object(
    -- Always-visible identity / directory fields (unchanged exposure).
    'id',                   r.id,
    'full_name',            r.full_name,
    'avatar_url',           r.avatar_url,
    'role',                 r.role,
    'country',              r.country,
    'profile_visibility',   r.profile_visibility,
    'is_active',            r.is_active,
    'created_at',           r.created_at,
    'updated_at',           r.updated_at,
    'onboarded_at',         r.onboarded_at,
    'field_privacy',        r.field_privacy,
    -- Toggle-gated personal fields (owner/admin always; others only if shown).
    'nationality',          case when is_self or is_adm or (fp->>'nationality')          is distinct from 'false' then r.nationality          else null end,
    'phone',                case when is_self or is_adm or (fp->>'phone')                is distinct from 'false' then r.phone                else null end,
    'city',                 case when is_self or is_adm or (fp->>'location')             is distinct from 'false' then r.city                 else null end,
    'bio',                  case when is_self or is_adm or (fp->>'bio')                  is distinct from 'false' then r.bio                  else null end,
    'career_aspirations',   case when is_self or is_adm or (fp->>'career_aspirations')   is distinct from 'false' then r.career_aspirations   else null end,
    'research_interests',   case when is_self or is_adm or (fp->>'research_interests')   is distinct from 'false' then r.research_interests   else null end,
    'volunteer_experience', case when is_self or is_adm or (fp->>'volunteer_experience') is distinct from 'false' then r.volunteer_experience else null end,
    -- No toggle, not shown to other members: owner/admin only.
    'date_of_birth',        case when is_self or is_adm then r.date_of_birth else null end,
    'gender',               case when is_self or is_adm then r.gender        else null end
  );
end;
$$;

revoke execute on function public.get_profile_full(uuid) from public, anon;
grant  execute on function public.get_profile_full(uuid) to authenticated;

-- ---------- 2) Remove the raw column grant for personal fields ----------
-- These columns must no longer be readable directly via the REST API by other
-- members; they are served (with masking) only through get_profile_full() above.
-- The owner reads their own values through the same function (is_self => true),
-- and admins via that function or the admin_* RPCs (SECURITY DEFINER).
--
-- Kept granted to `authenticated` (directory/discovery + own-session use):
--   id, full_name, avatar_url, role, country, nationality, profile_visibility,
--   is_active, created_at, updated_at, onboarded_at, dashboard_layout,
--   notification_prefs, field_privacy
-- (nationality + country stay readable because the alumni directory lists/searches
--  them; get_profile_full still honors the nationality toggle on the profile page.)
revoke select (
  phone,
  date_of_birth,
  city,
  gender,
  bio,
  career_aspirations,
  research_interests,
  volunteer_experience
) on public.profiles from authenticated;
