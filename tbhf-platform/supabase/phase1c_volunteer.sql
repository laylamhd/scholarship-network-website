-- ============================================================
-- phase1c_volunteer.sql  —  run AFTER phase1b_profile_extras.sql.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Adds a profile-level Volunteer Experience list (CV-style entries),
-- mirroring employment_history. This is separate from the future
-- Volunteer & Social Impact Portal (volunteer_logs / volunteer_projects).
-- ============================================================

create table if not exists public.volunteer_experiences (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  organization text not null,
  role         text,
  start_date   date,
  end_date     date,
  is_current   boolean not null default false,
  description  text,
  created_at   timestamptz not null default now()
);

create index if not exists volunteer_experiences_profile_idx
  on public.volunteer_experiences (profile_id);

-- Replace the caller's volunteer experiences with the given JSON array.
-- Each element: {organization, role, start_date, end_date, is_current, description}
create or replace function public.replace_my_volunteer_experiences(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  delete from public.volunteer_experiences where profile_id = uid;

  insert into public.volunteer_experiences
    (profile_id, organization, role, start_date, end_date, is_current, description)
  select
    uid,
    v->>'organization',
    nullif(v->>'role',''),
    nullif(v->>'start_date','')::date,
    nullif(v->>'end_date','')::date,
    coalesce((v->>'is_current')::boolean, false),
    nullif(v->>'description','')
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) v
  where coalesce(v->>'organization','') <> '';
end;
$$;
grant execute on function public.replace_my_volunteer_experiences(jsonb) to authenticated;

-- Read RLS: visible when the owning profile is visible to you.
alter table public.volunteer_experiences enable row level security;
drop policy if exists volunteer_experiences_select on public.volunteer_experiences;
create policy volunteer_experiences_select on public.volunteer_experiences
  for select using (public.can_view_profile(profile_id));
