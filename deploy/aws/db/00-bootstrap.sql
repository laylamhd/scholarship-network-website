-- =============================================================================
-- 00-bootstrap.sql — prepare an EMPTY Amazon RDS for PostgreSQL database for
-- the app. Run as the RDS master user (member of rds_superuser). Idempotent.
--
-- The exported schema was written for Supabase, so it expects a few things
-- that a plain PostgreSQL server does not have. We create them here — now
-- owned and controlled by us, with no Supabase software involved:
--
--   * the three API roles the Row Level Security policies are written for
--       anon           not signed in
--       authenticated  signed-in member
--       service_role   the app's own server-side jobs (sign-up, login, cron)
--   * tbhf_app — the ONLY login the website uses. It has no table rights of
--     its own; per request the app does SET LOCAL ROLE authenticated/anon,
--     so every query is checked by exactly the same RLS policies as before.
--   * schema auth: our own users table (bcrypt password hashes) and
--     auth.uid(), which returns the signed-in user's id for the RLS policies.
--
-- psql variables:  -v app_password=...
-- =============================================================================

-- ---------- roles ----------
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
  if not exists (select 1 from pg_roles where rolname = 'tbhf_app') then
    create role tbhf_app login noinherit;
  end if;
end $$;

-- psql substitutes the variable before the server sees this statement.
alter role tbhf_app with login noinherit password :'app_password';
grant anon, authenticated, service_role to tbhf_app;
-- Safety net: a runaway query from the website is cancelled after 30 s.
alter role tbhf_app set statement_timeout = '30s';

-- The login role itself may connect but owns/reads nothing directly.
do $$ begin execute format('grant connect on database %I to tbhf_app', current_database()); end $$;
-- Nobody else creates objects in public (PostgreSQL 15+ default, made explicit).
revoke create on schema public from public;

-- ---------- extensions ----------
create schema if not exists extensions;
create extension if not exists citext   with schema public;      -- profiles.email is public.citext
create extension if not exists pgcrypto with schema extensions;  -- crypt()/gen_salt() for seeding passwords
grant usage on schema extensions to anon, authenticated, service_role;

-- ---------- auth schema (replaces Supabase Auth's tables) ----------
create schema if not exists auth;

create table if not exists auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               public.citext not null unique,
  encrypted_password  text not null,                    -- bcrypt hash, never the password
  email_confirmed_at  timestamptz default now(),
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  raw_app_meta_data   jsonb not null default '{}'::jsonb,
  role                text not null default 'authenticated',
  token_version       integer not null default 0,       -- bumped on password change → old sessions die
  failed_logins       integer not null default 0,
  locked_until        timestamptz,
  last_sign_in_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table auth.users is 'Login accounts for the TBHF website (replaces Supabase Auth). Passwords are bcrypt hashes.';

-- auth.uid(): the signed-in user, set per transaction by the app with
--   select set_config('request.jwt.claim.sub', '<uuid>', true)
-- Same name and meaning as Supabase's, so the 200+ RLS policies are unchanged.
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create or replace function auth.role() returns text
language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to public;
-- Only the server-side service role may read/write login accounts.
revoke all on auth.users from public, anon, authenticated;
grant select, insert, update, delete on auth.users to service_role;
