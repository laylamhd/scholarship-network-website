-- Phase 25 — Notifications for every preference category
--
-- Makes every toggle on the Settings → Notifications page actually do
-- something by emitting member_notifications for each category, always
-- through public.notify_member() (phase24) so the recipient's preference
-- is honoured automatically.
--
--   messages       -> new direct message            (send_message RPC)
--   community       -> like/comment on your post     (community RPCs)
--   follows         -> someone follows you           (trigger on follows)
--   mentorship      -> request + accept/decline      (mentorship RPCs)
--   content_review  -> already wired in phase24
--   events          -> an event you RSVP'd to changes (trigger on events)
--   announcements   -> a new admin announcement      (trigger on admin_announcements)
--
-- Depends on: phase24_notify_prefs_and_delete.sql (notify_member),
-- phase2b_messaging, phase2_follows, phase5_mentorship, phase15_communities,
-- phase8_events, phase12_admin. Safe to run multiple times.

-- ============================================================
-- messages — notify the other participant(s) on a new message
-- ============================================================
-- De-duplicated: a recipient gets at most one unread "new_message" notice per
-- conversation, so an active back-and-forth doesn't flood them.
create or replace function public.send_message(conv uuid, body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); mid uuid; v_sender text; v_snippet text; r record;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_member(conv) then raise exception 'not a participant'; end if;
  if coalesce(btrim(body), '') = '' then raise exception 'empty message'; end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (conv, uid, btrim(body)) returning id into mid;

  update public.conversations set last_message_at = now() where id = conv;

  select full_name into v_sender from public.profiles where id = uid;
  v_snippet := left(btrim(body), 140);

  for r in
    select profile_id from public.conversation_participants
    where conversation_id = conv and profile_id <> uid
  loop
    if not exists (
      select 1 from public.member_notifications
      where user_id = r.profile_id and type = 'new_message'
        and entity_id = conv and is_read = false
    ) then
      perform public.notify_member(
        r.profile_id, 'messages', 'new_message',
        coalesce(v_sender, 'Someone') || ' sent you a message',
        v_snippet, 'conversations', conv
      );
    end if;
  end loop;

  return mid;
end; $$;
grant execute on function public.send_message(uuid, text) to authenticated;

-- ============================================================
-- follows — notify the followed member
-- ============================================================
create or replace function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if coalesce(new.status, 'active') <> 'active' then return new; end if;
  if new.follower_id = new.following_id then return new; end if;

  select full_name into v_name from public.profiles where id = new.follower_id;
  perform public.notify_member(
    new.following_id, 'follows', 'new_follower',
    coalesce(v_name, 'Someone') || ' started following you',
    null, 'profiles', new.follower_id
  );
  return new;
end; $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify after insert on public.follows
for each row execute function public.notify_on_follow();

-- ============================================================
-- community — notify the post author on comment / like
-- ============================================================
create or replace function public.add_community_comment(p_post uuid, p_content text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); cid uuid; cmt uuid; v_author uuid; v_name text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'empty comment'; end if;

  select community_id, author_id into cid, v_author
  from public.community_posts where id = p_post and is_deleted = false;
  if cid is null or not public.can_access_community(cid) then raise exception 'not allowed'; end if;

  insert into public.community_post_comments (post_id, author_id, content)
  values (p_post, uid, btrim(p_content)) returning id into cmt;

  if v_author is not null and v_author <> uid then
    select full_name into v_name from public.profiles where id = uid;
    perform public.notify_member(
      v_author, 'community', 'community_comment',
      coalesce(v_name, 'Someone') || ' commented on your post',
      left(btrim(p_content), 140), 'community_posts', p_post
    );
  end if;
  return cmt;
end; $$;
grant execute on function public.add_community_comment(uuid, text) to authenticated;

create or replace function public.toggle_community_like(p_post uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); cid uuid; liked boolean; v_author uuid; v_name text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  select community_id, author_id into cid, v_author
  from public.community_posts where id = p_post and is_deleted = false;
  if cid is null or not public.can_access_community(cid) then raise exception 'not allowed'; end if;

  if exists (select 1 from public.community_post_likes where post_id = p_post and profile_id = uid) then
    delete from public.community_post_likes where post_id = p_post and profile_id = uid;
    liked := false;
  else
    insert into public.community_post_likes (post_id, profile_id) values (p_post, uid);
    liked := true;
    if v_author is not null and v_author <> uid then
      select full_name into v_name from public.profiles where id = uid;
      perform public.notify_member(
        v_author, 'community', 'community_like',
        coalesce(v_name, 'Someone') || ' liked your post',
        null, 'community_posts', p_post
      );
    end if;
  end if;
  return liked;
