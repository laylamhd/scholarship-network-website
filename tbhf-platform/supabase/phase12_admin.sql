-- ============================================================
-- phase12_admin.sql  —  Phase 12: Scholar & Alumni Management (Admin).
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- The admin module lives on the HOME page (rendered only when the signed-in
-- user's role = 'admin'). Because per-profile RLS hides private fields, all
-- platform-wide analytics are served by SECURITY DEFINER functions that
-- check is_admin() first and raise if the caller isn't an admin — so profile
-- RLS stays untouched and only aggregates (never raw private data) leak out.
--
-- Depends on prior phases (profiles, follows, groups, messages, mentorships,
-- stories, showcase_items, events, event_rsvps, research_posts,
-- community_projects, volunteer_hours, alumni_offers) and is_admin() (phase3).
-- ============================================================

-- ---------- Overview: registration counts ----------
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select jsonb_build_object(
    'total',      count(*),
    'scholars',   count(*) filter (where role = 'scholar'),
    'alumni',     count(*) filter (where role = 'alumni'),
    'admins',     count(*) filter (where role = 'admin'),
    'active',     count(*) filter (where is_active),
    'inactive',   count(*) filter (where not is_active),
    'onboarded',  count(*) filter (where onboarded_at is not null),
    'new_7d',     count(*) filter (where created_at >= now() - interval '7 days'),
    'new_30d',    count(*) filter (where created_at >= now() - interval '30 days')
  ) into result
  from public.profiles;
  return result;
end; $$;
grant execute on function public.admin_overview() to authenticated;

-- ---------- Demographics: breakdowns ----------
create or replace function public.admin_demographics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'by_country', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(country), ''), 'Unknown') as label, count(*) as cnt
        from public.profiles group by 1 order by cnt desc limit 12
      ) s
    ),
    'by_nationality', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(nationality), ''), 'Unknown') as label, count(*) as cnt
        from public.profiles group by 1 order by cnt desc limit 12
      ) s
    ),
    'by_gender', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select coalesce(nullif(trim(gender), ''), 'Not specified') as label, count(*) as cnt
        from public.profiles group by 1 order by cnt desc
      ) s
    ),
    'by_role', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select role::text as label, count(*) as cnt
        from public.profiles group by 1 order by cnt desc
      ) s
    ),
    'by_degree', (
      select coalesce(jsonb_agg(jsonb_build_object('label', label, 'count', cnt) order by cnt desc), '[]'::jsonb)
      from (
        select degree_level::text as label, count(distinct profile_id) as cnt
        from public.scholar_academic_records group by 1 order by cnt desc
      ) s
    )
  );
end; $$;
grant execute on function public.admin_demographics() to authenticated;

-- ---------- Engagement: content + interactions + signup trend ----------
create or replace function public.admin_engagement()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'stories',         (select count(*) from public.stories),
    'research',        (select count(*) from public.research_posts),
    'projects',        (select count(*) from public.community_projects),
    'showcase',        (select count(*) from public.showcase_items),
    'events',          (select count(*) from public.events),
    'offers',          (select count(*) from public.alumni_offers),
    'follows',         (select count(*) from public.follows where status = 'active'),
    'group_members',   (select count(*) from public.group_members),
    'messages',        (select count(*) from public.messages),
    'mentorships',     (select count(*) from public.mentorships),
    'rsvps',           (select count(*) from public.event_rsvps),
    'volunteer_hours', (select coalesce(round(sum(hours)), 0) from public.volunteer_hours),
    'signups_trend', (
      select coalesce(jsonb_agg(jsonb_build_object('date', d, 'count', cnt) order by d), '[]'::jsonb)
      from (
        select gs::date as d,
          (select count(*) from public.profiles p where p.created_at::date = gs::date) as cnt
        from generate_series((now()::date - interval '29 days'), now()::date, interval '1 day') gs
      ) t
    )
  );
end; $$;
grant execute on function public.admin_engagement() to authenticated;

-- ---------- Members: searchable roster with profile-completion score ----------
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
  -- EVERY field is read through to_jsonb(p) — never a direct column reference —
  -- so a column that doesn't exist in this database simply yields null instead
  -- of raising "column does not exist", which would make the whole function
  -- error and return zero rows (the old version still touched p.country /
  -- p.is_active directly and broke when either was missing). is_active defaults
  -- to true when absent so members aren't hidden, and bad/missing timestamps
  -- sort last rather than aborting the query.
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

-- ---------- Member management: role + active state ----------
create or replace function public.admin_set_role(p_target uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if p_role not in ('scholar', 'alumni', 'admin') then raise exception 'Invalid role'; end if;
  update public.profiles set role = p_role::user_role, updated_at = now() where id = p_target;
end; $$;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

create or replace function public.admin_set_active(p_target uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  update public.profiles set is_active = p_active, updated_at = now() where id = p_target;
end; $$;
grant execute on function public.admin_set_active(uuid, boolean) to authenticated;

-- ---------- Communications: announcements ----------
create table if not exists public.admin_announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  body        text not null,
  audience    text not null default 'all' check (audience in ('all', 'scholars', 'alumni')),
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists admin_announcements_active_idx on public.admin_announcements (is_active, created_at desc);

alter table public.admin_announcements enable row level security;

-- Admins manage everything.
drop policy if exists admin_announcements_admin_all on public.admin_announcements;
create policy admin_announcements_admin_all on public.admin_announcements
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Everyone may read active announcements targeted to their role.
drop policy if exists admin_announcements_read on public.admin_announcements;
create policy admin_announcements_read on public.admin_announcements
  for select to authenticated using (
    is_active and (
      audience = 'all'
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and ((audience = 'scholars' and p.role = 'scholar')
            or (audience = 'alumni' and p.role = 'alumni'))
      )
    )
  );
