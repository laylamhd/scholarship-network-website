-- ============================================================
-- phase5_mentorship.sql  —  Phase 5: Peer-to-Peer Mentorship.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Scholars (mentees) are matched with Alumni mentors (graduated recipients).
-- An alumnus opts in via alumni_details.willing_to_mentor and can describe
-- what they help with (mentorship_topics). Opting in = appearing in the
-- mentor directory, so list_mentors() is SECURITY DEFINER and bypasses
-- profile visibility for mentors only (they chose to be discoverable).
--
-- Table: mentorships (one row per mentee->mentor relationship).
--   status: pending -> active | declined ; active -> ended
-- All relational writes go through SECURITY DEFINER RPCs scoped to auth.uid().
-- ============================================================

-- ---------- mentor profile fields ----------
alter table public.alumni_details
  add column if not exists mentorship_topics text;

-- ---------- mentorships ----------
create table if not exists public.mentorships (
  id           uuid primary key default gen_random_uuid(),
  mentee_id    uuid not null references public.profiles(id) on delete cascade,
  mentor_id    uuid not null references public.profiles(id) on delete cascade,
  message      text,
  status       text not null default 'pending'
               check (status in ('pending', 'active', 'declined', 'ended')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  updated_at   timestamptz not null default now(),
  check (mentee_id <> mentor_id)
);
create index if not exists mentorships_mentor_idx on public.mentorships (mentor_id);
create index if not exists mentorships_mentee_idx on public.mentorships (mentee_id);

-- Only one live (pending or active) relationship per mentee+mentor pair.
create unique index if not exists mentorships_live_unique
  on public.mentorships (mentee_id, mentor_id)
  where status in ('pending', 'active');

-- ---------- RLS (each party sees their own relationships) ----------
alter table public.mentorships enable row level security;

drop policy if exists mentorships_select on public.mentorships;
create policy mentorships_select on public.mentorships
  for select to authenticated
  using (mentee_id = auth.uid() or mentor_id = auth.uid());

-- Writes are funneled through the RPCs below; no direct insert/update/delete.

-- ---------- mentor directory ----------
-- Returns alumni who are willing to mentor (regardless of profile_visibility,
-- since opting in makes them discoverable), with my current request status.
create or replace function public.list_mentors(p_search text default null)
returns table (
  mentor_id           uuid,
  full_name           text,
  avatar_url          text,
  nationality         text,
  country             text,
  current_position    text,
  current_employer    text,
  industry            text,
  sector              text,
  years_of_experience int,
  mentorship_topics   text,
  my_status           text,
  my_mentorship_id    uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.full_name, p.avatar_url, p.nationality, p.country,
    a.current_position, a.current_employer, a.industry, a.sector,
    a.years_of_experience, a.mentorship_topics,
    m.status, m.id
  from public.alumni_details a
  join public.profiles p on p.id = a.profile_id
  left join lateral (
    select status, id from public.mentorships
    where mentor_id = p.id and mentee_id = auth.uid()
      and status in ('pending', 'active')
    order by created_at desc
    limit 1
  ) m on true
  where a.willing_to_mentor is true
    and p.is_active is true
    and p.id <> auth.uid()
    and (
      coalesce(p_search, '') = ''
      or p.full_name ilike '%' || p_search || '%'
      or p.country ilike '%' || p_search || '%'
      or p.nationality ilike '%' || p_search || '%'
      or a.industry ilike '%' || p_search || '%'
      or a.mentorship_topics ilike '%' || p_search || '%'
    )
  order by (m.status is not null) desc, p.full_name asc;
$$;
grant execute on function public.list_mentors(text) to authenticated;

-- ---------- my mentorships (both directions, enriched) ----------
-- role = the viewer's role in each relationship ('mentee' or 'mentor').
create or replace function public.my_mentorships()
returns table (
  id            uuid,
  role          text,
  counterpart_id    uuid,
  counterpart_name  text,
  counterpart_avatar text,
  counterpart_role  text,
  counterpart_sub   text,
  message       text,
  status        text,
  created_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    case when m.mentee_id = auth.uid() then 'mentee' else 'mentor' end as role,
    cp.id, cp.full_name, cp.avatar_url, cp.role::text,
    nullif(concat_ws(' · ', nullif(cp.nationality, ''), nullif(cp.country, '')), '') as counterpart_sub,
    m.message, m.status, m.created_at
  from public.mentorships m
  join public.profiles cp
    on cp.id = case when m.mentee_id = auth.uid() then m.mentor_id else m.mentee_id end
  where m.mentee_id = auth.uid() or m.mentor_id = auth.uid()
  order by m.created_at desc;
$$;
grant execute on function public.my_mentorships() to authenticated;

-- ---------- request mentorship (mentee -> alumni mentor) ----------
create or replace function public.request_mentorship(p_mentor_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_mentor_id = uid then raise exception 'cannot mentor yourself'; end if;

  if not exists (
    select 1 from public.alumni_details
    where profile_id = p_mentor_id and willing_to_mentor is true
  ) then
    raise exception 'this person is not available as a mentor';
  end if;

  if exists (
    select 1 from public.mentorships
    where mentee_id = uid and mentor_id = p_mentor_id
      and status in ('pending', 'active')
  ) then
    raise exception 'you already have a request with this mentor';
  end if;

  insert into public.mentorships (mentee_id, mentor_id, message)
  values (uid, p_mentor_id, nullif(btrim(p_message), ''))
  returning id into mid;
  return mid;
end;
$$;
grant execute on function public.request_mentorship(uuid, text) to authenticated;

-- ---------- respond to a request (mentor accepts / declines) ----------
create or replace function public.respond_mentorship(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.mentorships
  set status = case when p_accept then 'active' else 'declined' end,
      responded_at = now(),
      updated_at = now()
  where id = p_id and mentor_id = uid and status = 'pending';

  if not found then raise exception 'request not found or not yours to answer'; end if;
end;
$$;
grant execute on function public.respond_mentorship(uuid, boolean) to authenticated;

-- ---------- end a mentorship (either party; also cancels a pending request) ----------
create or replace function public.end_mentorship(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.mentorships
  set status = 'ended', updated_at = now()
  where id = p_id
    and (mentee_id = uid or mentor_id = uid)
    and status in ('pending', 'active');

  if not found then raise exception 'mentorship not found'; end if;
end;
$$;
grant execute on function public.end_mentorship(uuid) to authenticated;

-- ---------- set my mentor availability (alumni only) ----------
create or replace function public.set_mentor_availability(p_available boolean, p_topics text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.alumni_details (profile_id, willing_to_mentor, mentorship_topics)
  values (uid, coalesce(p_available, false), nullif(btrim(p_topics), ''))
  on conflict (profile_id) do update
    set willing_to_mentor = coalesce(p_available, false),
        mentorship_topics = nullif(btrim(p_topics), '');
end;
$$;
grant execute on function public.set_mentor_availability(boolean, text) to authenticated;
