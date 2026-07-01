-- ============================================================
-- phase29_community_interactions.sql  —  Make Communities interactive (X / Reddit style)
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Adds, on top of phase15_communities.sql:
--   * @mentions  — a member is notified (category 'mentions') when @[Name](id)
--                  tokens name them in a post/comment. @all (admin/mod only)
--                  notifies every community member.
--   * Pinned posts & comments (admin/mod) float to the top.
--   * Locked posts (admin/mod) can't receive new comments.
--   * Announcement posts (admin/mod) render as a banner at the very top.
--   * Threaded replies — comments can reply to a parent comment.
--   * Bookmarks — a member can save posts to a personal list.
--   * Featured member "spotlight" (admin/mod) in the sidebar.
--   * Edit your own post/comment; moderators can remove ANY post/comment.
--   * Staff (admin/moderator) authorship is surfaced so the UI can highlight it.
--
-- Depends on: phase15_communities, phase21_moderators_fix (is_moderator, mod_can),
-- phase24 (notify_member). Requires is_admin() (phase3).
-- ============================================================

-- ---------- Schema additions ----------
alter table public.community_posts
  add column if not exists pinned_at       timestamptz,
  add column if not exists pinned_by       uuid references public.profiles(id) on delete set null,
  add column if not exists is_locked       boolean not null default false,
  add column if not exists is_announcement boolean not null default false,
  add column if not exists edited_at       timestamptz;

alter table public.community_post_comments
  add column if not exists parent_id  uuid references public.community_post_comments(id) on delete cascade,
  add column if not exists pinned_at  timestamptz,
  add column if not exists pinned_by  uuid references public.profiles(id) on delete set null,
  add column if not exists edited_at  timestamptz;
create index if not exists community_post_comments_parent_idx on public.community_post_comments (parent_id);

