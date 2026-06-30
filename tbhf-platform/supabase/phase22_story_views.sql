-- ============================================================
-- phase22_story_views.sql  —  Story view tracking.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Records a view per (story, viewer, day) so we can show a view counter on
-- each published story AND pick the "Most popular story this week" for the
-- Stories hero — ranked by views in the last 7 days, so the choice rotates
-- weekly instead of being stuck on an all-time favourite.
--
-- One row per viewer per story per day (the day-grain primary key) keeps a
-- refresh-happy reader from inflating the count. Author self-views are not
-- recorded (the app skips them).
--
-- Depends on: stories, profiles (phase6_stories.sql).
-- ============================================================

create table if not exists public.story_views (
  story_id   uuid not null references public.stories(id) on delete cascade,
  viewer_id  uuid not null references public.profiles(id) on delete cascade,
  view_date  date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (story_id, viewer_id, view_date)
);
create index if not exists story_views_story_idx on public.story_views (story_id);
create index if not exists story_views_recent_idx on public.story_views (view_date);

alter table public.story_views enable row level security;

-- View counts are public to all members (powers the counter + popularity).
drop policy if exists story_views_select on public.story_views;
create policy story_views_select on public.story_views
  for select to authenticated using (true);

-- A member can only record their own view.
drop policy if exists story_views_insert on public.story_views;
create policy story_views_insert on public.story_views
  for insert to authenticated with check (viewer_id = auth.uid());
