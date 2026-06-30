-- ============================================================
-- phase2_follows.sql  —  Phase 2a: Scholar Directory + Follow.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Enables row-level security on the existing public.follows table so
-- scholars can follow / unfollow each other.
--   • read:   any signed-in member can see the follow graph (counts, etc.)
--   • insert: you may only create follows where you are the follower
--   • delete/update: you may only change your own follows
-- ============================================================

alter table public.follows enable row level security;

drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows
  for select to authenticated using (true);

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows
  for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows
  for delete to authenticated
  using (follower_id = auth.uid());

drop policy if exists follows_update on public.follows;
create policy follows_update on public.follows
  for update to authenticated
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());
