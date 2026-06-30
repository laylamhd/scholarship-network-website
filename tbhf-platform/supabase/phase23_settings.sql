-- Phase 23 — Settings: per-member notification preferences
--
-- Stores which categories of notifications a member wants to receive, as a
-- JSONB map of { category_key: boolean }. Missing keys default to "on" in the
-- application layer (see app/(app)/settings/prefs.ts). Enforcement at the point
-- notifications are created is a follow-up; this migration only persists the
-- member's stated preferences.
--
-- Safe to run multiple times.

alter table public.profiles
  add column if not exists notification_prefs jsonb not null default '{}'::jsonb;

-- No new RLS needed: the existing profiles_update policy already lets a member
-- update their own row (auth.uid() = id), which covers this column.
