-- ============================================================
-- phase27_moderator_enforcement.sql  —  Make moderator grants actually DO something.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Until now moderators (phase19/phase21) were stored with capabilities but
-- nothing checked them — every privileged path still required is_admin().
-- This migration swaps those gates to public.mod_can('<capability>'), which
-- already returns true for admins (is_admin() OR holds the capability), so
-- admin behaviour is unchanged and moderators gain exactly their granted areas.
--
-- The four capabilities (must match lib/moderators.ts + admin_set_moderator):
--   moderate_content         — approve/reject member submissions; see pending content
--   manage_announcements     — create/manage member-facing announcements
--   manage_events_resources  — create/manage events, webinars and the library
--   manage_communities       — create/manage communities and their members
--
-- Requires: public.mod_can(text) and public.moderators (phase21_moderators_fix.sql).
-- ============================================================

-- ------------------------------------------------------------
-- 0. What can the CURRENT user do?  Admin → all four; moderator → their set.
--    Used by the app to decide which controls/tabs to show.
-- ------------------------------------------------------------
create or replace function public.my_capabilities()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.is_admin() then
      array['moderate_content','manage_announcements','manage_events_resources','manage_communities']
    else
      coalesce((select capabilities from public.moderators where profile_id = auth.uid()), '{}')
  end;
$$;
grant execute on function public.my_capabilities() to authenticated;


-- ============================================================
-- 1. moderate_content  —  review pipeline + visibility of pending content
-- ============================================================

-- Auto-approve on submit: admins always; a moderator who can manage events gets
-- their OWN events published immediately (events are the only moderated table
-- that maps to a moderator capability). Everything else from a moderator still
-- rides the normal pending queue, exactly like any other member.
create or replace function public.content_submit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_kind   text;
  v_title  text;
begin
  if public.is_admin()
     or (tg_table_name = 'events' and public.mod_can('manage_events_resources')) then
    new.review_status := 'approved';
    new.reviewed_at := now();
    new.reviewed_by := auth.uid();
    return new;
  end if;

  new.review_status := 'pending';

  v_author := (to_jsonb(new) ->> (case tg_table_name
      when 'alumni_offers'      then 'alumni_id'
      when 'community_projects' then 'organizer_id'
      when 'showcase_items'     then 'uploaded_by'
      when 'events'             then 'created_by'
      else 'author_id' end))::uuid;
  v_kind := case tg_table_name
      when 'stories'            then 'story'
      when 'research_posts'     then 'research post'
      when 'alumni_offers'      then 'offer'
      when 'community_projects' then 'project'
      when 'showcase_items'     then 'showcase item'
      when 'events'             then 'event'
      else 'post' end;
  v_title := coalesce(to_jsonb(new) ->> 'title', '');

  insert into public.member_notifications (user_id, type, title, body, entity_type, entity_id)
  values (
    v_author, 'review_pending', 'Submitted for review',
    'Your ' || v_kind || ' "' || v_title || '" is awaiting admin approval. You''ll be notified once it''s reviewed.',
    tg_table_name, new.id
  );
  return new;
end; $$;

