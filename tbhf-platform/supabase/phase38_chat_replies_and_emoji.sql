-- ============================================================
-- phase38_chat_replies_and_emoji.sql
--   1) Swipe-to-reply: messages can quote an earlier message (reply_to).
--   2) Any-emoji reactions: the reaction bar's "+" lets members pick any
--      emoji, so react_to_message no longer whitelists the classic six.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
-- ============================================================

-- ---------- 1) reply_to column ----------
alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null;

-- Replace send_message with a 3-arg version that accepts an optional quoted
-- message. The old 2-arg signature is dropped so the default-arg version isn't
-- ambiguous. The reply is only kept if it belongs to the same conversation.
drop function if exists public.send_message(uuid, text);

create or replace function public.send_message(conv uuid, body text, reply_to uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid   uuid := auth.uid();
  mid   uuid;
  reply uuid := null;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if not public.is_conversation_member(conv) then raise exception 'not a participant'; end if;
  if coalesce(btrim(body), '') = '' then raise exception 'empty message'; end if;

  -- Only quote a message that lives in this same conversation.
  if reply_to is not null then
    select m.id into reply
    from public.messages m
    where m.id = reply_to and m.conversation_id = conv;
  end if;

  insert into public.messages (conversation_id, sender_id, body, reply_to)
  values (conv, uid, btrim(body), reply) returning id into mid;

  update public.conversations set last_message_at = now() where id = conv;
  return mid;
end;
$$;
grant execute on function public.send_message(uuid, text, uuid) to authenticated;

-- ---------- 2) any-emoji reactions ----------
-- Was restricted to the classic six; now accepts any single short emoji so the
-- "+" picker can offer the full set. Length-bounded to stay a reaction, not text.
create or replace function public.react_to_message(msg uuid, em text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      uuid := auth.uid();
  conv     uuid;
  deleted  boolean;
  existing text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if em is null or char_length(em) < 1 or char_length(em) > 16 then
    raise exception 'invalid reaction';
  end if;

  select m.conversation_id, m.deleted_for_all into conv, deleted
  from public.messages m where m.id = msg;
  if conv is null then raise exception 'message not found'; end if;
  if not public.is_conversation_member(conv) then raise exception 'not a participant'; end if;
  if deleted then raise exception 'message was deleted'; end if;

  select r.emoji into existing
  from public.message_reactions r
  where r.message_id = msg and r.profile_id = uid;

  if existing = em then
    delete from public.message_reactions
    where message_id = msg and profile_id = uid;
  else
    insert into public.message_reactions (message_id, profile_id, emoji)
    values (msg, uid, em)
    on conflict (message_id, profile_id)
    do update set emoji = excluded.emoji, created_at = now();
  end if;
end;
$$;
revoke execute on function public.react_to_message(uuid, text) from public, anon;
grant  execute on function public.react_to_message(uuid, text) to authenticated;
