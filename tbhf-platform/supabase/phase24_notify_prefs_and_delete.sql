-- Phase 24 — Notification-preference enforcement + account deletion
--
-- Part A: a reusable notify_member() gate that respects each member's
--   notification_prefs (phase23_settings.sql) before writing a notification,
--   plus rewrites of the two existing notification sources to go through it.
-- Part B: delete_my_account(), a SECURITY DEFINER RPC that lets a member
--   permanently delete their own account and all associated data.
--
-- Safe to run multiple times. Depends on phase13_moderation.sql (member
-- notifications + content review) and phase23_settings.sql (notification_prefs).

-- Make sure the prefs column exists even if phase23 hasn't been run yet.
alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

-- ============================================================
-- Part A — notification preference enforcement
-- ============================================================

-- Central gate for creating a member notification. A category is opt-out:
-- the notification is written unless the recipient has explicitly set that
-- category to false in their notification_prefs. Missing key => send.
create or replace function public.notify_member(
  p_user_id     uuid,
  p_category    text,
  p_type        text,
  p_title       text,
  p_body        text default null,
  p_entity_type text default null,
  p_entity_id   uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    return;
  end if;

  if coalesce(
       (select notification_prefs ->> p_category
          from public.profiles
         where id = p_user_id),
       'true'
     ) = 'false' then
    return; -- the member has muted this category
  end if;

  insert into public.member_notifications (user_id, type, title, body, entity_type, entity_id)
  values (p_user_id, p_type, p_title, p_body, p_entity_type, p_entity_id);
end; $$;

-- ---------- content_submit(): route the "pending review" notice through the gate ----------
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

  perform public.notify_member(
    v_author, 'content_review', 'review_pending', 'Submitted for review',
    'Your ' || v_kind || ' "' || v_title || '" is awaiting admin approval. You''ll be notified once it''s reviewed.',
    tg_table_name, new.id
  );
  return new;
end; $$;

-- ---------- admin_review_content(): route the approve/reject notice through the gate ----------
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

  perform public.notify_member(
    v_author,
    'content_review',
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

-- ============================================================
-- Part B — self-service account deletion
-- ============================================================

-- Permanently delete the calling member's account. Deleting the profiles row
-- cascades to every child table that references public.profiles(id) on delete
-- cascade (posts, messages, memberships, notifications, …). Deleting the
-- auth.users row removes the login itself and cascades any rows that reference
-- auth.users(id) on delete cascade (e.g. survey responses).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.profiles where id = v_uid;
  delete from auth.users   where id = v_uid;
end; $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
