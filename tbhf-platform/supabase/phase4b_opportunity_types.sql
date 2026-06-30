-- ============================================================
-- phase4b_opportunity_types.sql  —  add missing opportunity types.
-- Run in the Supabase SQL Editor. Idempotent (ADD VALUE IF NOT EXISTS).
--
-- components.md lists six opportunity types. These two were missing from
-- the opportunity_type enum, so they had no card on the Career Center.
-- (If your existing labels are spelled differently, tell me and I'll align
-- the card list to match.)
-- ============================================================

alter type public.opportunity_type add value if not exists 'Graduate trainee programs';
alter type public.opportunity_type add value if not exists 'Research assistantships';

-- For reference, the full intended set (others should already exist):
--   Internships, Graduate trainee programs, Research assistantships,
--   Fellowships, Volunteer opportunities, Job vacancies
