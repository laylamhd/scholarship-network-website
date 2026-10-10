-- 50-rotate-admin-code.sql  (run as the RDS master user)
-- The exported data contains the LIVE admin access code. Never reuse a
-- production secret in a lab copy: replace it with a new one passed in as
-- the psql variable :admin_code.
update public.app_secrets set value = :'admin_code' where key = 'admin_access_code';
delete from public.admin_access_attempts;
