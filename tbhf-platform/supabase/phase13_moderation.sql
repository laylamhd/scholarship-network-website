-- ============================================================
-- phase13_moderation.sql  —  Content review + notification centre.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Member-published content (stories, research posts, alumni offers, community
-- projects — and admin-published showcase items / events) now carries a
-- review_status. Anything created by a non-admin starts 'pending' and is
-- hidden from everyone except its author and admins until an admin approves
-- it. Admin-created content is auto-approved. Authors are notified when their
-- content is submitted for review and again when it is approved / rejected.
--
-- Requires is_admin() (phase3) and the phase12 admin functions.
-- ============================================================

-- ---------- Notifications ----------
-- NOTE: named member_notifications (not "notifications") because the existing
-- database already has a notifications table with a different shape, which
-- would make "create table if not exists" a silent no-op.
create table if not exists public.member_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,                 -- review_pending | review_approved | review_rejected | ...
  title       text not null,
  body        text,
  entity_type text,                          -- table name, e.g. 'stories'
  entity_id   uuid,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists member_notifications_user_idx on public.member_notifications (user_id, is_read, created_at desc);

alter table public.member_notifications enable row level security;

-- Users see and manage only their own notifications. Inserts are done by
-- SECURITY DEFINER triggers / functions (which bypass RLS), so there is no
-- insert policy for ordinary clients.
drop policy if exists member_notifications_select on public.member_notifications;
create policy member_notifications_select on public.member_notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists member_notifications_update on public.member_notifications;
create policy member_notifications_update on public.member_notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists member_notifications_delete on public.member_notifications;
create policy member_notifications_delete on public.member_notifications
  for delete to authenticated using (user_id = auth.uid());

-- ---------- Add review_status to each content table ----------
-- Adds the columns, backfills EXISTING rows as 'approved' (they pre-date
-- moderation and were already live), then sets the 'pending' default for
-- future rows and a check constraint. Re-running is safe.
do $mod$
declare
  t text;
  tables text[] := array['stories','research_posts','alumni_offers','community_projects','showcase_items','events'];
begin
  foreach t in array tables loop
    execute format('alter table public.%I add column if not exists review_status text', t);
    execute format('alter table public.%I add column if not exists reviewed_at timestamptz', t);
    execute format('alter table public.%I add column if not exists reviewed_by uuid references public.profiles(id) on delete set null', t);
    execute format('alter table public.%I add column if not exists review_note text', t);
    -- existing rows -> approved (only fills nulls, so never clobbers pending)
    execute format('update public.%I set review_status = ''approved'' where review_status is null', t);
    execute format('alter table public.%I alter column review_status set default ''pending''', t);
    execute format('alter table public.%I alter column review_status set not null', t);
    if not exists (select 1 from pg_constraint where conname = t || '_review_status_chk') then
      execute format('alter table public.%I add constraint %I check (review_status in (''pending'',''approved'',''rejected''))', t, t || '_review_status_chk');
    end if;
    execute format('create index if not exists %I on public.%I (review_status)', t || '_review_status_idx', t);
  end loop;
end;
$mod$;

-- ---------- BEFORE INSERT: set status + notify author ----------
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
  -- Admin-created content is approved immediately.
  if public.is_admin() then
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

do $trg$
declare
  t text;
  tables text[] := array['stories','research_posts','alumni_offers','community_projects','showcase_items','events'];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists %I on public.%I', t || '_content_submit', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.content_submit()', t || '_content_submit', t);
  end loop;
end;
$trg$;

-- ---------- Admin: approve / reject a piece of content (with optional reason) ----------
drop function if exists public.admin_review_content(text, uuid, text);
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
  if not public.is_admin() then raise exception 'Not authorized'; end if;
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

-- ---------- Admin: pending counts (overview card + engagement badges) ----------
create or replace function public.admin_pending_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
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

-- ---------- Admin: list pending items for one content type ----------
create or replace function public.admin_pending_items(p_entity text)
returns table (id uuid, title text, author_name text, created_at timestamptz, summary text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_authcol text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
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

-- ---------- Visibility: hide pending content from everyone but author/admin ----------
drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using ((status = 'published' and review_status = 'approved') or author_id = auth.uid() or public.is_admin());

drop policy if exists research_posts_select on public.research_posts;
create policy research_posts_select on public.research_posts
  for select to authenticated
  using (review_status = 'approved' or author_id = auth.uid() or public.is_admin());

drop policy if exists alumni_offers_select on public.alumni_offers;
create policy alumni_offers_select on public.alumni_offers
  for select to authenticated
  using (review_status = 'approved' or alumni_id = auth.uid() or public.is_admin());

drop policy if exists community_projects_select on public.community_projects;
create policy community_projects_select on public.community_projects
  for select to authenticated
  using (review_status = 'approved' or organizer_id = auth.uid() or public.is_admin());

drop policy if exists showcase_items_select on public.showcase_items;
create policy showcase_items_select on public.showcase_items
  for select to authenticated
  using (review_status = 'approved' or uploaded_by = auth.uid() or public.is_admin());

drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated
  using (review_status = 'approved' or created_by = auth.uid() or public.is_admin());
