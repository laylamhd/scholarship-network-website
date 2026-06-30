-- ============================================================
-- phase1b_profile_extras.sql  —  run AFTER phase1_writes.sql.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Adds:
--   (A) new profile fields: volunteer_experience, research_interests,
--       per-field privacy (field_privacy), and year_of_study on academic
--       records; alumni seniority_level + sector
--   (B) role captured at signup (trigger reads role from metadata)
--   (C) write RPCs + read RLS for employment_history and certifications
-- ============================================================

-- ---------- (A) new columns ----------
alter table public.profiles
  add column if not exists volunteer_experience text,
  add column if not exists research_interests   text,
  -- per-field visibility: { "<field>": true|false }. Missing key = public.
  add column if not exists field_privacy jsonb not null default '{}'::jsonb;

alter table public.scholar_academic_records
  add column if not exists year_of_study text;

alter table public.alumni_details
  add column if not exists seniority_level text,
  add column if not exists sector          text;

-- ---------- (B) capture role (and country) at signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, email, full_name, country, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New Scholar'),
    new.raw_user_meta_data ->> 'country',
    case when r in ('scholar', 'alumni', 'admin') then r::user_role else 'scholar' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- (C) employment_history + certifications ----------

-- Replace the caller's employment history with the given JSON array.
-- Each element: {company_name, job_title, start_date, end_date, is_current, description}
create or replace function public.replace_my_employment_history(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  delete from public.employment_history where profile_id = uid;

  insert into public.employment_history
    (profile_id, company_name, job_title, start_date, end_date, is_current, description)
  select
    uid,
    e->>'company_name',
    e->>'job_title',
    (e->>'start_date')::date,
    nullif(e->>'end_date','')::date,
    coalesce((e->>'is_current')::boolean, false),
    nullif(e->>'description','')
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) e
  where coalesce(e->>'company_name','') <> ''
    and coalesce(e->>'job_title','')   <> ''
    and coalesce(e->>'start_date','')  <> '';
end;
$$;
grant execute on function public.replace_my_employment_history(jsonb) to authenticated;

-- Replace the caller's certifications with the given JSON array.
-- Each element: {title, issuing_org, issue_date, expiry_date, credential_url}
create or replace function public.replace_my_certifications(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;

  delete from public.certifications where profile_id = uid;

  insert into public.certifications
    (profile_id, title, issuing_org, issue_date, expiry_date, credential_url)
  select
    uid,
    c->>'title',
    nullif(c->>'issuing_org',''),
    nullif(c->>'issue_date','')::date,
    nullif(c->>'expiry_date','')::date,
    nullif(c->>'credential_url','')
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) c
  where coalesce(c->>'title','') <> '';
end;
$$;
grant execute on function public.replace_my_certifications(jsonb) to authenticated;

-- Read RLS: visible when the owning profile is visible to you.
alter table public.employment_history enable row level security;
drop policy if exists employment_history_select on public.employment_history;
create policy employment_history_select on public.employment_history
  for select using (public.can_view_profile(profile_id));

alter table public.certifications enable row level security;
drop policy if exists certifications_select on public.certifications;
create policy certifications_select on public.certifications
  for select using (public.can_view_profile(profile_id));
