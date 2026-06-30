-- ============================================================
-- phase3_resources.sql  —  Phase 3: Knowledge & Resource Library.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Uses existing tables: resource_categories, resources, resource_bookmarks.
-- Adds: is_admin() helper, RLS, seed categories, and a 'resources'
-- storage bucket (admins upload files; everyone can read).
-- ============================================================

-- ---------- admin helper ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
grant execute on function public.is_admin() to authenticated;

-- ---------- seed the standard categories ----------
insert into public.resource_categories (name, description) values
  ('Academic',              'Study guides, research tools & academic writing support'),
  ('Career',                'CV templates, interview prep & career planning'),
  ('Personal Development',  'Leadership, mental health, financial literacy & time management'),
  ('Humanitarian Learning', 'Refugee issues, human rights, sustainable development & social innovation')
on conflict (name) do nothing;

-- ---------- RLS: resource_categories (read all; admins manage) ----------
alter table public.resource_categories enable row level security;

drop policy if exists resource_categories_select on public.resource_categories;
create policy resource_categories_select on public.resource_categories
  for select to authenticated using (true);

drop policy if exists resource_categories_admin_write on public.resource_categories;
create policy resource_categories_admin_write on public.resource_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- RLS: resources ----------
alter table public.resources enable row level security;

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources
  for select to authenticated
  using (is_published = true or uploaded_by = auth.uid() or public.is_admin());

drop policy if exists resources_insert on public.resources;
create policy resources_insert on public.resources
  for insert to authenticated
  with check (public.is_admin() and uploaded_by = auth.uid());

drop policy if exists resources_update on public.resources;
create policy resources_update on public.resources
  for update to authenticated
  using (public.is_admin() or uploaded_by = auth.uid())
  with check (public.is_admin() or uploaded_by = auth.uid());

drop policy if exists resources_delete on public.resources;
create policy resources_delete on public.resources
  for delete to authenticated
  using (public.is_admin() or uploaded_by = auth.uid());

-- ---------- RLS: resource_bookmarks (each user manages their own) ----------
alter table public.resource_bookmarks enable row level security;

drop policy if exists resource_bookmarks_select on public.resource_bookmarks;
create policy resource_bookmarks_select on public.resource_bookmarks
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists resource_bookmarks_insert on public.resource_bookmarks;
create policy resource_bookmarks_insert on public.resource_bookmarks
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists resource_bookmarks_delete on public.resource_bookmarks;
create policy resource_bookmarks_delete on public.resource_bookmarks
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- storage bucket for uploaded resource files ----------
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

drop policy if exists resources_public_read on storage.objects;
create policy resources_public_read on storage.objects
  for select using (bucket_id = 'resources');

drop policy if exists resources_admin_insert on storage.objects;
create policy resources_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'resources' and public.is_admin());

drop policy if exists resources_admin_update on storage.objects;
create policy resources_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'resources' and public.is_admin());

drop policy if exists resources_admin_delete on storage.objects;
create policy resources_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'resources' and public.is_admin());
