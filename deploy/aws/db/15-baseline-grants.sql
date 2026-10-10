-- 15-baseline-grants.sql  (RDS master user, AFTER schema + data)
-- pg_dump exported the schema without privileges, so first restore the
-- standard baseline a Supabase project gives the three API roles on every
-- object in "public". Row Level Security still decides which ROWS each user
-- may touch. 20-privileges.sql then replays the project's own REVOKE/GRANTs
-- (e.g. no reading profiles.email, no calling verify_admin_code()).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
-- Functions written by the project (skip the ones that belong to extensions).
do $$ declare f record; begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('grant execute on function %s to anon, authenticated, service_role', f.sig);
  end loop;
end $$;
