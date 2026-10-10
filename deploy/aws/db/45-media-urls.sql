-- 45-media-urls.sql  (RDS master user)
-- Files used to be served by Supabase Storage at
--   https://<ref>.supabase.co/storage/v1/object/public/<bucket>/<path>
-- On AWS they live in our S3 bucket and are served by the app at
--   /media/<bucket>/<path>
-- Rewrite every stored URL to the new, domain-independent form.
do $$
declare c record; n bigint; total bigint := 0;
begin
  for c in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public' and data_type in ('text', 'character varying')
  loop
    execute format(
      $q$update public.%I set %I = regexp_replace(%I,
           'https://[a-z0-9]+\.supabase\.co/storage/v1/object/(public|sign)/', '/media/', 'g')
         where %I like '%%.supabase.co/storage/v1/object/%%'$q$,
      c.table_name, c.column_name, c.column_name, c.column_name);
    get diagnostics n = row_count;
    total := total + n;
  end loop;
  raise notice 'media URLs rewritten in % rows', total;
end $$;
