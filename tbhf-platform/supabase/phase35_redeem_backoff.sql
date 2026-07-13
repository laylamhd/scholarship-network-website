-- ============================================================
-- phase35_redeem_backoff.sql  —  R3-02: exponential backoff on admin-code redeem.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Round-3 assessment finding R3-02 (SECURITY_ASSESSMENT_R3.md): the auth/abuse
-- surfaces lacked rate limiting. Login/signup throttling + CAPTCHA are Supabase
-- Auth dashboard settings; this file covers the one custom SQL brute-force
-- surface — redeem_admin_access(text).
--
-- phase34 already added a per-account lockout (5 wrong codes -> 15-minute lock).
-- This SUPERSEDES that function to add EXPONENTIAL BACKOFF: each time the same
-- account hits the lockout ceiling again, the lock doubles (15m, 30m, 1h, 2h …
-- capped at 24h). So a single account can't be hammered by simply waiting out a
-- fixed 15-minute window. It stays strictly PER-ACCOUNT — no global counter —
-- so it can never lock a legitimate new admin out of onboarding (a real admin
-- has the correct code and never accrues failures). Combined with the 128-bit
-- random code (BUG-001) and email-confirmation friction on new accounts, the
-- redeem path is not a practical brute-force target.
-- ============================================================

-- ---------- 1) Track how many times each account has hit the ceiling ----------
-- Drives the backoff multiplier. Persists across fail-windows (unlike `fails`,
-- which resets) until a long quiet period forgets it (see c_reset below).
alter table public.admin_access_attempts
  add column if not exists lock_count int not null default 0;

-- ---------- 2) Redeem with per-account exponential backoff ----------
create or replace function public.redeem_admin_access(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_ok       boolean;
  a          public.admin_access_attempts%rowtype;
  v_fails    int;
  v_locks    int;
  v_mult     int;
  v_lock_for interval;
  c_max      constant int      := 5;                 -- wrong codes before a lock
  c_window   constant interval := interval '15 minutes'; -- active fail-count window
  c_base     constant interval := interval '15 minutes'; -- first lock duration
  c_reset    constant interval := interval '24 hours';   -- quiet period that forgets lock_count
  c_maxmult  constant int      := 96;                -- 96 * 15m = 24h ceiling
begin
  if v_uid is null then
    return false;
  end if;

  select * into a from public.admin_access_attempts where profile_id = v_uid;

  -- Already locked out -> reject. No write on this path, so the RAISE (which
  -- rolls back the whole PostgREST txn) discards nothing important — the lock was
  -- persisted by the earlier call that set it.
  if a.profile_id is not null
     and a.locked_until is not null
     and a.locked_until > now() then
    raise exception 'Too many attempts. Try again later.' using errcode = 'P0001';
  end if;

  -- Decide the working failure count and backoff level:
  --   * no record, or fully quiet for c_reset -> start clean (fails 0, locks 0)
  --   * fail-window elapsed but within c_reset -> fails reset, but lock_count is
  --     retained so the NEXT lock is still longer (that's the backoff)
  --   * inside the active window -> carry both forward
  if a.profile_id is null or a.window_start < now() - c_reset then
    v_fails := 0;
    v_locks := 0;
  elsif a.window_start < now() - c_window then
    v_fails := 0;
    v_locks := a.lock_count;
  else
    v_fails := a.fails;
    v_locks := a.lock_count;
  end if;

  select public.verify_admin_code(p_code) into v_ok;

  if not v_ok then
    v_fails := v_fails + 1;

    if v_fails >= c_max then
      -- Hit the ceiling: escalate. lock_count grows, lock duration doubles
      -- (capped at 24h). Reset the fail counter so the next window starts fresh
      -- at the higher backoff level.
      v_locks := v_locks + 1;
      v_mult  := least((2 ^ (v_locks - 1))::int, c_maxmult);
      v_lock_for := c_base * v_mult;
      insert into public.admin_access_attempts
        (profile_id, fails, window_start, locked_until, lock_count)
        values (v_uid, 0, now(), now() + v_lock_for, v_locks)
      on conflict (profile_id) do update
        set fails        = 0,
            window_start = now(),
            locked_until = excluded.locked_until,
            lock_count   = excluded.lock_count;
    else
      insert into public.admin_access_attempts
        (profile_id, fails, window_start, locked_until, lock_count)
        values (v_uid, v_fails, now(), null, v_locks)
      on conflict (profile_id) do update
        set fails        = excluded.fails,
            window_start = now(),
            locked_until = null,
            lock_count   = excluded.lock_count;
    end if;
    return false;  -- commits the counter/lock
  end if;

  -- Correct code: grant admin and clear the attempt record entirely.
  update public.profiles
     set role = 'admin'::user_role, updated_at = now()
   where id = v_uid;
  delete from public.admin_access_attempts where profile_id = v_uid;
  return true;
end;
$$;

-- ---------- 3) EXECUTE grants (unchanged from phase34; re-asserted) ----------
revoke execute on function public.redeem_admin_access(text) from public;
revoke execute on function public.redeem_admin_access(text) from anon;
grant  execute on function public.redeem_admin_access(text) to authenticated;
