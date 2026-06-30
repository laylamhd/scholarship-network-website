-- ============================================================
-- phase10_volunteer.sql  —  Phase 10: Volunteer & Social Impact Portal.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Member-driven: scholars create community projects, recruit volunteers,
-- log their volunteer hours and share project outcomes.
-- Requires is_admin() (phase3_resources.sql). Bucket: projects.
--
-- NOTE: if your database already has volunteer/project tables with a
-- different shape, tell me and I'll adapt (like we did for `events`).
-- These use distinct names (community_projects / project_volunteers /
-- volunteer_hours) to avoid the profile-level `volunteer_experiences`.
-- ============================================================

create table if not exists public.community_projects (
  id           uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text not null,
  cause        text not null default 'Community'
               check (cause in ('Education', 'Health & wellbeing', 'Environment', 'Humanitarian', 'Community', 'Arts & culture', 'Other')),
  location     text,
  image_url    text,
  start_date   date,
  end_date     date,
  status       text not null default 'recruiting'
               check (status in ('recruiting', 'ongoing', 'completed')),
  outcome      text,            -- shared after completion
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists community_projects_organizer_idx on public.community_projects (organizer_id);
create index if not exists community_projects_cause_idx on public.community_projects (cause);

-- Who signed up to help on a project.
create table if not exists public.project_volunteers (
  project_id uuid not null references public.community_projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (project_id, profile_id)
);
create index if not exists project_volunteers_project_idx on public.project_volunteers (project_id);

-- Personal volunteer-hour log (optionally tied to a project).
create table if not exists public.volunteer_hours (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  project_id  uuid references public.community_projects(id) on delete set null,
  hours       numeric(5,2) not null check (hours > 0),
  activity    text,
  logged_date date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists volunteer_hours_profile_idx on public.volunteer_hours (profile_id);

-- ---------- RLS: community_projects (read all; organizer/admin manage) ----------
alter table public.community_projects enable row level security;

drop policy if exists community_projects_select on public.community_projects;
create policy community_projects_select on public.community_projects
  for select to authenticated using (true);

drop policy if exists community_projects_insert on public.community_projects;
create policy community_projects_insert on public.community_projects
  for insert to authenticated with check (organizer_id = auth.uid());

drop policy if exists community_projects_update on public.community_projects;
create policy community_projects_update on public.community_projects
  for update to authenticated using (organizer_id = auth.uid() or public.is_admin()) with check (organizer_id = auth.uid() or public.is_admin());

drop policy if exists community_projects_delete on public.community_projects;
create policy community_projects_delete on public.community_projects
  for delete to authenticated using (organizer_id = auth.uid() or public.is_admin());

-- ---------- RLS: project_volunteers (visible to all; manage your own) ----------
alter table public.project_volunteers enable row level security;

drop policy if exists project_volunteers_select on public.project_volunteers;
create policy project_volunteers_select on public.project_volunteers
  for select to authenticated using (true);

drop policy if exists project_volunteers_insert on public.project_volunteers;
create policy project_volunteers_insert on public.project_volunteers
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists project_volunteers_delete on public.project_volunteers;
create policy project_volunteers_delete on public.project_volunteers
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- RLS: volunteer_hours (private to the logger) ----------
alter table public.volunteer_hours enable row level security;

drop policy if exists volunteer_hours_select on public.volunteer_hours;
create policy volunteer_hours_select on public.volunteer_hours
  for select to authenticated using (profile_id = auth.uid());

drop policy if exists volunteer_hours_insert on public.volunteer_hours;
create policy volunteer_hours_insert on public.volunteer_hours
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists volunteer_hours_update on public.volunteer_hours;
create policy volunteer_hours_update on public.volunteer_hours
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

drop policy if exists volunteer_hours_delete on public.volunteer_hours;
create policy volunteer_hours_delete on public.volunteer_hours
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- storage bucket for project images ----------
insert into storage.buckets (id, name, public)
values ('projects', 'projects', true)
on conflict (id) do nothing;

drop policy if exists projects_public_read on storage.objects;
create policy projects_public_read on storage.objects
  for select using (bucket_id = 'projects');

drop policy if exists projects_auth_insert on storage.objects;
create policy projects_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'projects');

drop policy if exists projects_auth_update on storage.objects;
create policy projects_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'projects');

drop policy if exists projects_auth_delete on storage.objects;
create policy projects_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'projects');
