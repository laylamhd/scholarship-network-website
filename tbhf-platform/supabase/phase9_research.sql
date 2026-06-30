-- ============================================================
-- phase9_research.sql  —  Phase 9: Research & Innovation Hub.
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Member-driven: scholars/alumni publish research summaries, innovation
-- ideas, datasets and research opportunities, and can flag a post as
-- "seeking collaborators". Others express interest with one click and the
-- author reaches out via direct messages.
-- Requires is_admin() (phase3_resources.sql). Bucket: research.
--
-- NOTE: if your database already has research-related tables with a
-- different shape, tell me and I'll adapt (like we did for `events`).
-- ============================================================

create table if not exists public.research_posts (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null references public.profiles(id) on delete cascade,
  title                 text not null,
  kind                  text not null default 'Research summary'
                        check (kind in ('Research summary', 'Innovation idea', 'Dataset', 'Opportunity')),
  field                 text,            -- discipline / topic, e.g. "Public health"
  summary               text not null,   -- abstract / description
  link_url              text,            -- external paper / dataset / competition link
  file_url              text,            -- uploaded file (PDF / dataset) in the 'research' bucket
  seeking_collaborators boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists research_posts_author_idx on public.research_posts (author_id);
create index if not exists research_posts_kind_idx on public.research_posts (kind);
create index if not exists research_posts_created_idx on public.research_posts (created_at desc);

-- One-click "I'd like to collaborate" interest.
create table if not exists public.research_collaborators (
  post_id    uuid not null references public.research_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
create index if not exists research_collaborators_post_idx on public.research_collaborators (post_id);

-- ---------- RLS: research_posts (read all; author/admin manage) ----------
alter table public.research_posts enable row level security;

drop policy if exists research_posts_select on public.research_posts;
create policy research_posts_select on public.research_posts
  for select to authenticated using (true);

drop policy if exists research_posts_insert on public.research_posts;
create policy research_posts_insert on public.research_posts
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists research_posts_update on public.research_posts;
create policy research_posts_update on public.research_posts
  for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());

drop policy if exists research_posts_delete on public.research_posts;
create policy research_posts_delete on public.research_posts
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- ---------- RLS: research_collaborators (visible to all; manage your own) ----------
alter table public.research_collaborators enable row level security;

drop policy if exists research_collaborators_select on public.research_collaborators;
create policy research_collaborators_select on public.research_collaborators
  for select to authenticated using (true);

drop policy if exists research_collaborators_insert on public.research_collaborators;
create policy research_collaborators_insert on public.research_collaborators
  for insert to authenticated with check (profile_id = auth.uid());

drop policy if exists research_collaborators_delete on public.research_collaborators;
create policy research_collaborators_delete on public.research_collaborators
  for delete to authenticated using (profile_id = auth.uid());

-- ---------- storage bucket for research files / datasets ----------
insert into storage.buckets (id, name, public)
values ('research', 'research', true)
on conflict (id) do nothing;

drop policy if exists research_public_read on storage.objects;
create policy research_public_read on storage.objects
  for select using (bucket_id = 'research');

drop policy if exists research_auth_insert on storage.objects;
create policy research_auth_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'research');

drop policy if exists research_auth_update on storage.objects;
create policy research_auth_update on storage.objects
  for update to authenticated using (bucket_id = 'research');

drop policy if exists research_auth_delete on storage.objects;
create policy research_auth_delete on storage.objects
  for delete to authenticated using (bucket_id = 'research');
