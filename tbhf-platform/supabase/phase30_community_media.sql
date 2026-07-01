-- ============================================================
-- phase30_community_media.sql  —  Community cover image + logo, on top of phase15.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Adds two optional images to a community:
--   * cover_url — a banner image shown behind the header bar (falls back to the
--                 accent colour when empty).
--   * logo_url  — a logo/photo shown in the header square (falls back to the
--                 first letter of the name when empty).
-- Also creates the public 'community-media' storage bucket for these uploads.
--
-- Depends on: phase15_communities. Requires is_admin() (phase3).
-- ============================================================

-- ---------- Schema ----------
alter table public.communities
  add column if not exists cover_url text,
  add column if not exists logo_url  text;

-- ---------- Storage bucket ----------
insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do nothing;

drop policy if exists community_media_public_read on storage.objects;
create policy community_media_public_read on storage.objects
  for select using (bucket_id = 'community-media');

drop policy if exists community_media_auth_insert on storage.objects;
create policy community_media_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'community-media');

drop policy if exists community_media_auth_update on storage.objects;
create policy community_media_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'community-media');

drop policy if exists community_media_auth_delete on storage.objects;
create policy community_media_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'community-media');

-- ---------- Create a community (now with cover + logo) ----------
drop function if exists public.admin_create_community(text, text, text);
create or replace function public.admin_create_community(
  p_name text, p_description text, p_accent text default null,
  p_cover_url text default null, p_logo_url text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'A name is required'; end if;

  insert into public.communities (name, description, accent, cover_url, logo_url, created_by)
  values (
    btrim(p_name),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_accent), ''),
    nullif(btrim(p_cover_url), ''),
    nullif(btrim(p_logo_url), ''),
    auth.uid()
  )
  returning id into cid;

  return cid;
end;
$$;
grant execute on function public.admin_create_community(text, text, text, text, text) to authenticated;

-- ---------- List communities (include cover + logo) ----------
drop function if exists public.list_communities(text);
create or replace function public.list_communities(p_search text default null)
returns table (
  id           uuid,
  name         text,
  description  text,
  accent       text,
  cover_url    text,
  logo_url     text,
  member_count bigint,
  post_count   bigint,
  is_member    boolean,
  created_at   timestamptz
)
language sql stable security definer set search_path = public as $$
  select
    c.id, c.name, c.description, c.accent, c.cover_url, c.logo_url,
    (select count(*) from public.community_members cm where cm.community_id = c.id) as member_count,
    (select count(*) from public.community_posts cp where cp.community_id = c.id and cp.is_deleted = false) as post_count,
    public.is_community_member(c.id) as is_member,
    c.created_at
  from public.communities c
  where (public.is_admin() or public.is_community_member(c.id))
    and (coalesce(p_search, '') = '' or c.name ilike '%' || p_search || '%' or c.description ilike '%' || p_search || '%')
  order by c.created_at desc;
$$;
grant execute on function public.list_communities(text) to authenticated;

-- ---------- Community detail: surface cover + logo ----------
-- Re-defines get_community from phase29 with cover_url/logo_url added. Keep this
-- file AFTER phase29 when running in order (or just re-run phase29 afterwards —
-- both are idempotent and this one only adds two keys).
create or replace function public.get_community(p_community uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.can_access_community(p_community) then return null; end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'description', c.description,
    'accent', c.accent,
    'cover_url', c.cover_url,
    'logo_url', c.logo_url,
    'created_at', c.created_at,
    'is_admin', public.is_admin(),
    'can_delete', public.is_admin(),
    'can_moderate', public.community_can_moderate(c.id),
    'my_staff', public.community_staff_role(auth.uid()),
    'member_count', (select count(*) from public.community_members cm where cm.community_id = c.id),
    'post_count', (select count(*) from public.community_posts cp where cp.community_id = c.id and cp.is_deleted = false),
    'spotlight', (
      select jsonb_build_object(
        'profile_id', sp.profile_id,
        'full_name', spr.full_name,
        'avatar_url', spr.avatar_url,
        'role', spr.role,
        'note', sp.note
      )
      from public.community_spotlight sp
      join public.profiles spr on spr.id = sp.profile_id
      where sp.community_id = c.id
    ),
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'full_name', pr.full_name,
          'avatar_url', pr.avatar_url,
          'role', pr.role,
          'staff', public.community_staff_role(pr.id),
          'joined_at', m.joined_at
        ) order by m.joined_at asc)
      from public.community_members m
      join public.profiles pr on pr.id = m.profile_id
      where m.community_id = c.id
    ), '[]'::jsonb)
  )
  into result
  from public.communities c
  where c.id = p_community;

  return result;
end; $$;
grant execute on function public.get_community(uuid) to authenticated;
