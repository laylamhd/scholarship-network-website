-- ============================================================
-- phase2b_messaging.sql  —  Phase 2b: Direct Messaging.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Tables: conversations, conversation_participants, messages.
-- Modelled to allow group chats later (participants is a join table),
-- but the UI creates 1:1 DMs via get_or_create_dm().
-- Writes go through SECURITY DEFINER RPCs; reads are gated by RLS.
-- ============================================================

create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, profile_id)
);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(btrim(body)) > 0),
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists conversation_participants_profile_idx on public.conversation_participants (profile_id);

-- ---------- membership helper (avoids RLS recursion) ----------
create or replace function public.is_conversation_member(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv and profile_id = auth.uid()
  );
$$;
grant execute on function public.is_conversation_member(uuid) to authenticated;

-- ---------- RLS (reads only; writes go through RPCs) ----------
alter table public.conversations enable row level security;
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated using (public.is_conversation_member(id));

alter table public.conversation_participants enable row level security;
drop policy if exists conversation_participants_select on public.conversation_participants;
create policy conversation_participants_select on public.conversation_participants
  for select to authenticated using (public.is_conversation_member(conversation_id));

alter table public.messages enable row level security;
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));

-- ---------- find or create a 1:1 conversation ----------
create or replace function public.get_or_create_dm(other uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); conv uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if other = uid then raise exception 'cannot message yourself'; end if;

  select c.id into conv
  from public.conversations c
  join public.conversation_participants p1 on p1.conversation_id = c.id and p1.profile_id = uid
  join public.conversation_participants p2 on p2.conversation_id = c.id and p2.profile_id = other
  where (select count(*) from public.conversation_participants cp where cp.conversation_id = c.id) = 2
  limit 1;

  if conv is null then
    insert into public.conversations default values returning id into conv;
    insert into public.conversation_participants (conversation_id, profile_id)
    values (conv, uid), (conv, other);
  end if;

  return conv;
end;
$$;
grant execute on function public.get_or_create_dm(uuid) to authenticated;

-- ---------- send a message ----------
create or replace function public.send_message(conv uuid, body text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid(); mid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_member(conv) then raise exception 'not a participant'; end if;
  if coalesce(btrim(body), '') = '' then raise exception 'empty message'; end if;

  insert into public.messages (conversation_id, sender_id, body)
  values (conv, uid, btrim(body)) returning id into mid;

  update public.conversations set last_message_at = now() where id = conv;
  return mid;
end;
$$;
grant execute on function public.send_message(uuid, text) to authenticated;

-- ---------- mark a conversation's incoming messages read ----------
create or replace function public.mark_conversation_read(conv uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_member(conv) then return; end if;
  update public.messages
  set read_at = now()
  where conversation_id = conv and sender_id <> uid and read_at is null;
end;
$$;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- ---------- inbox listing (other participant + last message + unread) ----------
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
    select distinct on (m.conversation_id) m.conversation_id, m.body, m.created_at
    from public.messages m
    where m.conversation_id in (select conversation_id from my)
    order by m.conversation_id, m.created_at desc
  ),
  unread as (
    select m.conversation_id, count(*) as cnt
    from public.messages m
    where m.conversation_id in (select conversation_id from my)
      and m.sender_id <> auth.uid()
      and m.read_at is null
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

-- ---------- total unread (for the sidebar badge) ----------
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
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = m.conversation_id and cp.profile_id = auth.uid()
    );
$$;
grant execute on function public.my_unread_total() to authenticated;
