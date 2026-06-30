-- ============================================================
-- phase17_member_submissions.sql
--   Let students & alumni submit Events and Showcase items.
--   Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Previously events & showcase items could only be created by admins.
-- Now ANY authenticated member can create them — but a member's submission
-- is NOT published until an admin approves it. This relies on the moderation
-- layer from phase13_moderation.sql, which is already in place:
--   * the BEFORE INSERT trigger content_submit() sets review_status to
--     'pending' for non-admins (and 'approved' for admins), and notifies
--     the author that their item is awaiting review;
--   * the *_select RLS policies already hide non-approved rows from everyone
--     except the author and admins.
--
-- So this file only has to (1) open up the INSERT policies (and let authors
-- manage their own rows), and (2) let members upload to the media buckets.
--
-- Requires phase7_showcase.sql, phase8_events.sql and phase13_moderation.sql.
-- ============================================================

-- ---------- events: any member may create; author/admin may manage ----------
drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated
  using (public.is_admin() or created_by = auth.uid());

-- ---------- showcase_items: any member may create; author/admin may manage ----------
drop policy if exists showcase_items_insert on public.showcase_items;
create policy showcase_items_insert on public.showcase_items
  for insert to authenticated with check (uploaded_by = auth.uid());

drop policy if exists showcase_items_update on public.showcase_items;
create policy showcase_items_update on public.showcase_items
  for update to authenticated
  using (public.is_admin() or uploaded_by = auth.uid())
  with check (public.is_admin() or uploaded_by = auth.uid());

drop policy if exists showcase_items_delete on public.showcase_items;
create policy showcase_items_delete on public.showcase_items
  for delete to authenticated
  using (public.is_admin() or uploaded_by = auth.uid());

-- ---------- storage: members may upload posters & showcase media ----------
-- (public read stays as set in phase7/phase8; we just open insert to any
--  authenticated user so a member can attach a cover image / media file.)
drop policy if exists event_posters_admin_insert on storage.objects;
drop policy if exists event_posters_member_insert on storage.objects;
create policy event_posters_member_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'event-posters');

drop policy if exists showcase_admin_insert on storage.objects;
drop policy if exists showcase_member_insert on storage.objects;
create policy showcase_member_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'showcase');
