-- ============================================================
-- phase19_moderators.sql  —  Phase 19: Moderators & admin assignment.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Powers the admin "Advanced settings" tab. A moderator is a GRANT layered
-- on top of an existing scholar/alumni profile (their role enum is untouched):
-- the admin picks exactly which capabilities each moderator holds. Assigning
-- other admins reuses the existing admin_set_role() RPC (phase12).
--
-- Depends on: profiles, user_role enum, is_admin() (phase3).
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

-- Admins manage every grant.
drop policy if exists moderators_admin_all on public.moderators;
create policy moderators_admin_all on public.moderators
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- A moderator may read their own grant (so the app can check their capabilities).
drop policy if exists moderators_read_own on public.moderators;
create policy moderators_read_own on public.moderators
  for select to authenticated using (profile_id = auth.uid());

-- ---------- helpers ----------
create or replace function public.is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.moderators where profile_id = auth.uid());
$$;
grant execute on function public.is_moderator() to authenticated;

-- True if the caller is an admin, or a moderator holding the named capability.
-- Use this in future RLS / RPCs to let moderators act in their granted areas.
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
create or replace function public.admin_list_moderators()
returns table (
  profile_id uuid, full_name text, email text, role text,
  capabilities text[], granted_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  -- Profile fields read via to_jsonb(p) so a missing column can't error the
  -- whole function (which getModerators() would catch and turn into an empty
  -- list, hiding moderators that were actually saved).
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
-- removes the grant entirely. Admins can't be made moderators (they already
-- have full access). Unknown capability keys are silently dropped.
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
