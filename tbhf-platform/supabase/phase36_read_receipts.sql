-- ============================================================
-- phase36_read_receipts.sql  —  WhatsApp-style "Seen" for DMs.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- messages.read_at already exists (phase2b) and is set by
-- mark_conversation_read(); it keeps powering the unread badges for everyone.
-- This phase only controls whether the SENDER gets to SEE that state:
--   profiles.read_receipts (default on). WhatsApp semantics — "Seen" shows in
--   a conversation only when BOTH participants have read receipts enabled;
--   turning yours off also stops you from seeing other people's.
-- The column is served via RPCs only (no raw column grant), matching the
-- phase33 approach for personal profile fields.
-- ============================================================

alter table public.profiles
  add column if not exists read_receipts boolean not null default true;

-- ---------- read my own setting (Settings page) ----------
create or replace function public.get_my_read_receipts()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select read_receipts from public.profiles where id = auth.uid()),
    true
  );
$$;
revoke execute on function public.get_my_read_receipts() from public, anon;
grant  execute on function public.get_my_read_receipts() to authenticated;

-- ---------- change my own setting (Settings page toggle) ----------
create or replace function public.set_my_read_receipts(enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.profiles set read_receipts = enabled where id = auth.uid();
end;
$$;
revoke execute on function public.set_my_read_receipts(boolean) from public, anon;
grant  execute on function public.set_my_read_receipts(boolean) to authenticated;

-- ---------- may "Seen" be shown in this conversation? ----------
-- True only when the caller is a member AND every participant has read
-- receipts enabled (both sides, WhatsApp-style).
create or replace function public.conversation_seen_enabled(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_conversation_member(conv)
     and not exists (
       select 1
       from public.conversation_participants cp
       join public.profiles p on p.id = cp.profile_id
       where cp.conversation_id = conv
         and p.read_receipts = false
     );
$$;
revoke execute on function public.conversation_seen_enabled(uuid) from public, anon;
grant  execute on function public.conversation_seen_enabled(uuid) to authenticated;
