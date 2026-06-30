-- ============================================================
-- phase28_community_group_moderation.sql
--   Refine what a community/group moderator (manage_communities) can do, vs admin.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run). Run AFTER phase27.
--
-- Rules (user-specified):
--   COMMUNITIES
--     • Moderators MANAGE content: they can delete posts in a community.
--     • Moderators DO NOT delete the community itself — only an admin deletes it.
--   GROUPS
--     • Moderators MANAGE content: they can delete posts in a group.
--     • Both admin AND moderators can delete the group.
--     • Admins (and managing moderators) can read any group's feed without joining.
--
-- "manage_communities" is the capability for both communities and groups.
-- public.mod_can('manage_communities') already returns true for admins.
-- ============================================================


-- ============================================================
-- 1. COMMUNITIES
-- ============================================================

-- 1a. Deleting a community is ADMIN-ONLY again (phase27 had widened this to
--     mod_can; moderators must NOT be able to delete a community).
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

-- 1b. get_community: keep is_admin = manage_communities (drives member + content
--     management), but expose a SEPARATE can_delete = is_admin() so only a true
--     admin sees the "Delete community" control.
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
    'is_admin', public.mod_can('manage_communities'),
    'can_delete', public.is_admin(),
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

-- 1c. Moderators (and admins) can delete a post in a community (soft delete).
create or replace function public.delete_community_post(p_post uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mod_can('manage_communities') then raise exception 'Not authorized'; end if;
  update public.community_posts set is_deleted = true where id = p_post;
end;
$$;
grant execute on function public.delete_community_post(uuid) to authenticated;


-- ============================================================
-- 2. GROUPS
-- ============================================================

-- 2a. Read a group's feed: members as before, PLUS a managing moderator/admin
--     can read any group without joining.
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
  if not (public.is_group_member(p_group) or public.mod_can('manage_communities')) then
    return '[]'::jsonb;
  end if;

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

-- 2b. Delete a group: the creator, an admin, or a managing moderator.
create or replace function public.delete_group(p_group uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.mod_can('manage_communities')
          or exists (select 1 from public.groups g where g.id = p_group and g.created_by = auth.uid())) then
    raise exception 'Not authorized';
  end if;
  delete from public.groups where id = p_group;
end;
$$;
grant execute on function public.delete_group(uuid) to authenticated;

-- Keep the table policy aligned (the RPC above is security definer, but this lets
-- the creator / a manager delete directly too).
drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete to authenticated
  using (created_by = auth.uid() or public.mod_can('manage_communities'));

-- 2c. Moderators (and admins) can delete a post in a group (soft delete).
create or replace function public.delete_group_post(p_post uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mod_can('manage_communities') then raise exception 'Not authorized'; end if;
  update public.posts set is_deleted = true where id = p_post and group_id is not null;
end;
$$;
grant execute on function public.delete_group_post(uuid) to authenticated;
