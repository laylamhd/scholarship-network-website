-- ============================================================
-- phase14_admin_access.sql  —  Secure, code-gated admin registration.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Admin is no longer a public "I am joining as" option. Instead, the
-- unlinked /admin-access page asks for a secret access code. The code is
-- verified server-side before any account is created; after sign-up the new
-- user redeems the same code to elevate their own profile to the admin role.
--
-- The code itself lives in app_secrets, which has RLS enabled and NO policies,
-- so no client can ever read it — only the SECURITY DEFINER functions below
-- (which bypass RLS) can compare against it.
--
-- >>> IMPORTANT: change the default code on the last line of this file. <<<
-- ============================================================

create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);

alter table public.app_secrets enable row level security;
-- No policies on purpose: ordinary clients can neither read nor write this table.

-- ---------- Verify a code (yes/no only — safe for the public signup page) ----------
create or replace function public.verify_admin_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_secrets
    where key = 'admin_access_code'
      and btrim(coalesce(p_code, '')) <> ''
      and value = btrim(p_code)
  );
$$;
-- SECURITY (BUG-004): do NOT expose this as a public true/false oracle. Postgres
-- grants EXECUTE to PUBLIC by default, so revoke it explicitly. Only
-- redeem_admin_access() (SECURITY DEFINER, below) calls it, and that runs as the
-- function owner, so it keeps working without any role-level grant.
revoke execute on function public.verify_admin_code(text) from public;
revoke execute on function public.verify_admin_code(text) from anon;
revoke execute on function public.verify_admin_code(text) from authenticated;

-- ---------- Redeem a code to grant the CALLER the admin role ----------
create or replace function public.redeem_admin_access(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ok boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select public.verify_admin_code(p_code) into ok;
  if not ok then
    return false;
  end if;

  update public.profiles
     set role = 'admin'::user_role,
         updated_at = now()
   where id = auth.uid();

  return true;
end;
$$;
grant execute on function public.redeem_admin_access(text) to authenticated;

-- ---------- Seed a UNIQUE, unguessable admin access code ----------
-- SECURITY (BUG-001): never ship a shared, known default code. A fresh install
-- gets a random 128-bit code so the admin gate is never publicly known even if
-- the owner forgets to rotate it. Re-running this file keeps whatever value is
-- already stored (insert ... do nothing).
--
-- Retrieve the generated code once (owner only, via the SQL editor):
--     select value from public.app_secrets where key = 'admin_access_code';
-- Then store it in a password manager. To rotate later:
--     update public.app_secrets set value = 'your-new-strong-code'
--       where key = 'admin_access_code';
-- Use a high-entropy value (>= 20 random chars). The verify RPC is a boolean
-- oracle with no lockout, so a weak/guessable code can be brute-forced (BUG-004).
insert into public.app_secrets (key, value)
values (
  'admin_access_code',
  -- 128 bits of randomness, hex-encoded (no pgcrypto extension required).
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
)
on conflict (key) do nothing;
