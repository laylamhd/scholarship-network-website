-- ============================================================
-- phase21_moderators_fix.sql  —  Fix: assigning a moderator didn't save / show.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Symptom: in admin "Advanced settings", picking a member, choosing
-- capabilities and pressing Save did nothing — the new moderator never
-- appeared and no error showed.
--
-- Causes addressed here (one paste covers all of them):
--   (1) phase19 may never have been applied, so the moderators table and the
--       admin_set_moderator() RPC don't exist — the save is a no-op.
--   (2) admin_list_moderators() referenced p.full_name / p.email / p.role::text
--       directly; if anything about that row/cast tripped, the function raised
--       and getModerators() caught it and returned [] — so even a saved
--       moderator wouldn't display. It now reads every field through
--       to_jsonb(p), so a column issue yields null instead of blanking the list.
--
-- This re-creates the table (if missing) and all three moderator RPCs so the
-- deployed copy matches the app no matter what version was there before.
-- ============================================================

-- ---------- moderator grants ----------
create table if not exists public.moderators (
  profile_id   uuid primary key references public.profiles(id) on delete cascade,
  capabilities text[] not null default '{}',
  granted_by   uuid references public.profiles(id) on delete set null,
  granted_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.moderators enable row level security;

drop policy if exists moderators_admin_all on public.moderators;
create policy moderators_admin_all on public.moderators
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists moderators_read_own on public.moderators;
create policy moderators_read_own on public.moderators
  for select to authenticated using (profile_id = auth.uid());

-- ---------- helpers ----------
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators where profile_id = auth.uid());
$$;
grant execute on function public.is_moderator() to authenticated;

create or replace function public.mod_can(p_cap text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (
        select 1 from public.moderators
        where profile_id = auth.uid() and p_cap = any(capabilities)
      );
$$;
grant execute on function public.mod_can(text) to authenticated;

-- ---------- admin RPCs ----------
-- List every moderator with their profile basics + capabilities.
-- Profile fields are read through to_jsonb(p) so a missing column can never
-- make the whole function error (which would blank the moderators list).
create or replace function public.admin_list_moderators()
returns table (
  profile_id uuid, full_name text, email text, role text,
  capabilities text[], granted_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  return query
  select
    m.profile_id,
    j ->> 'full_name'                  as full_name,
    j ->> 'email'                      as email,
    coalesce(j ->> 'role', 'scholar')  as role,
    m.capabilities,
    m.granted_at
  from public.moderators m
  join public.profiles p on p.id = m.profile_id
  cross join lateral (select to_jsonb(p) as j) tj
  order by (j ->> 'full_name') nulls last;
end; $$;
grant execute on function public.admin_list_moderators() to authenticated;

-- Grant / update a moderator's capabilities. An empty (or all-invalid) set
-- removes the grant entirely. Admins can't be made moderators.
create or replace function public.admin_set_moderator(p_target uuid, p_caps text[])
returns void
language plpgsql security definer set search_path = public as $$
declare
  allowed text[] := array['moderate_content','manage_announcements','manage_events_resources','manage_communities'];
  clean   text[];
  trole   text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select (to_jsonb(p) ->> 'role') into trole from public.profiles p where p.id = p_target;
  if trole is null then raise exception 'Member not found'; end if;
  if trole = 'admin' then raise exception 'Admins already have full access'; end if;

  select coalesce(array_agg(c), '{}') into clean from unnest(p_caps) c where c = any(allowed);

  if array_length(clean, 1) is null then
    delete from public.moderators where profile_id = p_target;
    return;
  end if;

  insert into public.moderators (profile_id, capabilities, granted_by, granted_at, updated_at)
  values (p_target, clean, auth.uid(), now(), now())
  on conflict (profile_id) do update
    set capabilities = excluded.capabilities, updated_at = now();
end; $$;
grant execute on function public.admin_set_moderator(uuid, text[]) to authenticated;

create or replace function public.admin_revoke_moderator(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  delete from public.moderators where profile_id = p_target;
end; $$;
grant execute on function public.admin_revoke_moderator(uuid) to authenticated;
