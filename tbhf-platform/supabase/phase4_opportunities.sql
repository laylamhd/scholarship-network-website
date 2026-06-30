-- ============================================================
-- phase4_opportunities.sql  —  Phase 4: Internship & Career Center.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Uses existing tables: opportunities, opportunity_applications,
-- opportunity_bookmarks. Adds RLS. Posting is admin-only (TBHF curates);
-- any member can save and track their applications.
-- Requires is_admin() (created in phase3_resources.sql).
-- ============================================================

-- ---------- opportunities (read all; admins post) ----------
alter table public.opportunities enable row level security;

drop policy if exists opportunities_select on public.opportunities;
create policy opportunities_select on public.opportunities
  for select to authenticated using (true);

drop policy if exists opportunities_insert on public.opportunities;
create policy opportunities_insert on public.opportunities
  for insert to authenticated
  with check (public.is_admin() and posted_by = auth.uid());

drop policy if exists opportunities_update on public.opportunities;
create policy opportunities_update on public.opportunities
  for update to authenticated
  using (public.is_admin() or posted_by = auth.uid())
  with check (public.is_admin() or posted_by = auth.uid());

drop policy if exists opportunities_delete on public.opportunities;
create policy opportunities_delete on public.opportunities
  for delete to authenticated
  using (public.is_admin() or posted_by = auth.uid());

-- ---------- applications (each scholar tracks their own) ----------
alter table public.opportunity_applications enable row level security;

drop policy if exists opportunity_applications_select on public.opportunity_applications;
create policy opportunity_applications_select on public.opportunity_applications
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists opportunity_applications_insert on public.opportunity_applications;
create policy opportunity_applications_insert on public.opportunity_applications
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists opportunity_applications_update on public.opportunity_applications;
create policy opportunity_applications_update on public.opportunity_applications
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists opportunity_applications_delete on public.opportunity_applications;
create policy opportunity_applications_delete on public.opportunity_applications
  for delete to authenticated using (profile_id = auth.uid());

-- Prevent duplicate application rows for the same scholar + opportunity.
create unique index if not exists opportunity_applications_unique
  on public.opportunity_applications (opportunity_id, profile_id);

-- ---------- bookmarks (each scholar manages their own) ----------
alter table public.opportunity_bookmarks enable row level security;

drop policy if exists opportunity_bookmarks_select on public.opportunity_bookmarks;
create policy opportunity_bookmarks_select on public.opportunity_bookmarks
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists opportunity_bookmarks_insert on public.opportunity_bookmarks;
create policy opportunity_bookmarks_insert on public.opportunity_bookmarks
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists opportunity_bookmarks_delete on public.opportunity_bookmarks;
create policy opportunity_bookmarks_delete on public.opportunity_bookmarks
  for delete to authenticated using (profile_id = auth.uid());
