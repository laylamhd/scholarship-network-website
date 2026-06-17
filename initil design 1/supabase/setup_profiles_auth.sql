-- ============================================================
-- setup_profiles_auth.sql
-- Run this in the Supabase SQL Editor IF you haven't already set up:
--   (1) a trigger that auto-creates a profiles row on signup, and
--   (2) row-level security policies for the profile pages.
-- Everything here is idempotent (safe to re-run). It does NOT create
-- tables or enums — those already exist in your schema.
-- ============================================================

-- ---------- (1) auto-create a profile when a user signs up ----------
-- profiles.full_name and profiles.email are NOT NULL, so the trigger
-- pulls them from the auth user (full_name/country come from signUp metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, country)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New Scholar'),
    new.raw_user_meta_data ->> 'country'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- (2) row-level security ----------
-- profiles: read your own or any public profile; edit only your own.
alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or profile_visibility = 'public');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = id);

-- Helper: can the current user view rows belonging to <profile_uuid>?
create or replace function public.can_view_profile(p uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p and (id = auth.uid() or profile_visibility = 'public')
  );
$$;

-- Academic records + the profile<->tag link tables: visible when the
-- owning profile is visible to you.
alter table public.scholar_academic_records enable row level security;
drop policy if exists sar_select on public.scholar_academic_records;
create policy sar_select on public.scholar_academic_records
  for select using (public.can_view_profile(profile_id));

alter table public.profile_skills enable row level security;
drop policy if exists profile_skills_select on public.profile_skills;
create policy profile_skills_select on public.profile_skills
  for select using (public.can_view_profile(profile_id));

alter table public.profile_languages enable row level security;
drop policy if exists profile_languages_select on public.profile_languages;
create policy profile_languages_select on public.profile_languages
  for select using (public.can_view_profile(profile_id));

alter table public.profile_interests enable row level security;
drop policy if exists profile_interests_select on public.profile_interests;
create policy profile_interests_select on public.profile_interests
  for select using (public.can_view_profile(profile_id));

-- Tag dictionaries are just name lookups — readable by any signed-in user.
alter table public.skills enable row level security;
drop policy if exists skills_select on public.skills;
create policy skills_select on public.skills
  for select to authenticated using (true);

alter table public.languages enable row level security;
drop policy if exists languages_select on public.languages;
create policy languages_select on public.languages
  for select to authenticated using (true);

alter table public.interests enable row level security;
drop policy if exists interests_select on public.interests;
create policy interests_select on public.interests
  for select to authenticated using (true);