create table if not exists public.community_post_bookmarks (
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
alter table public.community_post_bookmarks enable row level security; -- no policies; RPC-only

create table if not exists public.community_spotlight (
  community_id uuid primary key references public.communities(id) on delete cascade,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  note         text,
  set_by       uuid references public.profiles(id) on delete set null,
  set_at       timestamptz not null default now()
);
alter table public.community_spotlight enable row level security; -- no policies; RPC-only

-- ---------- Role / permission helpers ----------
-- Global staff role of a member, used to highlight authorship in the feed.
create or replace function public.community_staff_role(p_profile uuid)
returns text
language sql stable security definer set search_path = public as $$
  select case
    when (select role::text from public.profiles where id = p_profile) = 'admin' then 'admin'
    when exists (select 1 from public.moderators where profile_id = p_profile)   then 'moderator'
    else null
  end;
$$;
grant execute on function public.community_staff_role(uuid) to authenticated;

-- May the current user moderate (pin / lock / remove any content / spotlight)
-- inside this community? Admins anywhere; moderators with the communities
-- capability who are members of it.
create or replace function public.community_can_moderate(p_community uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or (public.mod_can('manage_communities') and public.is_community_member(p_community));
$$;
grant execute on function public.community_can_moderate(uuid) to authenticated;

-- ---------- Mention fan-out ----------
-- Turns @[Name](uuid) tokens (and @all, for staff) into notifications.
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
  -- readable snippet: strip the token markup down to "@Name"
  v_snippet := left(regexp_replace(p_content, '@\[([^\]]+)\]\([0-9a-fA-F-]{36}\)', '@\1', 'g'), 140);

  v_is_all := p_content ~* '(^|[^[:alnum:]_])@all([^[:alnum:]_]|$)'
              and (public.is_admin() or public.mod_can('manage_communities'));

  if v_is_all then
    -- notify every other member of the community, once
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

  -- explicit @[Name](uuid) tokens
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
grant execute on function public.notify_community_mentions(uuid, uuid, text, uuid) to authenticated;

-- ============================================================
-- Posts — create (with optional announcement flag) + edit + delete + pin + lock
-- ============================================================
drop function if exists public.create_community_post(uuid, text);
create or replace function public.create_community_post(
  p_community uuid, p_content text, p_announcement boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pid uuid; v_ann boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.can_access_community(p_community) then raise exception 'not allowed'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty post'; end if;

  -- only staff may post announcements
  v_ann := coalesce(p_announcement, false) and public.community_can_moderate(p_community);

  insert into public.community_posts (community_id, author_id, content, is_announcement)
  values (p_community, uid, btrim(p_content), v_ann)
  returning id into pid;

  perform public.notify_community_mentions(p_community, uid, btrim(p_content), p_community);
  return pid;
end; $$;
grant execute on function public.create_community_post(uuid, text, boolean) to authenticated;

create or replace function public.edit_community_post(p_post uuid, p_content text)
returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_author uuid; v_comm uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty post'; end if;

  select author_id, community_id into v_author, v_comm
  from public.community_posts where id = p_post and is_deleted = false;
  if v_author is null then raise exception 'post not found'; end if;
  if v_author <> uid then raise exception 'not your post'; end if;

  update public.community_posts
  set content = btrim(p_content), edited_at = now()
  where id = p_post;

  perform public.notify_community_mentions(v_comm, uid, btrim(p_content), v_comm);
end; $$;
grant execute on function public.edit_community_post(uuid, text) to authenticated;

-- Author OR a community moderator may remove a post.
create or replace function public.delete_community_post(p_post uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_author uuid; v_comm uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select author_id, community_id into v_author, v_comm
  from public.community_posts where id = p_post;
  if v_author is null then raise exception 'post not found'; end if;
  if not (v_author = uid or public.community_can_moderate(v_comm)) then
    raise exception 'not allowed';
  end if;
  update public.community_posts set is_deleted = true where id = p_post;
end; $$;
grant execute on function public.delete_community_post(uuid) to authenticated;

create or replace function public.toggle_pin_community_post(p_post uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_comm uuid; v_pinned boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select community_id, (pinned_at is not null) into v_comm, v_pinned
  from public.community_posts where id = p_post and is_deleted = false;
  if v_comm is null then raise exception 'post not found'; end if;
  if not public.community_can_moderate(v_comm) then raise exception 'not allowed'; end if;

  if v_pinned then
    update public.community_posts set pinned_at = null, pinned_by = null where id = p_post;
    return false;
  else
    update public.community_posts set pinned_at = now(), pinned_by = uid where id = p_post;
    return true;
  end if;
end; $$;
grant execute on function public.toggle_pin_community_post(uuid) to authenticated;

create or replace function public.toggle_lock_community_post(p_post uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_comm uuid; v_locked boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select community_id, is_locked into v_comm, v_locked
  from public.community_posts where id = p_post and is_deleted = false;
  if v_comm is null then raise exception 'post not found'; end if;
  if not public.community_can_moderate(v_comm) then raise exception 'not allowed'; end if;

  update public.community_posts set is_locked = not coalesce(v_locked, false) where id = p_post;
  return not coalesce(v_locked, false);
end; $$;
grant execute on function public.toggle_lock_community_post(uuid) to authenticated;

create or replace function public.toggle_bookmark_community_post(p_post uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_comm uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select community_id into v_comm from public.community_posts where id = p_post and is_deleted = false;
  if v_comm is null or not public.can_access_community(v_comm) then raise exception 'not allowed'; end if;

  if exists (select 1 from public.community_post_bookmarks where post_id = p_post and profile_id = uid) then
    delete from public.community_post_bookmarks where post_id = p_post and profile_id = uid;
    return false;
  else
    insert into public.community_post_bookmarks (post_id, profile_id) values (p_post, uid)
    on conflict do nothing;
    return true;
  end if;
end; $$;
grant execute on function public.toggle_bookmark_community_post(uuid) to authenticated;

-- ============================================================
-- Comments — threaded create (+ lock + mentions + reply notice) / edit / delete / pin
-- ============================================================
drop function if exists public.add_community_comment(uuid, text);
create or replace function public.add_community_comment(
  p_post uuid, p_content text, p_parent uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  cid uuid; v_author uuid; v_locked boolean;
  cmt uuid; v_name text; v_parent_author uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty comment'; end if;

  select community_id, author_id, is_locked into cid, v_author, v_locked
  from public.community_posts where id = p_post and is_deleted = false;
  if cid is null or not public.can_access_community(cid) then raise exception 'not allowed'; end if;
  if coalesce(v_locked, false) and not public.community_can_moderate(cid) then
    raise exception 'this post is locked';
  end if;

  -- keep threads one level deep: a reply to a reply attaches to the top parent
  if p_parent is not null then
    select coalesce(parent_id, id) into p_parent
    from public.community_post_comments where id = p_parent and post_id = p_post;
  end if;

  insert into public.community_post_comments (post_id, author_id, content, parent_id)
  values (p_post, uid, btrim(p_content), p_parent)
  returning id into cmt;

  select full_name into v_name from public.profiles where id = uid;

  -- notify the post author (existing behaviour)
  if v_author is not null and v_author <> uid then
    perform public.notify_member(
      v_author, 'community', 'community_comment',
      coalesce(v_name, 'Someone') || ' commented on your post',
      left(btrim(p_content), 140), 'communities', cid
    );
  end if;

  -- notify the parent-comment author on a reply (if different from post author)
  if p_parent is not null then
    select author_id into v_parent_author from public.community_post_comments where id = p_parent;
    if v_parent_author is not null and v_parent_author <> uid and v_parent_author <> v_author then
      perform public.notify_member(
        v_parent_author, 'community', 'community_comment',
        coalesce(v_name, 'Someone') || ' replied to your comment',
        left(btrim(p_content), 140), 'communities', cid
      );
    end if;
  end if;

  perform public.notify_community_mentions(cid, uid, btrim(p_content), cid);
  return cmt;
end; $$;
grant execute on function public.add_community_comment(uuid, text, uuid) to authenticated;

create or replace function public.edit_community_comment(p_comment uuid, p_content text)
returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_author uuid; v_post uuid; v_comm uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty comment'; end if;

  select c.author_id, c.post_id into v_author, v_post
  from public.community_post_comments c where c.id = p_comment and c.is_deleted = false;
  if v_author is null then raise exception 'comment not found'; end if;
  if v_author <> uid then raise exception 'not your comment'; end if;

  update public.community_post_comments
  set content = btrim(p_content), edited_at = now()
  where id = p_comment;

  select community_id into v_comm from public.community_posts where id = v_post;
  perform public.notify_community_mentions(v_comm, uid, btrim(p_content), v_comm);
end; $$;
grant execute on function public.edit_community_comment(uuid, text) to authenticated;

-- Author OR a community moderator may remove a comment.
create or replace function public.delete_community_comment(p_comment uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_author uuid; v_post uuid; v_comm uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select c.author_id, c.post_id into v_author, v_post
  from public.community_post_comments c where c.id = p_comment;
  if v_author is null then raise exception 'comment not found'; end if;
  select community_id into v_comm from public.community_posts where id = v_post;
  if not (v_author = uid or public.community_can_moderate(v_comm)) then
    raise exception 'not allowed';
  end if;
  update public.community_post_comments set is_deleted = true where id = p_comment;
end; $$;
grant execute on function public.delete_community_comment(uuid) to authenticated;

create or replace function public.toggle_pin_community_comment(p_comment uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); v_post uuid; v_comm uuid; v_pinned boolean;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select post_id, (pinned_at is not null) into v_post, v_pinned
  from public.community_post_comments where id = p_comment and is_deleted = false;
  if v_post is null then raise exception 'comment not found'; end if;
  select community_id into v_comm from public.community_posts where id = v_post;
  if not public.community_can_moderate(v_comm) then raise exception 'not allowed'; end if;

  if v_pinned then
    update public.community_post_comments set pinned_at = null, pinned_by = null where id = p_comment;
    return false;
  else
    update public.community_post_comments set pinned_at = now(), pinned_by = uid where id = p_comment;
    return true;
  end if;
end; $$;
grant execute on function public.toggle_pin_community_comment(uuid) to authenticated;

-- ============================================================
-- Featured member spotlight (admin/mod)
-- ============================================================
create or replace function public.set_community_spotlight(p_community uuid, p_profile uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.community_can_moderate(p_community) then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.community_members where community_id = p_community and profile_id = p_profile) then
    raise exception 'that member is not in this community';
  end if;
  insert into public.community_spotlight (community_id, profile_id, note, set_by, set_at)
  values (p_community, p_profile, nullif(btrim(p_note), ''), auth.uid(), now())
  on conflict (community_id) do update
    set profile_id = excluded.profile_id, note = excluded.note, set_by = excluded.set_by, set_at = now();
end; $$;
grant execute on function public.set_community_spotlight(uuid, uuid, text) to authenticated;

create or replace function public.clear_community_spotlight(p_community uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.community_can_moderate(p_community) then raise exception 'not allowed'; end if;
  delete from public.community_spotlight where community_id = p_community;
end; $$;
grant execute on function public.clear_community_spotlight(uuid) to authenticated;

-- ============================================================
-- Community detail — add can_moderate, my_staff, spotlight
-- ============================================================
create or replace function public.get_community(p_community uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
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
    'can_delete', public.is_admin(),
    'can_moderate', public.community_can_moderate(c.id),
    'my_staff', public.community_staff_role(auth.uid()),
    'member_count', (select count(*) from public.community_members cm where cm.community_id = c.id),
    'post_count', (select count(*) from public.community_posts cp where cp.community_id = c.id and cp.is_deleted = false),
    'spotlight', (
      select jsonb_build_object(
        'profile_id', sp.profile_id,
        'full_name', spr.full_name,
        'avatar_url', spr.avatar_url,
        'role', spr.role,
        'note', sp.note
      )
      from public.community_spotlight sp
      join public.profiles spr on spr.id = sp.profile_id
      where sp.community_id = c.id
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'full_name', pr.full_name,
          'avatar_url', pr.avatar_url,
          'role', pr.role,
          'staff', public.community_staff_role(pr.id),
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
end; $$;
grant execute on function public.get_community(uuid) to authenticated;

-- ============================================================
-- Discussion feed — staff role, pins, lock, announcement, edited, bookmarks,
-- threaded comments, and Top / New / Saved views
-- ============================================================
drop function if exists public.get_community_feed(uuid);
create or replace function public.get_community_feed(
  p_community uuid, p_sort text default 'new', p_saved_only boolean default false
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if not public.can_access_community(p_community) then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(obj order by ord_ann desc, ord_pin desc, ord_key desc)
    from (
      select
        jsonb_build_object(
          'id', p.id,
          'content', p.content,
          'created_at', p.created_at,
          'edited_at', p.edited_at,
          'is_announcement', p.is_announcement,
          'is_locked', p.is_locked,
          'pinned', (p.pinned_at is not null),
          'bookmarked', exists (select 1 from public.community_post_bookmarks bk where bk.post_id = p.id and bk.profile_id = uid),
          'author', jsonb_build_object('id', ap.id, 'full_name', ap.full_name, 'avatar_url', ap.avatar_url, 'staff', public.community_staff_role(ap.id)),
          'like_count', (select count(*) from public.community_post_likes pl where pl.post_id = p.id),
          'liked', exists (select 1 from public.community_post_likes pl2 where pl2.post_id = p.id and pl2.profile_id = uid),
          'comments', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id', cc.id,
                'content', cc.content,
                'created_at', cc.created_at,
                'edited_at', cc.edited_at,
                'parent_id', cc.parent_id,
                'pinned', (cc.pinned_at is not null),
                'author', jsonb_build_object('id', cp.id, 'full_name', cp.full_name, 'avatar_url', cp.avatar_url, 'staff', public.community_staff_role(cp.id))
              ) order by cc.created_at asc)
            from public.community_post_comments cc
            join public.profiles cp on cp.id = cc.author_id
            where cc.post_id = p.id and cc.is_deleted = false
          ), '[]'::jsonb)
        ) as obj,
        p.is_announcement::int                       as ord_ann,
        (p.pinned_at is not null)::int               as ord_pin,
        case when p_sort = 'top'
             then (select count(*) from public.community_post_likes pl3 where pl3.post_id = p.id)::numeric
             else extract(epoch from p.created_at) end as ord_key
      from public.community_posts p
      join public.profiles ap on ap.id = p.author_id
      where p.community_id = p_community and p.is_deleted = false
        and (not p_saved_only
             or exists (select 1 from public.community_post_bookmarks bk2 where bk2.post_id = p.id and bk2.profile_id = uid))
    ) s
  ), '[]'::jsonb);
end; $$;
grant execute on function public.get_community_feed(uuid, text, boolean) to authenticated;