end; $$;
grant execute on function public.toggle_community_like(uuid) to authenticated;

-- ============================================================
-- mentorship — notify the mentor on request, the mentee on response
-- ============================================================
create or replace function public.request_mentorship(p_mentor_id uuid, p_message text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); mid uuid; v_name text;
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

  select full_name into v_name from public.profiles where id = uid;
  perform public.notify_member(
    p_mentor_id, 'mentorship', 'mentorship_request',
    coalesce(v_name, 'A scholar') || ' requested mentorship',
    nullif(btrim(p_message), ''), 'mentorships', mid
  );
  return mid;
end; $$;
grant execute on function public.request_mentorship(uuid, text) to authenticated;

create or replace function public.respond_mentorship(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); v_mentee uuid; v_name text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.mentorships
  set status = case when p_accept then 'active' else 'declined' end,
      responded_at = now(),
      updated_at = now()
  where id = p_id and mentor_id = uid and status = 'pending'
  returning mentee_id into v_mentee;

  if not found then raise exception 'request not found or not yours to answer'; end if;

  select full_name into v_name from public.profiles where id = uid;
  perform public.notify_member(
    v_mentee, 'mentorship',
    case when p_accept then 'mentorship_accepted' else 'mentorship_declined' end,
    case when p_accept then 'Mentorship request accepted' else 'Mentorship request declined' end,
    coalesce(v_name, 'Your mentor')
      || case when p_accept then ' accepted your mentorship request.'
                            else ' declined your mentorship request.' end,
    'mentorships', p_id
  );
end; $$;
grant execute on function public.respond_mentorship(uuid, boolean) to authenticated;

-- ============================================================
-- events — notify RSVP'd members when an event they're attending changes
-- ============================================================
create or replace function public.notify_on_event_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record; v_title text; v_msg text; v_type text; v_head text;
begin
  v_title := coalesce(new.title, 'An event');

  if new.recording_url is distinct from old.recording_url and new.recording_url is not null then
    v_type := 'event_recording'; v_head := 'Recording available';
    v_msg := 'The recording for "' || v_title || '" is now available.';
  elsif new.status is distinct from old.status then
    v_type := 'event_update'; v_head := 'Event updated';
    v_msg := 'The status of "' || v_title || '" changed to ' || coalesce(new.status, 'updated') || '.';
  elsif new.start_at is distinct from old.start_at then
    v_type := 'event_update'; v_head := 'Event time changed';
    v_msg := 'The scheduled time for "' || v_title || '" has changed.';
  elsif (new.location is distinct from old.location)
     or (new.online_link is distinct from old.online_link)
     or (new.registration_link is distinct from old.registration_link)
     or (new.mode is distinct from old.mode) then
    v_type := 'event_update'; v_head := 'Event updated';
    v_msg := 'Details for "' || v_title || '" have been updated.';
  else
    return new; -- nothing a registrant would care about changed
  end if;

  for r in select profile_id from public.event_rsvps where event_id = new.id loop
    perform public.notify_member(
      r.profile_id, 'events', v_type, v_head, v_msg, 'events', new.id
    );
  end loop;
  return new;
end; $$;

drop trigger if exists events_notify_update on public.events;
create trigger events_notify_update after update on public.events
for each row execute function public.notify_on_event_update();

-- ============================================================
-- announcements — fan out a new admin announcement to its audience
-- ============================================================
create or replace function public.notify_on_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare r record;
begin
  if new.is_active is not true then return new; end if;

  for r in
    select p.id
    from public.profiles p
    where p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      and coalesce(p.is_active, true) = true
      and (
        new.audience = 'all'
        or (new.audience = 'scholars' and p.role = 'scholar')
        or (new.audience = 'alumni'   and p.role = 'alumni')
      )
  loop
    perform public.notify_member(
      r.id, 'announcements', 'announcement',
      new.title, left(new.body, 200), 'admin_announcements', new.id
    );
  end loop;
  return new;
end; $$;

drop trigger if exists announcements_notify on public.admin_announcements;
create trigger announcements_notify after insert on public.admin_announcements
for each row execute function public.notify_on_announcement();
