-- ============================================================
-- phase37_message_reactions.sql  —  WhatsApp-style message reactions in DMs.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- One reaction per member per message (tapping the same emoji again removes
-- it; a different emoji replaces it) — exactly WhatsApp's model, with the
-- classic six emoji. Reads gated by conversation membership; writes go
-- through a SECURITY DEFINER RPC like every other messaging write.
-- ============================================================

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, profile_id)
);
create index if not exists message_reactions_message_idx
  on public.message_reactions (message_id);

alter table public.message_reactions enable row level security;
drop policy if exists message_reactions_select on public.message_reactions;
create policy message_reactions_select on public.message_reactions
  for select to authenticated using (
    public.is_conversation_member(
      (select m.conversation_id from public.messages m where m.id = message_id)
    )
  );

-- ---------- react / unreact ----------
-- Same emoji again -> removed. Different emoji -> replaced. Only the six
-- classic WhatsApp reactions are accepted.
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
  if em not in ('👍','❤️','😂','😮','😢','🙏') then
    raise exception 'unsupported reaction';
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

-- ---------- reactions for a whole conversation (one query per page load) ----------
create or replace function public.list_conversation_reactions(conv uuid)
returns table (message_id uuid, emoji text, cnt bigint, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.message_id, r.emoji, count(*), bool_or(r.profile_id = auth.uid())
  from public.message_reactions r
  join public.messages m on m.id = r.message_id
  where m.conversation_id = conv
    and public.is_conversation_member(conv)
  group by r.message_id, r.emoji
  order by min(r.created_at);
$$;
revoke execute on function public.list_conversation_reactions(uuid) from public, anon;
grant  execute on function public.list_conversation_reactions(uuid) to authenticated;
