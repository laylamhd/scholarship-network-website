-- ============================================================
-- phase8_events.sql  —  Phase 8: Events & Webinars.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- A centralized calendar of TBHF events & webinars. Creating events is
-- ADMIN-only (TBHF organizes); members browse, RSVP, register via the
-- external link and watch recordings afterwards.
--
-- Reuses the EXISTING public.events table (id, title, description, mode,
-- location, online_link, start_at, end_at, capacity, status,
-- cover_image_url, created_by, created_at, updated_at). It only ADDS the
-- three columns this feature needs that weren't already there:
--   event_type, registration_link, recording_url
-- Requires is_admin() (phase3_resources.sql). Bucket: event-posters.
-- ============================================================

-- Add only the missing columns (idempotent).
alter table public.events add column if not exists event_type        text;
alter table public.events add column if not exists registration_link text;
alter table public.events add column if not exists recording_url     text;

alter table public.events alter column event_type set default 'Career workshop';

-- Validate event_type values (guarded so re-runs / existing rows don't break).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_event_type_check' and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_event_type_check
      check (event_type is null or event_type in (
        'Career workshop', 'Leadership training', 'Guest lecture',
        'Networking session', 'University fair', 'Scholarship orientation',
        'Webinar', 'Other'
      ));
  end if;
end $$;

create index if not exists events_start_idx on public.events (start_at);
create index if not exists events_type_idx  on public.events (event_type);

-- ---------- RSVPs ----------
create table if not exists public.event_rsvps (
  event_id   uuid not null references public.events(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'going' check (status in ('going', 'interested')),
  created_at timestamptz not null default now(),
  primary key (event_id, profile_id)
);
create index if not exists event_rsvps_event_idx on public.event_rsvps (event_id);

-- ---------- RLS: events (read all; admins manage) ----------
alter table public.events enable row level security;

drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated using (true);

drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());

drop policy if exists events_update on public.events;
create policy events_update on public.events
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists events_delete on public.events;
create policy events_delete on public.events
  for delete to authenticated using (public.is_admin());

-- ---------- RLS: event_rsvps (visible to all; each manages their own) ----------
alter table public.event_rsvps enable row level security;

drop policy if exists event_rsvps_select on public.event_rsvps;
create policy event_rsvps_select on public.event_rsvps
  for select to authenticated using (true);

drop policy if exists event_rsvps_insert on public.event_rsvps;
create policy event_rsvps_insert on public.event_rsvps
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists event_rsvps_update on public.event_rsvps;
create policy event_rsvps_update on public.event_rsvps
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists event_rsvps_delete on public.event_rsvps;
create policy event_rsvps_delete on public.event_rsvps
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- storage bucket for event posters / cover images ----------
insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do nothing;

drop policy if exists event_posters_public_read on storage.objects;
create policy event_posters_public_read on storage.objects
  for select using (bucket_id = 'event-posters');

drop policy if exists event_posters_admin_insert on storage.objects;
create policy event_posters_admin_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'event-posters' and public.is_admin());

drop policy if exists event_posters_admin_update on storage.objects;
create policy event_posters_admin_update on storage.objects
  for update to authenticated using (bucket_id = 'event-posters' and public.is_admin());

drop policy if exists event_posters_admin_delete on storage.objects;
create policy event_posters_admin_delete on storage.objects
  for delete to authenticated using (bucket_id = 'event-posters' and public.is_admin());
