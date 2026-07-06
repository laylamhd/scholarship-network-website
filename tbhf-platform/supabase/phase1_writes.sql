-- ============================================================
-- phase1_writes.sql  —  ADDITIVE to the setup you already ran.
-- Run this in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Adds what was missing for editing the profile:
--   (A) helper to read enum values (for dropdowns)
--   (B) SECURITY DEFINER write functions for skills / languages /
--       interests / academic records / alumni details
--       (each scoped to auth.uid(); no broad table grants needed)
--   (C) read RLS for alumni_details
--   (D) the `avatars` storage bucket + policies
-- ============================================================

-- ---------- (A) enum values helper (for building dropdowns) ----------
create or replace function public.get_enum_values(enum_type text)
returns text[]
language sql
stable
as $$
  select array(
    select e.enumlabel
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = enum_type
    order by e.enumsortorder
  );
$$;
-- SECURITY (BUG-012): dropdowns are only built after login, so don't let the
-- anonymous role enumerate internal enum definitions. Revoke the default PUBLIC
-- grant and expose the helper to authenticated users only.
revoke execute on function public.get_enum_values(text) from public;
revoke execute on function public.get_enum_values(text) from anon;
grant execute on function public.get_enum_values(text) to authenticated;

-- ---------- (B) relational write functions (scoped to the caller) ----------

-- Skills: replace the caller's skill links with the given names,
-- creating any new names in the dictionary.
create or replace function public.set_my_skills(p_names text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.skills (name)
  select distinct trim(n) from unnest(p_names) n
  where trim(coalesce(n,'')) <> ''
  on conflict (name) do nothing;

  delete from public.profile_skills where profile_id = uid;

  insert into public.profile_skills (profile_id, skill_id)
  select uid, s.id
  from public.skills s
  where s.name in (select distinct trim(n) from unnest(p_names) n where trim(coalesce(n,'')) <> '');
end;
$$;
grant execute on function public.set_my_skills(text[]) to authenticated;

create or replace function public.set_my_languages(p_names text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.languages (name)
  select distinct trim(n) from unnest(p_names) n
  where trim(coalesce(n,'')) <> ''
  on conflict (name) do nothing;

  delete from public.profile_languages where profile_id = uid;

  insert into public.profile_languages (profile_id, language_id)
  select uid, l.id
  from public.languages l
  where l.name in (select distinct trim(n) from unnest(p_names) n where trim(coalesce(n,'')) <> '');
end;
$$;
grant execute on function public.set_my_languages(text[]) to authenticated;

create or replace function public.set_my_interests(p_names text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.interests (name)
  select distinct trim(n) from unnest(p_names) n
  where trim(coalesce(n,'')) <> ''
  on conflict (name) do nothing;

  delete from public.profile_interests where profile_id = uid;

  insert into public.profile_interests (profile_id, interest_id)
  select uid, i.id
  from public.interests i
  where i.name in (select distinct trim(n) from unnest(p_names) n where trim(coalesce(n,'')) <> '');
end;
$$;
grant execute on function public.set_my_interests(text[]) to authenticated;

-- Academic records: replace the caller's records with the given JSON array.
-- Each element: {institution_name, degree_level, field_of_study,
--   country_of_study, start_year, end_year, is_current, gpa}
create or replace function public.replace_my_academic_records(p_records jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  delete from public.scholar_academic_records where profile_id = uid;

  insert into public.scholar_academic_records
    (profile_id, institution_name, degree_level, field_of_study,
     country_of_study, start_year, end_year, is_current, gpa)
  select
    uid,
    r->>'institution_name',
    (r->>'degree_level')::degree_level,
    r->>'field_of_study',
    r->>'country_of_study',
    (r->>'start_year')::smallint,
    nullif(r->>'end_year','')::smallint,
    coalesce((r->>'is_current')::boolean, false),
    nullif(r->>'gpa','')::numeric
  from jsonb_array_elements(coalesce(p_records, '[]'::jsonb)) r
  where coalesce(r->>'institution_name','') <> ''
    and coalesce(r->>'field_of_study','') <> ''
    and coalesce(r->>'country_of_study','') <> ''
    and coalesce(r->>'start_year','') <> '';
end;
$$;
grant execute on function public.replace_my_academic_records(jsonb) to authenticated;

-- Alumni details: upsert the caller's 1:1 row.
create or replace function public.upsert_my_alumni_details(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  insert into public.alumni_details
    (profile_id, current_employer, current_position, years_of_experience,
     industry, linkedin_url, willing_to_mentor)
  values (
    uid,
    nullif(p->>'current_employer',''),
    nullif(p->>'current_position',''),
    nullif(p->>'years_of_experience','')::smallint,
    nullif(p->>'industry',''),
    nullif(p->>'linkedin_url',''),
    coalesce((p->>'willing_to_mentor')::boolean, false)
  )
  on conflict (profile_id) do update set
    current_employer    = excluded.current_employer,
    current_position    = excluded.current_position,
    years_of_experience = excluded.years_of_experience,
    industry            = excluded.industry,
    linkedin_url        = excluded.linkedin_url,
    willing_to_mentor   = excluded.willing_to_mentor,
    updated_at          = now();
end;
$$;
grant execute on function public.upsert_my_alumni_details(jsonb) to authenticated;

-- ---------- (C) read RLS for alumni_details ----------
-- SECURITY (BUG-003): restrict to authenticated so anon can't read employers,
-- positions and LinkedIn URLs via the public REST API.
alter table public.alumni_details enable row level security;
drop policy if exists alumni_details_select on public.alumni_details;
create policy alumni_details_select on public.alumni_details
  for select to authenticated using (public.can_view_profile(profile_id));

-- ---------- (D) avatars storage bucket + policies ----------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
