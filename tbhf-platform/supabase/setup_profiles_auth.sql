-- ============================================================
-- setup_profiles_auth.sql  (already run by the project owner)
-- Kept here for reference. Idempotent. Creates: signup trigger that
-- auto-creates a profiles row, and READ/own-write RLS for profiles
-- and the related profile tables. See phase1_writes.sql for the
-- additive write functions + storage bucket.
-- ============================================================

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
