-- phase18_dashboard.sql
-- Cross-device sync for the student/alumni customizable dashboard.
-- Stores each user's widget layout (order, size, view, accent colour,
-- transparency) as JSON on their own profile row.
--
-- RLS already covers this: profiles_update allows auth.uid() = id, and
-- profiles_select returns the owner's own row, so the app reads/writes
-- dashboard_layout directly with the user's session — no extra policy needed.

alter table public.profiles
  add column if not exists dashboard_layout jsonb;
