-- ============================================================
-- phase20_admin_members_fix.sql  —  Fix: admin Members roster showed "0 of 0".
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Symptom: the admin dashboard "Members" tab (and the Advanced-settings
-- "Assign moderator" / "Assign admin" pickers, which all read admin_members)
-- showed zero members even though profiles exist.
--
-- Cause: admin_members() still referenced p.country / p.is_active directly in
-- its SELECT. If either column was missing from this database the whole
-- function raised "column does not exist", the app caught the error and
-- returned [], so the roster looked empty.
--
-- Fix: (1) make sure profiles.is_active exists; (2) redefine admin_members to
-- read every field through to_jsonb(p) so a missing column yields null instead
-- of aborting the query.
-- ============================================================

-- (1) Guarantee the columns the admin module relies on actually exist.
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists country   text;

-- (2) Hardened roster function — never touches a column name directly.
create or replace function public.admin_members(p_search text default null, p_role text default null)
returns table (
  id uuid, full_name text, email text, role text,
  country text, is_active boolean, created_at timestamptz, completion int
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query
  select
    (j ->> 'id')::uuid                              as id,
    j ->> 'full_name'                               as full_name,
    j ->> 'email'                                   as email,
    coalesce(j ->> 'role', 'scholar')               as role,
    j ->> 'country'                                 as country,
    coalesce((j ->> 'is_active')::boolean, true)    as is_active,
    nullif(j ->> 'created_at', '')::timestamptz     as created_at,
    ((  (case when j ->> 'avatar_url'         is not null then 1 else 0 end)
      + (case when j ->> 'bio'                is not null then 1 else 0 end)
      + (case when j ->> 'nationality'        is not null then 1 else 0 end)
      + (case when j ->> 'country'            is not null then 1 else 0 end)
      + (case when j ->> 'city'               is not null then 1 else 0 end)
      + (case when j ->> 'career_aspirations' is not null then 1 else 0 end)
      + (case when j ->> 'research_interests' is not null then 1 else 0 end)
      + (case when j ->> 'date_of_birth'      is not null then 1 else 0 end)
     ) * 100 / 8) as completion
  from public.profiles p
  cross join lateral (select to_jsonb(p) as j) tj
  where (p_search is null or (j ->> 'full_name') ilike '%' || p_search || '%' or (j ->> 'email') ilike '%' || p_search || '%')
    and (p_role is null or coalesce(j ->> 'role', 'scholar') = p_role)
  order by nullif(j ->> 'created_at', '')::timestamptz desc nulls last
  limit 200;
end; $$;
grant execute on function public.admin_members(text, text) to authenticated;
