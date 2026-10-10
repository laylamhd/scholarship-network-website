-- 40-seed-users.sql  (RDS master user; ORIGINAL import only)
-- The Supabase export contains public.profiles but not the login accounts
-- (Supabase keeps those in its private "auth" schema and never exports the
-- password hashes). We create one login per profile with the SAME user id,
-- so every foreign key in the data still lines up. Everyone gets the lab
-- password passed in as  -v seed_password=...  (bcrypt, cost 10).
insert into auth.users (id, email, encrypted_password, email_confirmed_at,
                        raw_user_meta_data, created_at, updated_at)
select p.id,
       lower(p.email::text),
       extensions.crypt(:'seed_password', extensions.gen_salt('bf', 10)),
       now(),
       jsonb_build_object('full_name', p.full_name, 'role', p.role::text),
       p.created_at, now()
from public.profiles p
on conflict (id) do nothing;
