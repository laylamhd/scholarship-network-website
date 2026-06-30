-- ============================================================
-- phase2d_discussions.sql  —  Phase 2d: Group Discussions.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Reuses the existing posts / post_comments / post_likes tables and adds
-- a group_id link to posts. All access goes through SECURITY DEFINER RPCs
-- (so the feed works for members even if some have private profiles);
-- direct table access is locked down by enabling RLS with no policies.
-- ============================================================

-- Link posts to a group (null = a future network-wide post).
alter table public.posts
  add column if not exists group_id uuid references public.groups(id) on delete cascade;
create index if not exists posts_group_idx on public.posts (group_id, created_at desc);

-- Lock down direct access (everything goes through the RPCs below).
alter table public.posts          enable row level security;
alter table public.post_comments  enable row level security;
alter table public.post_likes     enable row level security;

-- group membership helper (reused; safe to re-create)
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and profile_id = auth.uid()
  );
$$;
grant execute on function public.is_group_member(uuid) to authenticated;

-- ---------- read a group's feed (members only) ----------
create or replace function public.get_group_feed(p_group uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_group_member(p_group) then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'content', p.content,
        'created_at', p.created_at,
        'author', jsonb_build_object('id', ap.id, 'full_name', ap.full_name, 'avatar_url', ap.avatar_url),
        'like_count', (select count(*) from public.post_likes pl where pl.post_id = p.id),
        'liked', exists (select 1 from public.post_likes pl2 where pl2.post_id = p.id and pl2.profile_id = uid),
        'comments', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'content', c.content,
              'created_at', c.created_at,
              'author', jsonb_build_object('id', cp.id, 'full_name', cp.full_name, 'avatar_url', cp.avatar_url)
            ) order by c.created_at asc)
          from public.post_comments c
          join public.profiles cp on cp.id = c.author_id
          where c.post_id = p.id and c.is_deleted = false
        ), '[]'::jsonb)
      ) order by p.created_at desc)
    from public.posts p
    join public.profiles ap on ap.id = p.author_id
    where p.group_id = p_group and p.is_deleted = false
  ), '[]'::jsonb);
end;
$$;
grant execute on function public.get_group_feed(uuid) to authenticated;

-- ---------- create a post in a group ----------
create or replace function public.create_group_post(p_group uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_group_member(p_group) then raise exception 'not a member'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty post'; end if;

  insert into public.posts (author_id, content, group_id)
  values (uid, btrim(p_content), p_group)
  returning id into pid;
  return pid;
end;
$$;
grant execute on function public.create_group_post(uuid, text) to authenticated;

-- ---------- comment on a post ----------
create or replace function public.add_post_comment(p_post uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); gid uuid; cid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty comment'; end if;

  select group_id into gid from public.posts where id = p_post and is_deleted = false;
  if gid is null or not public.is_group_member(gid) then raise exception 'not allowed'; end if;

  insert into public.post_comments (post_id, author_id, content)
  values (p_post, uid, btrim(p_content))
  returning id into cid;
  return cid;
end;
$$;
grant execute on function public.add_post_comment(uuid, text) to authenticated;

-- ---------- like / unlike a post (returns the new liked state) ----------
create or replace function public.toggle_post_like(p_post uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); gid uuid; liked boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select group_id into gid from public.posts where id = p_post and is_deleted = false;
  if gid is null or not public.is_group_member(gid) then raise exception 'not allowed'; end if;

  if exists (select 1 from public.post_likes where post_id = p_post and profile_id = uid) then
    delete from public.post_likes where post_id = p_post and profile_id = uid;
    liked := false;
  else
    insert into public.post_likes (post_id, profile_id) values (p_post, uid);
    liked := true;
  end if;
  return liked;
end;
$$;
grant execute on function public.toggle_post_like(uuid) to authenticated;
