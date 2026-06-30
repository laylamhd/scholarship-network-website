-- ============================================================
-- phase6_stories.sql  —  Phase 6: Blog & Storytelling Platform.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Scholars & alumni publish stories (personal, academic, research, etc.).
-- Authors control draft/published. Admins can mark a story "featured" for
-- the TBHF website/socials, but ONLY after the author has given consent
-- (featured_consent) — enforced by set_story_featured().
-- Requires is_admin() (created in phase3_resources.sql).
-- Tables created here: stories, story_likes. Bucket: story-covers.
-- ============================================================

create table if not exists public.stories (
  id               uuid primary key default gen_random_uuid(),
  author_id        uuid not null references public.profiles(id) on delete cascade,
  title            text not null,
  category         text not null default 'Personal stories'
                   check (category in (
                     'Personal stories', 'Academic journeys', 'Research insights',
                     'Community projects', 'Cultural experiences', 'Photography essays'
                   )),
  excerpt          text,
  body             text not null,
  cover_image_url  text,
  status           text not null default 'published'
                   check (status in ('draft', 'published')),
  is_featured      boolean not null default false,
  featured_consent boolean not null default false,
  read_minutes     int,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  published_at     timestamptz default now()
);
-- (idempotent: add the reading-time column to pre-existing tables)
alter table public.stories add column if not exists read_minutes int;
create index if not exists stories_author_idx on public.stories (author_id);
create index if not exists stories_category_idx on public.stories (category);
create index if not exists stories_published_idx on public.stories (status, published_at desc);

-- Backfill reading time (~200 words/min) for any rows missing it.
update public.stories
set read_minutes = greatest(1, round(
  array_length(regexp_split_to_array(btrim(coalesce(body, '')), '\s+'), 1) / 200.0
))
where read_minutes is null and btrim(coalesce(body, '')) <> '';

create table if not exists public.story_likes (
  story_id   uuid not null references public.stories(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, profile_id)
);
create index if not exists story_likes_story_idx on public.story_likes (story_id);

-- ---------- RLS: stories ----------
alter table public.stories enable row level security;

-- Published stories are visible to all members; drafts only to author/admin.
drop policy if exists stories_select on public.stories;
create policy stories_select on public.stories
  for select to authenticated
  using (status = 'published' or author_id = auth.uid() or public.is_admin());

drop policy if exists stories_insert on public.stories;
create policy stories_insert on public.stories
  for insert to authenticated
  with check (author_id = auth.uid());

drop policy if exists stories_update on public.stories;
create policy stories_update on public.stories
  for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists stories_delete on public.stories;
create policy stories_delete on public.stories
  for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- ---------- RLS: story_likes ----------
alter table public.story_likes enable row level security;

drop policy if exists story_likes_select on public.story_likes;
create policy story_likes_select on public.story_likes
  for select to authenticated using (true);

drop policy if exists story_likes_insert on public.story_likes;
create policy story_likes_insert on public.story_likes
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists story_likes_delete on public.story_likes;
create policy story_likes_delete on public.story_likes
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- feature a story (admin only, requires author consent) ----------
create or replace function public.set_story_featured(p_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;

  if p_featured and not exists (
    select 1 from public.stories where id = p_id and featured_consent is true
  ) then
    raise exception 'author has not consented to featuring this story';
  end if;

  update public.stories
  set is_featured = coalesce(p_featured, false), updated_at = now()
  where id = p_id;

  if not found then raise exception 'story not found'; end if;
end;
$$;
grant execute on function public.set_story_featured(uuid, boolean) to authenticated;

-- ---------- storage bucket for story cover images ----------
insert into storage.buckets (id, name, public)
values ('story-covers', 'story-covers', true)
on conflict (id) do nothing;

drop policy if exists story_covers_public_read on storage.objects;
create policy story_covers_public_read on storage.objects
  for select using (bucket_id = 'story-covers');

drop policy if exists story_covers_insert on storage.objects;
create policy story_covers_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'story-covers');

drop policy if exists story_covers_update on storage.objects;
create policy story_covers_update on storage.objects
  for update to authenticated using (bucket_id = 'story-covers');

drop policy if exists story_covers_delete on storage.objects;
create policy story_covers_delete on storage.objects
  for delete to authenticated using (bucket_id = 'story-covers');
