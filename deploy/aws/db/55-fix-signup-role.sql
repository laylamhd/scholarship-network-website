-- 55-fix-signup-role.sql  (run as the RDS master user) — SECURITY FIX
-- The exported handle_new_user() trusts the "role" field that the CLIENT puts
-- in sign-up metadata, and it accepts 'admin'. Anyone holding the public anon
-- key can therefore call  POST /auth/v1/signup  with  {"data":{"role":"admin"}}
-- and become an administrator without the admin access code.
-- Fix: sign-up may only create 'scholar' or 'alumni'. Admins are still created
-- the intended way — redeem_admin_access() with the access code.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare
  r text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, email, full_name, country, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New Scholar'),
    new.raw_user_meta_data ->> 'country',
    case when r in ('scholar', 'alumni') then r::user_role else 'scholar' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
