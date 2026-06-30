-- ============================================================
-- phase11_alumni.sql  —  Phase 11: Alumni Network.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Turns the scholarship roster into a lifelong community. The alumni
-- DIRECTORY and CAREER TRACKING are read from the existing profiles +
-- alumni_details tables (no new tables needed for those). What's new
-- here is "giving back": alumni publish concrete ways they want to help
-- current scholars — mentorship, speaking, internship/job referrals, CV
-- reviews, industry insights, networking intros — and scholars express
-- interest with one click, then connect via direct messages.
--
-- Requires is_admin() (phase3_resources.sql).
--
-- NOTE: if your database already has alumni/offer tables with a different
-- shape, tell me and I'll adapt (like we did for `events`).
-- ============================================================

create table if not exists public.alumni_offers (
  id          uuid primary key default gen_random_uuid(),
  alumni_id   uuid not null references public.profiles(id) on delete cascade,
  kind        text not null default 'Giving back'
              check (kind in (
                'Mentorship', 'Speaking', 'Internship/Job referral',
                'CV & interview review', 'Industry insights',
                'Networking intro', 'Giving back', 'Other')),
  title       text not null,
  details     text,
  is_open     boolean not null default true,   -- accepting interest / still available
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists alumni_offers_alumni_idx on public.alumni_offers (alumni_id);
create index if not exists alumni_offers_kind_idx on public.alumni_offers (kind);
create index if not exists alumni_offers_created_idx on public.alumni_offers (created_at desc);

-- One-click "I'm interested" from a scholar.
create table if not exists public.alumni_offer_interests (
  offer_id   uuid not null references public.alumni_offers(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (offer_id, profile_id)
);
create index if not exists alumni_offer_interests_offer_idx on public.alumni_offer_interests (offer_id);

-- ---------- RLS: alumni_offers (read all; alumni author / admin manage) ----------
alter table public.alumni_offers enable row level security;

drop policy if exists alumni_offers_select on public.alumni_offers;
create policy alumni_offers_select on public.alumni_offers
  for select to authenticated using (true);

-- Only alumni (or admins) may publish, and only as themselves.
drop policy if exists alumni_offers_insert on public.alumni_offers;
create policy alumni_offers_insert on public.alumni_offers
  for insert to authenticated with check (
    alumni_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('alumni', 'admin')
    )
  );

drop policy if exists alumni_offers_update on public.alumni_offers;
create policy alumni_offers_update on public.alumni_offers
  for update to authenticated
  using (alumni_id = auth.uid() or public.is_admin())
  with check (alumni_id = auth.uid() or public.is_admin());

drop policy if exists alumni_offers_delete on public.alumni_offers;
create policy alumni_offers_delete on public.alumni_offers
  for delete to authenticated using (alumni_id = auth.uid() or public.is_admin());

-- ---------- RLS: alumni_offer_interests (visible to all; manage your own) ----------
alter table public.alumni_offer_interests enable row level security;

drop policy if exists alumni_offer_interests_select on public.alumni_offer_interests;
create policy alumni_offer_interests_select on public.alumni_offer_interests
  for select to authenticated using (true);

drop policy if exists alumni_offer_interests_insert on public.alumni_offer_interests;
create policy alumni_offer_interests_insert on public.alumni_offer_interests
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists alumni_offer_interests_delete on public.alumni_offer_interests;
create policy alumni_offer_interests_delete on public.alumni_offer_interests
  for delete to authenticated using (profile_id = auth.uid());