-- approve / reject  (gate → moderate_content)
create or replace function public.admin_review_content(p_entity text, p_id uuid, p_decision text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_title  text;
  v_kind   text;
  v_authcol text;
  v_reason text;
begin
  if not public.mod_can('moderate_content') then raise exception 'Not authorized'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
  if p_entity not in ('stories','research_posts','alumni_offers','community_projects','showcase_items','events') then
    raise exception 'Unknown content type';
  end if;

  v_reason := nullif(btrim(coalesce(p_reason, '')), '');

  v_authcol := case p_entity
      when 'alumni_offers'      then 'alumni_id'
      when 'community_projects' then 'organizer_id'
      when 'showcase_items'     then 'uploaded_by'
      when 'events'             then 'created_by'
      else 'author_id' end;

  execute format(
    'update public.%I set review_status = $1, reviewed_at = now(), reviewed_by = $2, review_note = $4
       where id = $3
       returning (to_jsonb(%I.*) ->> %L)::uuid, coalesce(to_jsonb(%I.*) ->> ''title'', '''')',
    p_entity, p_entity, v_authcol, p_entity)
  into v_author, v_title
  using p_decision, auth.uid(), p_id, v_reason;

  if v_author is null then return; end if;

  v_kind := case p_entity
      when 'stories'            then 'story'
      when 'research_posts'     then 'research post'
      when 'alumni_offers'      then 'offer'
      when 'community_projects' then 'project'
      when 'showcase_items'     then 'showcase item'
      when 'events'             then 'event'
      else 'post' end;

  insert into public.member_notifications (user_id, type, title, body, entity_type, entity_id)
  values (
    v_author,
    'review_' || p_decision,
    case when p_decision = 'approved' then 'Approved & published' else 'Not approved' end,
    case when p_decision = 'approved'
         then 'Your ' || v_kind || ' "' || v_title || '" has been approved and is now visible to the network.'
         else 'Your ' || v_kind || ' "' || v_title || '" was not approved.'
              || case when v_reason is not null then ' Reason: ' || v_reason else '' end
         end,
    p_entity, p_id
  );
end; $$;
grant execute on function public.admin_review_content(text, uuid, text, text) to authenticated;

-- pending counts  (gate → moderate_content)
create or replace function public.admin_pending_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.mod_can('moderate_content') then raise exception 'Not authorized'; end if;
  return jsonb_build_object(
    'stories',            (select count(*) from public.stories            where review_status = 'pending'),
    'research_posts',     (select count(*) from public.research_posts     where review_status = 'pending'),
    'alumni_offers',      (select count(*) from public.alumni_offers      where review_status = 'pending'),
    'community_projects', (select count(*) from public.community_projects where review_status = 'pending'),
    'showcase_items',     (select count(*) from public.showcase_items     where review_status = 'pending'),
    'events',             (select count(*) from public.events             where review_status = 'pending'),
    'total', (
      (select count(*) from public.stories            where review_status = 'pending') +
      (select count(*) from public.research_posts     where review_status = 'pending') +
      (select count(*) from public.alumni_offers      where review_status = 'pending') +
      (select count(*) from public.community_projects where review_status = 'pending') +
      (select count(*) from public.showcase_items     where review_status = 'pending') +
      (select count(*) from public.events             where review_status = 'pending')
    )
  );
end; $$;
grant execute on function public.admin_pending_counts() to authenticated;

-- pending items for one type  (gate → moderate_content)
create or replace function public.admin_pending_items(p_entity text)
returns table (id uuid, title text, author_name text, created_at timestamptz, summary text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_authcol text;
begin
  if not public.mod_can('moderate_content') then raise exception 'Not authorized'; end if;
  if p_entity not in ('stories','research_posts','alumni_offers','community_projects','showcase_items','events') then
    raise exception 'Unknown content type';
  end if;

  v_authcol := case p_entity
      when 'alumni_offers'      then 'alumni_id'
      when 'community_projects' then 'organizer_id'
      when 'showcase_items'     then 'uploaded_by'
      when 'events'             then 'created_by'
      else 'author_id' end;

  return query execute format($q$
    select x.id,
      coalesce(to_jsonb(x) ->> 'title', '(untitled)') as title,
      pr.full_name as author_name,
      x.created_at,
      left(coalesce(
        to_jsonb(x) ->> 'summary', to_jsonb(x) ->> 'description',
        to_jsonb(x) ->> 'details', to_jsonb(x) ->> 'excerpt',
        to_jsonb(x) ->> 'body', ''), 240) as summary
    from public.%I x
    join public.profiles pr on pr.id = (to_jsonb(x) ->> %L)::uuid
    where x.review_status = 'pending'
    order by x.created_at desc
  $q$, p_entity, v_authcol);
end; $$;
grant execute on function public.admin_pending_items(text) to authenticated;

-- Visibility: a content moderator must be able to SEE pending items to review them.
drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using ((status = 'published' and review_status = 'approved') or author_id = auth.uid() or public.mod_can('moderate_content'));

drop policy if exists research_posts_select on public.research_posts;
create policy research_posts_select on public.research_posts
  for select to authenticated
  using (review_status = 'approved' or author_id = auth.uid() or public.mod_can('moderate_content'));

drop policy if exists alumni_offers_select on public.alumni_offers;
create policy alumni_offers_select on public.alumni_offers
  for select to authenticated
  using (review_status = 'approved' or alumni_id = auth.uid() or public.mod_can('moderate_content'));

drop policy if exists community_projects_select on public.community_projects;
create policy community_projects_select on public.community_projects
  for select to authenticated
  using (review_status = 'approved' or organizer_id = auth.uid() or public.mod_can('moderate_content'));

drop policy if exists showcase_items_select on public.showcase_items;
create policy showcase_items_select on public.showcase_items
  for select to authenticated
  using (review_status = 'approved' or uploaded_by = auth.uid() or public.mod_can('moderate_content'));

drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (review_status = 'approved' or created_by = auth.uid() or public.mod_can('moderate_content'));


-- ============================================================
-- 2. manage_announcements
-- ============================================================
drop policy if exists admin_announcements_admin_all on public.admin_announcements;
create policy admin_announcements_admin_all on public.admin_announcements
  for all to authenticated
  using (public.mod_can('manage_announcements'))
  with check (public.mod_can('manage_announcements'));


-- ============================================================
-- 3. manage_events_resources  —  events, posters, library, categories
-- ============================================================

-- Events: members may already submit (rides review); a manager can update/delete
-- any event, and (via content_submit above) publish their own immediately.
drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (public.mod_can('manage_events_resources') or created_by = auth.uid())
  with check (public.mod_can('manage_events_resources') or created_by = auth.uid());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.mod_can('manage_events_resources') or created_by = auth.uid());

-- Event poster storage (member insert already open from phase17).
drop policy if exists event_posters_admin_update on storage.objects;
create policy event_posters_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'event-posters' and public.mod_can('manage_events_resources'));

drop policy if exists event_posters_admin_delete on storage.objects;
create policy event_posters_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'event-posters' and public.mod_can('manage_events_resources'));

-- Library resources.
drop policy if exists resource_categories_admin_write on public.resource_categories;
create policy resource_categories_admin_write on public.resource_categories
  for all to authenticated
  using (public.mod_can('manage_events_resources'))
  with check (public.mod_can('manage_events_resources'));

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources
  for select to authenticated
  using (is_published = true or uploaded_by = auth.uid() or public.mod_can('manage_events_resources'));

drop policy if exists resources_insert on public.resources;
create policy resources_insert on public.resources
  for insert to authenticated
  with check (public.mod_can('manage_events_resources') and uploaded_by = auth.uid());

drop policy if exists resources_update on public.resources;
create policy resources_update on public.resources
  for update to authenticated
  using (public.mod_can('manage_events_resources') or uploaded_by = auth.uid())
  with check (public.mod_can('manage_events_resources') or uploaded_by = auth.uid());

drop policy if exists resources_delete on public.resources;
create policy resources_delete on public.resources
  for delete to authenticated
  using (public.mod_can('manage_events_resources') or uploaded_by = auth.uid());

-- Resources storage bucket.
drop policy if exists resources_admin_insert on storage.objects;
create policy resources_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'resources' and public.mod_can('manage_events_resources'));

drop policy if exists resources_admin_update on storage.objects;
create policy resources_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'resources' and public.mod_can('manage_events_resources'));

drop policy if exists resources_admin_delete on storage.objects;
create policy resources_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'resources' and public.mod_can('manage_events_resources'));


-- ============================================================
-- 4. manage_communities  —  create/manage communities + membership
-- ============================================================
create or replace function public.can_access_community(p_community uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.mod_can('manage_communities') or public.is_community_member(p_community);
$$;
grant execute on function public.can_access_community(uuid) to authenticated;

create or replace function public.admin_create_community(p_name text, p_description text, p_accent text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare cid uuid;
begin
  if not public.mod_can('manage_communities') then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'A name is required'; end if;

  insert into public.communities (name, description, accent, created_by)
  values (btrim(p_name), nullif(btrim(p_description), ''), nullif(btrim(p_accent), ''), auth.uid())
  returning id into cid;

  return cid;
end;
$$;
grant execute on function public.admin_create_community(text, text, text) to authenticated;

create or replace function public.admin_add_community_member(p_community uuid, p_profile uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mod_can('manage_communities') then raise exception 'Not authorized'; end if;
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
  if not public.mod_can('manage_communities') then raise exception 'Not authorized'; end if;
  delete from public.community_members where community_id = p_community and profile_id = p_profile;
end;
$$;
grant execute on function public.admin_remove_community_member(uuid, uuid) to authenticated;

create or replace function public.admin_delete_community(p_community uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.mod_can('manage_communities') then raise exception 'Not authorized'; end if;
  delete from public.communities where id = p_community;
end;
$$;
grant execute on function public.admin_delete_community(uuid) to authenticated;

-- list_communities: a community manager sees every community (members still see only theirs).
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
  where (public.mod_can('manage_communities') or public.is_community_member(c.id))
    and (coalesce(p_search, '') = '' or c.name ilike '%' || p_search || '%' or c.description ilike '%' || p_search || '%')
  order by c.created_at desc;
$$;
grant execute on function public.list_communities(text) to authenticated;

-- get_community: expose the manage flag to community managers (drives the admin UI in the detail view).
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

-- Addable-profiles picker (community manager may add members).
create or replace function public.admin_addable_profiles(p_community uuid, p_search text default null)
returns table (id uuid, full_name text, email text, role text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email, p.role::text, p.avatar_url
  from public.profiles p
  where public.mod_can('manage_communities')
    and not exists (
      select 1 from public.community_members cm
      where cm.community_id = p_community and cm.profile_id = p.id
    )
    and (coalesce(p_search, '') = '' or p.full_name ilike '%' || p_search || '%' or p.email ilike '%' || p_search || '%')
  order by p.full_name asc
  limit 50;
$$;
grant execute on function public.admin_addable_profiles(uuid, text) to authenticated;
