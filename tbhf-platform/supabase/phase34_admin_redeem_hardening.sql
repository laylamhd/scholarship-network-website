-- ============================================================
-- phase34_admin_redeem_hardening.sql  —  Harden redeem_admin_access().
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- PENTEST FINDING PT3-05: redeem_admin_access(text) was EXECUTE-granted to anon
-- (it returned a harmless `false` because auth.uid() is null) and, for any
-- authenticated user, was an UNTHROTTLED boolean oracle for the admin access
-- code — the same class of issue that BUG-004 fixed for verify_admin_code().
-- It is only saved today by the 128-bit random code (BUG-001). This adds
-- defense in depth: (1) remove anon's ability to call it at all, and (2) add a
-- per-user attempt lockout so the redeem path can't be hammered.
-- ============================================================

-- ---------- 1) Attempt-tracking table (definer-only, like app_secrets) ----------
create table if not exists public.admin_access_attempts (
  profile_id   uuid primary key references public.profiles(id) on delete cascade,
  fails        int         not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.admin_access_attempts enable row level security;
-- No policies on purpose: only the SECURITY DEFINER function below (which runs as
-- the owner and bypasses RLS) ever reads or writes this table.

-- ---------- 2) Redeem with lockout ----------
-- Tuning: 5 wrong codes lock the caller out of the redeem path for 15 minutes;
-- the window resets after 15 minutes of no failed attempts. A correct code
-- always clears the record.
--
-- IMPORTANT: a raised exception rolls back the whole RPC transaction (PostgREST
-- runs each call in one txn), which would discard the very row that records the
-- failure/lock. So we only RAISE when the caller is ALREADY locked (nothing to
-- persist on that path); the call that reaches the ceiling COMMITS the lock and
-- returns false. Net effect: N wrong -> false, then locked -> error.
create or replace function public.redeem_admin_access(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_ok     boolean;
  a        public.admin_access_attempts%rowtype;
  v_fails  int;
  c_max    constant int      := 5;
  c_window constant interval := interval '15 minutes';
begin
  if v_uid is null then
    return false;
  end if;

  select * into a from public.admin_access_attempts where profile_id = v_uid;

  -- Already locked out -> reject (no write here, so the RAISE rolls back nothing
  -- important; the lock was persisted by the earlier call that set it).
  if a.profile_id is not null
     and a.locked_until is not null
     and a.locked_until > now() then
    raise exception 'Too many attempts. Try again later.' using errcode = 'P0001';
  end if;

  -- Current failure count in the active window (reset after inactivity).
  if a.profile_id is null or a.window_start < now() - c_window then
    v_fails := 0;
  else
    v_fails := a.fails;
  end if;

  select public.verify_admin_code(p_code) into v_ok;

  if not v_ok then
    v_fails := v_fails + 1;
    insert into public.admin_access_attempts (profile_id, fails, window_start, locked_until)
      values (
        v_uid, v_fails, now(),
        case when v_fails >= c_max then now() + c_window else null end
      )
    on conflict (profile_id) do update
      set fails        = excluded.fails,
          window_start = excluded.window_start,
          locked_until = excluded.locked_until;
    return false;  -- commits the counter/lock
  end if;

  -- Correct code: grant admin and clear the attempt record.
  update public.profiles
     set role = 'admin'::user_role, updated_at = now()
   where id = v_uid;
  delete from public.admin_access_attempts where profile_id = v_uid;
  return true;
end;
$$;

-- ---------- 3) Lock down EXECUTE (defense in depth) ----------
-- anon has no legitimate use for this (it can never elevate); only signed-in
-- members redeem. Postgres grants EXECUTE to PUBLIC by default, so revoke it.
revoke execute on function public.redeem_admin_access(text) from public;
revoke execute on function public.redeem_admin_access(text) from anon;
grant  execute on function public.redeem_admin_access(text) to authenticated;
