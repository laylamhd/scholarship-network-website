-- ============================================================
-- phase31_message_deletions.sql  —  Delete messages in a DM.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Two WhatsApp-style options:
--   • "Delete for me"        — hides the message from just my view
--                              (per-user row in message_deletions).
--   • "Delete for everyone"  — sender only; flags the message so it
--                              renders as "This message was deleted"
--                              for both participants.
-- Writes go through SECURITY DEFINER RPCs; reads stay gated by RLS.
-- ============================================================

-- "Delete for everyone" flag on the message itself.
alter table public.messages
  add column if not exists deleted_for_all boolean not null default false;

-- "Delete for me" — one row per (message, user) that hid it.
create table if not exists public.message_deletions (
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);
create index if not exists message_deletions_profile_idx
  on public.message_deletions (profile_id);

alter table public.message_deletions enable row level security;
drop policy if exists message_deletions_select on public.message_deletions;
create policy message_deletions_select on public.message_deletions
  for select to authenticated using (profile_id = auth.uid());

-- ---------- delete for me (hide from my view only) ----------
create or replace function public.delete_message_for_me(msg uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  -- must belong to a conversation I'm a member of
  if not exists (
    select 1 from public.messages m
    where m.id = msg and public.is_conversation_member(m.conversation_id)
  ) then
    raise exception 'not allowed';
  end if;

  insert into public.message_deletions (message_id, profile_id)
  values (msg, uid)
  on conflict do nothing;
end;
$$;
grant execute on function public.delete_message_for_me(uuid) to authenticated;

-- ---------- delete for everyone (sender only) ----------
create or replace function public.delete_message_for_everyone(msg uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); v_conv uuid; v_snippet text;
begin
  if uid is null then raise exception 'not authenticated'; end if;

  update public.messages
  set deleted_for_all = true
  where id = msg and sender_id = uid
  returning conversation_id, left(btrim(body), 140) into v_conv, v_snippet;

  if not found then
    raise exception 'not allowed';
  end if;

  -- Scrub the deleted text from any new-message notifications that carried it,
  -- so the recipient's notification centre no longer shows the deleted message.
  update public.member_notifications
  set body = 'This message was deleted'
  where type = 'new_message'
    and entity_id = v_conv
    and body = v_snippet;
end;
$$;
grant execute on function public.delete_message_for_everyone(uuid) to authenticated;

-- ---------- inbox listing: reflect deletions in the preview ----------
create or replace function public.list_my_conversations()
returns table (
  conversation_id uuid,
  other_id        uuid,
  other_name      text,
  other_avatar    text,
  other_role      user_role,
  last_body       text,
  last_at         timestamptz,
  unread_count    bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with my as (
    select conversation_id from public.conversation_participants where profile_id = auth.uid()
  ),
  other as (
    select cp.conversation_id, p.id, p.full_name, p.avatar_url, p.role
    from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    where cp.conversation_id in (select conversation_id from my)
      and cp.profile_id <> auth.uid()
  ),
  last_msg as (
    select distinct on (m.conversation_id)
      m.conversation_id,
      case when m.deleted_for_all then 'This message was deleted' else m.body end as body,
      m.created_at
    from public.messages m
    where m.conversation_id in (select conversation_id from my)
      and not exists (
        select 1 from public.message_deletions d
        where d.message_id = m.id and d.profile_id = auth.uid()
      )
    order by m.conversation_id, m.created_at desc
  ),
  unread as (
    select m.conversation_id, count(*) as cnt
    from public.messages m
    where m.conversation_id in (select conversation_id from my)
      and m.sender_id <> auth.uid()
      and m.read_at is null
      and not m.deleted_for_all
      and not exists (
        select 1 from public.message_deletions d
        where d.message_id = m.id and d.profile_id = auth.uid()
      )
    group by m.conversation_id
  )
  select o.conversation_id, o.id, o.full_name, o.avatar_url, o.role,
         lm.body, lm.created_at, coalesce(u.cnt, 0)
  from other o
  left join last_msg lm on lm.conversation_id = o.conversation_id
  left join unread u on u.conversation_id = o.conversation_id
  order by lm.created_at desc nulls last;
$$;
grant execute on function public.list_my_conversations() to authenticated;

-- ---------- total unread: don't count hidden / deleted-for-all ----------
create or replace function public.my_unread_total()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.messages m
  where m.sender_id <> auth.uid()
    and m.read_at is null
    and not m.deleted_for_all
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = m.conversation_id and cp.profile_id = auth.uid()
    )
    and not exists (
      select 1 from public.message_deletions d
      where d.message_id = m.id and d.profile_id = auth.uid()
    );
$$;
grant execute on function public.my_unread_total() to authenticated;
