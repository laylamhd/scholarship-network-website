-- 41-auth-trigger.sql  (RDS master user)
-- Every new login account gets a profiles row (public.handle_new_user()).
-- The trigger lives on auth.users, so it is not part of the public-schema dump.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
