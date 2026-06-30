-- ============================================================
-- phase15_communities.sql  —  Admin-managed Communities (the "Community" tab).
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Distinct from the older self-serve "Groups" feature (left untouched).
--   * Only admins can CREATE a community and ADD / REMOVE members.
--   * Students & alumni can ONLY see communities they were added to.
--   * Inside a community everyone sees the member count, a discussion feed
--     (posts + likes + comments), and a roll-up of the platform content
--     published by that community's members.
--
-- All access goes through SECURITY DEFINER RPCs; the tables have RLS enabled
-- with no client policies, so visibility is enforced centrally.
--
-- Requires is_admin() (phase3) and the review_status columns from phase13.
-- ============================================================

-- ---------- Tables ----------
create table if not exists public.communities (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  accent       text,                          -- optional banner accent colour
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  added_by     uuid references public.profiles(id) on delete set null,
  joined_at    timestamptz not null default now(),
  primary key (community_id, profile_id)
);
create index if not exists community_members_profile_idx on public.community_members (profile_id);

create table if not exists public.community_posts (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id    uuid not null references public.profiles(id) on delete cascade,
  content      text not null,
  is_deleted   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists community_posts_idx on public.community_posts (community_id, created_at desc);

create table if not exists public.community_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists community_post_comments_idx on public.community_post_comments (post_id, created_at asc);

create table if not exists public.community_post_likes (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

-- ---------- Lock down direct access (everything goes through RPCs) ----------
alter table public.communities           enable row level security;
alter table public.community_members     enable row level security;
alter table public.community_posts        enable row level security;
alter table public.community_post_comments enable row level security;
alter table public.community_post_likes   enable row level security;
-- No policies on purpose.

-- ---------- Membership helper ----------
create or replace function public.is_community_member(p_community uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.community_members
    where community_id = p_community and profile_id = auth.uid()
  );
$$;
grant execute on function public.is_community_member(uuid) to authenticated;

-- A member OR an admin may view / participate in a community.
create or replace function public.can_access_community(p_community uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_community_member(p_community);
$$;
grant execute on function public.can_access_community(uuid) to authenticated;

-- ---------- Admin: create a community ----------
create or replace function public.admin_create_community(p_name text, p_description text, p_accent text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare cid uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'A name is required'; end if;

  insert into public.communities (name, description, accent, created_by)
  values (btrim(p_name), nullif(btrim(p_description), ''), nullif(btrim(p_accent), ''), auth.uid())
  returning id into cid;

  return cid;
end;
$$;
grant execute on function public.admin_create_community(text, text, text) to authenticated;

-- ---------- Admin: add / remove a member ----------
create or replace function public.admin_add_community_member(p_community uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  insert into public.community_members (community_id, profile_id, added_by)
  values (p_community, p_profile, auth.uid())
  on conflict (community_id, profile_id) do nothing;
end;
$$;
grant execute on function public.admin_add_community_member(uuid, uuid) to authenticated;

create or replace function public.admin_remove_community_member(p_community uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  delete from public.community_members where community_id = p_community and profile_id = p_profile;
end;
$$;
grant execute on function public.admin_remove_community_member(uuid, uuid) to authenticated;

-- ---------- Admin: delete a community ----------
create or replace function public.admin_delete_community(p_community uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  delete from public.communities where id = p_community;
end;
$$;
grant execute on function public.admin_delete_community(uuid) to authenticated;

-- ---------- List communities (admin: all; member: only theirs) ----------
create or replace function public.list_communities(p_search text default null)
returns table (
  id           uuid,
  name         text,
  description  text,
  accent       text,
  member_count bigint,
  post_count   bigint,
  is_member    boolean,
  created_at   timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id, c.name, c.description, c.accent,
    (select count(*) from public.community_members cm where cm.community_id = c.id) as member_count,
    (select count(*) from public.community_posts cp where cp.community_id = c.id and cp.is_deleted = false) as post_count,
    public.is_community_member(c.id) as is_member,
    c.created_at
  from public.communities c
  where (public.is_admin() or public.is_community_member(c.id))
    and (coalesce(p_search, '') = '' or c.name ilike '%' || p_search || '%' or c.description ilike '%' || p_search || '%')
  order by c.created_at desc;
$$;
grant execute on function public.list_communities(text) to authenticated;

-- ---------- Community detail (members + flags) ----------
create or replace function public.get_community(p_community uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not public.can_access_community(p_community) then return null; end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'accent', c.accent,
    'created_at', c.created_at,
    'is_admin', public.is_admin(),
    'member_count', (select count(*) from public.community_members cm where cm.community_id = c.id),
    'post_count', (select count(*) from public.community_posts cp where cp.community_id = c.id and cp.is_deleted = false),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'full_name', pr.full_name,
          'avatar_url', pr.avatar_url,
          'role', pr.role,
          'joined_at', m.joined_at
        ) order by m.joined_at asc)
      from public.community_members m
      join public.profiles pr on pr.id = m.profile_id
      where m.community_id = c.id
    ), '[]'::jsonb)
  )
  into result
  from public.communities c
  where c.id = p_community;

  return result;
end;
$$;
grant execute on function public.get_community(uuid) to authenticated;

-- ---------- Discussion feed ----------
create or replace function public.get_community_feed(p_community uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if not public.can_access_community(p_community) then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'content', p.content,
        'created_at', p.created_at,
        'author', jsonb_build_object('id', ap.id, 'full_name', ap.full_name, 'avatar_url', ap.avatar_url),
        'like_count', (select count(*) from public.community_post_likes pl where pl.post_id = p.id),
        'liked', exists (select 1 from public.community_post_likes pl2 where pl2.post_id = p.id and pl2.profile_id = uid),
        'comments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', cc.id,
              'content', cc.content,
              'created_at', cc.created_at,
              'author', jsonb_build_object('id', cp.id, 'full_name', cp.full_name, 'avatar_url', cp.avatar_url)
            ) order by cc.created_at asc)
          from public.community_post_comments cc
          join public.profiles cp on cp.id = cc.author_id
          where cc.post_id = p.id and cc.is_deleted = false
        ), '[]'::jsonb)
      ) order by p.created_at desc)
    from public.community_posts p
    join public.profiles ap on ap.id = p.author_id
    where p.community_id = p_community and p.is_deleted = false
  ), '[]'::jsonb);
