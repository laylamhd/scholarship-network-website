-- Phase 26 — Scheduled event reminders (pg_cron)
--
-- Adds the one piece phase25 couldn't do with triggers: a time-based reminder
-- for events a member has RSVP'd to. An hourly pg_cron job sweeps for approved
-- events starting within the next 24 hours and sends each registrant a single
-- 'event_reminder' notification (category 'events', so the member's preference
-- is still honoured via notify_member).
--
-- Depends on: phase24 (notify_member), phase8_events, phase13 (review_status).
-- Safe to run multiple times.
--
-- NOTE: pg_cron must be enabled on the project. The CREATE EXTENSION below
-- usually works from the Supabase SQL editor; if it errors on permissions,
-- enable "pg_cron" once via Dashboard → Database → Extensions, then re-run.

create extension if not exists pg_cron;

-- ---------- the sweep ----------
-- Reminds every member who is "going"/"interested" exactly once per event:
-- the de-dup check skips anyone who already has an event_reminder for it.
create or replace function public.sweep_event_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare r record; n integer := 0;
begin
  for r in
    select e.id as event_id, e.title, e.start_at, rs.profile_id
    from public.events e
    join public.event_rsvps rs on rs.event_id = e.id
    where e.review_status = 'approved'
      and coalesce(e.status, '') not in ('cancelled', 'canceled', 'draft')
      and e.start_at is not null
      and e.start_at >= now()
      and e.start_at <= now() + interval '24 hours'
      and rs.status in ('going', 'interested')
      and not exists (
        select 1 from public.member_notifications mn
        where mn.user_id = rs.profile_id
          and mn.type = 'event_reminder'
          and mn.entity_id = e.id
      )
  loop
    perform public.notify_member(
      r.profile_id, 'events', 'event_reminder',
      'Upcoming: ' || coalesce(r.title, 'an event'),
      '"' || coalesce(r.title, 'An event') || '" is coming up on '
        || to_char(r.start_at, 'Mon DD, HH24:MI') || ' UTC.',
      'events', r.event_id
    );
    n := n + 1;
  end loop;
  return n;
end; $$;

-- Internal only — invoked by the cron job (runs as the scheduling role), not by members.
revoke all on function public.sweep_event_reminders() from public;

-- ---------- schedule it hourly (idempotent) ----------
do $$
begin
  perform cron.unschedule('event-reminders');
exception when others then
  null; -- no existing job named 'event-reminders' yet
end $$;

select cron.schedule('event-reminders', '0 * * * *', $$ select public.sweep_event_reminders(); $$);
