-- ============================================================
-- phase2c_groups.sql  —  Phase 2c: Groups / Communities.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Scholars can form & join university / country / thematic groups.
-- Tables: groups, group_members.
-- Group creation goes through create_group() (also makes the creator an
-- admin member). Join/leave use direct RLS-guarded writes. Reads are open
-- to any signed-in member (a closed network).
-- ============================================================

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  category    text not null default 'thematic'
              check (category in ('university', 'country', 'thematic', 'other')),
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('admin', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index if not exists group_members_profile_idx on public.group_members (profile_id);

-- ---------- RLS ----------
alter table public.groups enable row level security;

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated using (true);

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete to authenticated using (created_by = auth.uid());

alter table public.group_members enable row level security;

drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated using (true);

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- create a group (creator becomes admin member) ----------
create or replace function public.create_group(p_name text, p_description text, p_category text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); gid uuid; cat text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'name required'; end if;

  cat := case when p_category in ('university', 'country', 'thematic', 'other') then p_category else 'thematic' end;

  insert into public.groups (name, description, category, created_by)
  values (btrim(p_name), nullif(btrim(p_description), ''), cat, uid)
  returning id into gid;

  insert into public.group_members (group_id, profile_id, role)
  values (gid, uid, 'admin');

  return gid;
end;
$$;
grant execute on function public.create_group(text, text, text) to authenticated;

-- ---------- discover groups (with member count + my membership) ----------
create or replace function public.list_groups(p_search text default null, p_category text default null)
returns table (
  id           uuid,
  name         text,
  description  text,
  category     text,
  member_count bigint,
  is_member    boolean,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id, g.name, g.description, g.category,
    (select count(*) from public.group_members gm where gm.group_id = g.id) as member_count,
    exists (select 1 from public.group_members gm2 where gm2.group_id = g.id and gm2.profile_id = auth.uid()) as is_member,
    g.created_at
  from public.groups g
  where (coalesce(p_search, '') = '' or g.name ilike '%' || p_search || '%' or g.description ilike '%' || p_search || '%')
    and (coalesce(p_category, '') = '' or g.category = p_category)
  order by member_count desc, g.created_at desc;
$$;
grant execute on function public.list_groups(text, text) to authenticated;