end;
$$;
grant execute on function public.get_community_feed(uuid) to authenticated;

-- ---------- Create a post / comment / like ----------
create or replace function public.create_community_post(p_community uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.can_access_community(p_community) then raise exception 'not allowed'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty post'; end if;

  insert into public.community_posts (community_id, author_id, content)
  values (p_community, uid, btrim(p_content))
  returning id into pid;
  return pid;
end;
$$;
grant execute on function public.create_community_post(uuid, text) to authenticated;

create or replace function public.add_community_comment(p_post uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); cid uuid; cmt uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty comment'; end if;

  select community_id into cid from public.community_posts where id = p_post and is_deleted = false;
  if cid is null or not public.can_access_community(cid) then raise exception 'not allowed'; end if;

  insert into public.community_post_comments (post_id, author_id, content)
  values (p_post, uid, btrim(p_content))
  returning id into cmt;
  return cmt;
end;
$$;
grant execute on function public.add_community_comment(uuid, text) to authenticated;

create or replace function public.toggle_community_like(p_post uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); cid uuid; liked boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select community_id into cid from public.community_posts where id = p_post and is_deleted = false;
  if cid is null or not public.can_access_community(cid) then raise exception 'not allowed'; end if;

  if exists (select 1 from public.community_post_likes where post_id = p_post and profile_id = uid) then
    delete from public.community_post_likes where post_id = p_post and profile_id = uid;
    liked := false;
  else
    insert into public.community_post_likes (post_id, profile_id) values (p_post, uid);
    liked := true;
  end if;
  return liked;
end;
$$;
grant execute on function public.toggle_community_like(uuid) to authenticated;

-- ---------- Roll-up: platform content published by a community's members ----------
-- Surfaces APPROVED content (stories must also be published) authored by the
-- members of this community, newest first.
create or replace function public.get_community_member_content(p_community uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.can_access_community(p_community) then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'entity_type', t.entity_type,
        'id', t.id,
        'title', t.title,
        'author_id', t.author_id,
        'author_name', pr.full_name,
        'author_avatar', pr.avatar_url,
        'created_at', t.created_at
      ) order by t.created_at desc)
    from (
      select 'stories'::text as entity_type, s.id, coalesce(s.title, '(untitled)') as title, s.author_id, s.created_at
        from public.stories s
        where s.author_id in (select profile_id from public.community_members where community_id = p_community)
          and s.review_status = 'approved' and coalesce(s.status, '') = 'published'
      union all
      select 'research_posts', r.id, coalesce(r.title, '(untitled)'), r.author_id, r.created_at
        from public.research_posts r
        where r.author_id in (select profile_id from public.community_members where community_id = p_community)
          and r.review_status = 'approved'
      union all
      select 'showcase_items', sh.id, coalesce(sh.title, '(untitled)'), sh.uploaded_by, sh.created_at
        from public.showcase_items sh
        where sh.uploaded_by in (select profile_id from public.community_members where community_id = p_community)
          and sh.review_status = 'approved'
      union all
      select 'community_projects', cpj.id, coalesce(cpj.title, '(untitled)'), cpj.organizer_id, cpj.created_at
        from public.community_projects cpj
        where cpj.organizer_id in (select profile_id from public.community_members where community_id = p_community)
          and cpj.review_status = 'approved'
      union all
      select 'events', e.id, coalesce(e.title, '(untitled)'), e.created_by, e.created_at
        from public.events e
        where e.created_by in (select profile_id from public.community_members where community_id = p_community)
          and e.review_status = 'approved'
      union all
      select 'alumni_offers', ao.id, coalesce(ao.title, '(untitled)'), ao.alumni_id, ao.created_at
        from public.alumni_offers ao
        where ao.alumni_id in (select profile_id from public.community_members where community_id = p_community)
          and ao.review_status = 'approved'
    ) t
    join public.profiles pr on pr.id = t.author_id
  ), '[]'::jsonb);
end;
$$;
grant execute on function public.get_community_member_content(uuid) to authenticated;

-- ---------- Admin: profiles that can still be added to a community ----------
create or replace function public.admin_addable_profiles(p_community uuid, p_search text default null)
returns table (id uuid, full_name text, email text, role text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.role::text, p.avatar_url
  from public.profiles p
  where public.is_admin()
    and not exists (
      select 1 from public.community_members cm
      where cm.community_id = p_community and cm.profile_id = p.id
    )
    and (coalesce(p_search, '') = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%')
  order by p.full_name asc
  limit 50;
$$;
grant execute on function public.admin_addable_profiles(uuid, text) to authenticated;
