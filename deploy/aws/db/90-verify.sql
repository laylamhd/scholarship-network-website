-- 90-verify.sql — sanity checks after an import or restore (read-only).
\echo '--- Row counts ---'
select 'auth.users' as t, count(*) from auth.users
union all select 'profiles', count(*) from public.profiles
union all select 'communities', count(*) from public.communities
union all select 'community_posts', count(*) from public.community_posts
union all select 'messages', count(*) from public.messages
union all select 'events', count(*) from public.events
union all select 'stories', count(*) from public.stories
union all select 'member_notifications', count(*) from public.member_notifications
order by 1;

\echo '--- Security checks: every row must say PASS ---'
select 'every profile has a login account' as check,
       case when exists (select 1 from public.profiles p where not exists (select 1 from auth.users u where u.id = p.id)) then 'FAIL' else 'PASS' end as result
union all
select 'website login (tbhf_app) has no direct table access',
       case when has_table_privilege('tbhf_app', 'public.profiles', 'select') then 'FAIL' else 'PASS' end
union all
select 'signed-in members cannot read login accounts',
       case when has_table_privilege('authenticated', 'auth.users', 'select') then 'FAIL' else 'PASS' end
union all
select 'anon cannot read profiles.email',
       case when has_column_privilege('anon', 'public.profiles', 'email', 'select') then 'FAIL' else 'PASS' end
union all
select 'authenticated cannot read profiles.email',
       case when has_column_privilege('authenticated', 'public.profiles', 'email', 'select') then 'FAIL' else 'PASS' end
union all
select 'authenticated cannot call verify_admin_code()',
       case when has_function_privilege('authenticated', 'public.verify_admin_code(text)', 'execute') then 'FAIL' else 'PASS' end
union all
select 'anon cannot call redeem_admin_access()',
       case when has_function_privilege('anon', 'public.redeem_admin_access(text)', 'execute') then 'FAIL' else 'PASS' end
union all
select 'RLS enabled on every public table',
       case when exists (select 1 from pg_tables where schemaname = 'public' and not rowsecurity) then 'FAIL' else 'PASS' end
union all
select 'sign-up cannot self-assign the admin role',
       case when pg_get_functiondef('public.handle_new_user()'::regprocedure) like '%(''scholar'', ''alumni'', ''admin'')%' then 'FAIL' else 'PASS' end
union all
select 'signup trigger present on auth.users',
       case when exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass) then 'PASS' else 'FAIL' end
union all
select 'no row still points at Supabase Storage',
       case when exists (select 1 from public.profiles where avatar_url like '%supabase.co%')
              or exists (select 1 from public.events where cover_image_url like '%supabase.co%')
              or exists (select 1 from public.stories where cover_image_url like '%supabase.co%') then 'FAIL' else 'PASS' end
union all
select 'admin access code is set',
       case when (select length(value) from public.app_secrets where key = 'admin_access_code') >= 16 then 'PASS' else 'FAIL' end;
