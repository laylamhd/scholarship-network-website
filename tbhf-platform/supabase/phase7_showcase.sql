-- ============================================================
-- phase7_showcase.sql  —  Phase 7: Multimedia Showcase.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- A TBHF-curated gallery of photos, videos, posters, artworks and
-- presentations. Uploading is ADMIN-only (TBHF curates); every member
-- can view. Requires is_admin() (created in phase3_resources.sql).
-- Table: showcase_items. Bucket: showcase.
-- ============================================================

create table if not exists public.showcase_items (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  media_type    text not null default 'Photo'
                check (media_type in ('Photo', 'Video', 'Poster', 'Artwork', 'Presentation')),
  media_url     text,            -- uploaded file (image / video / pdf) in the 'showcase' bucket
  thumbnail_url text,            -- optional poster image (for videos / presentations)
  external_url  text,            -- optional external link (e.g. YouTube / Vimeo / Slides)
  uploaded_by   uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);
create index if not exists showcase_items_type_idx on public.showcase_items (media_type);
create index if not exists showcase_items_created_idx on public.showcase_items (created_at desc);

-- ---------- RLS (read all; admins manage) ----------
alter table public.showcase_items enable row level security;

drop policy if exists showcase_items_select on public.showcase_items;
create policy showcase_items_select on public.showcase_items
  for select to authenticated using (true);

drop policy if exists showcase_items_insert on public.showcase_items;
create policy showcase_items_insert on public.showcase_items
  for insert to authenticated
  with check (public.is_admin() and uploaded_by = auth.uid());

drop policy if exists showcase_items_update on public.showcase_items;
create policy showcase_items_update on public.showcase_items
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists showcase_items_delete on public.showcase_items;
create policy showcase_items_delete on public.showcase_items
  for delete to authenticated using (public.is_admin());

-- ---------- storage bucket for showcase media ----------
insert into storage.buckets (id, name, public)
values ('showcase', 'showcase', true)
on conflict (id) do nothing;

drop policy if exists showcase_public_read on storage.objects;
create policy showcase_public_read on storage.objects
  for select using (bucket_id = 'showcase');

drop policy if exists showcase_admin_insert on storage.objects;
create policy showcase_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'showcase' and public.is_admin());

drop policy if exists showcase_admin_update on storage.objects;
create policy showcase_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'showcase' and public.is_admin());

drop policy if exists showcase_admin_delete on storage.objects;
create policy showcase_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'showcase' and public.is_admin());
