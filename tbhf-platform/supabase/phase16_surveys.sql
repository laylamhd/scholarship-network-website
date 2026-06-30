-- ============================================================
-- phase16_surveys.sql  —  Surveys section (data collection).
-- Run in the Supabase SQL Editor. Idempotent (safe to re-run).
--
-- Any member creates a survey with questions (short text, paragraph,
-- single choice, multiple choice, 1-5 rating). Other members respond once.
-- Responses are ANONYMOUS: no respondent identity is exposed. The owner
-- (and admins) can read every individual answer row but never who wrote it.
--
-- Requires is_admin() (phase3_resources.sql).
-- ============================================================

-- ---------- tables ----------
create table if not exists public.surveys (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  is_open     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists surveys_author_idx on public.surveys (author_id);
create index if not exists surveys_created_idx on public.surveys (created_at desc);

create table if not exists public.survey_questions (
  id         uuid primary key default gen_random_uuid(),
  survey_id  uuid not null references public.surveys(id) on delete cascade,
  position   integer not null default 0,
  prompt     text not null,
  qtype      text not null default 'short_text'
             check (qtype in ('short_text', 'paragraph', 'single_choice', 'multi_choice', 'rating')),
  options    jsonb not null default '[]'::jsonb,   -- string[] for choice types
  required   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists survey_questions_survey_idx on public.survey_questions (survey_id, position);

-- One anonymous response per member per survey. respondent_id is used ONLY
-- to enforce one-response-per-member and is never surfaced to the owner.
create table if not exists public.survey_responses (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid not null references public.surveys(id) on delete cascade,
  respondent_id uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  unique (survey_id, respondent_id)
);
create index if not exists survey_responses_survey_idx on public.survey_responses (survey_id);

create table if not exists public.survey_answers (
  id          uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  value       jsonb,   -- string | number | string[] depending on question type
  unique (response_id, question_id)
);
create index if not exists survey_answers_response_idx on public.survey_answers (response_id);

-- ---------- RLS: surveys (read all; author/admin manage) ----------
alter table public.surveys enable row level security;

drop policy if exists surveys_select on public.surveys;
create policy surveys_select on public.surveys
  for select to authenticated using (true);

drop policy if exists surveys_insert on public.surveys;
create policy surveys_insert on public.surveys
  for insert to authenticated with check (author_id = auth.uid());

drop policy if exists surveys_update on public.surveys;
create policy surveys_update on public.surveys
  for update to authenticated using (author_id = auth.uid() or public.is_admin()) with check (author_id = auth.uid() or public.is_admin());

drop policy if exists surveys_delete on public.surveys;
create policy surveys_delete on public.surveys
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- ---------- RLS: survey_questions (read all; manage if you own the survey) ----------
alter table public.survey_questions enable row level security;

drop policy if exists survey_questions_select on public.survey_questions;
create policy survey_questions_select on public.survey_questions
  for select to authenticated using (true);

drop policy if exists survey_questions_insert on public.survey_questions;
create policy survey_questions_insert on public.survey_questions
  for insert to authenticated
  with check (exists (select 1 from public.surveys s where s.id = survey_id and (s.author_id = auth.uid() or public.is_admin())));

drop policy if exists survey_questions_update on public.survey_questions;
create policy survey_questions_update on public.survey_questions
  for update to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id and (s.author_id = auth.uid() or public.is_admin())));

drop policy if exists survey_questions_delete on public.survey_questions;
create policy survey_questions_delete on public.survey_questions
  for delete to authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id and (s.author_id = auth.uid() or public.is_admin())));

-- ---------- RLS: responses & answers ----------
-- Inserts go exclusively through submit_survey_response() (SECURITY DEFINER),
-- so no insert policy is granted here. Members may read ONLY their own rows
-- (used to detect "already responded"); the owner reads aggregate/raw data
-- through get_survey_results() instead — preserving anonymity.
alter table public.survey_responses enable row level security;

drop policy if exists survey_responses_select_own on public.survey_responses;
create policy survey_responses_select_own on public.survey_responses
  for select to authenticated using (respondent_id = auth.uid());

alter table public.survey_answers enable row level security;

drop policy if exists survey_answers_select_own on public.survey_answers;
create policy survey_answers_select_own on public.survey_answers
  for select to authenticated
  using (exists (select 1 from public.survey_responses r where r.id = response_id and r.respondent_id = auth.uid()));

-- ---------- RPC: overview list for the /surveys page ----------
create or replace function public.get_surveys_overview()
returns table (
  id uuid, title text, description text, is_open boolean, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text,
  question_count integer, response_count bigint, i_responded boolean
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.title, s.description, s.is_open, s.created_at,
         s.author_id, p.full_name, p.avatar_url,
         (select count(*)::int from public.survey_questions q where q.survey_id = s.id),
         (select count(*) from public.survey_responses r where r.survey_id = s.id),
         exists (select 1 from public.survey_responses r2 where r2.survey_id = s.id and r2.respondent_id = auth.uid())
  from public.surveys s
  join public.profiles p on p.id = s.author_id
  order by s.created_at desc;
$$;
grant execute on function public.get_surveys_overview() to authenticated;

-- ---------- RPC: submit one anonymous response ----------
create or replace function public.submit_survey_response(p_survey_id uuid, p_answers jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_open        boolean;
  v_response_id uuid;
  v_item        jsonb;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;

  select is_open into v_open from public.surveys where id = p_survey_id;
  if v_open is null then raise exception 'Survey not found'; end if;
  if not v_open then raise exception 'This survey is closed'; end if;
  if exists (select 1 from public.survey_responses where survey_id = p_survey_id and respondent_id = v_uid) then
    raise exception 'You have already responded to this survey';
  end if;

  insert into public.survey_responses (survey_id, respondent_id)
  values (p_survey_id, v_uid)
  returning id into v_response_id;

  for v_item in select * from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb))
  loop
    insert into public.survey_answers (response_id, question_id, value)
    values (v_response_id, (v_item->>'question_id')::uuid, v_item->'value');
  end loop;

  return v_response_id;
end;
$$;
grant execute on function public.submit_survey_response(uuid, jsonb) to authenticated;

-- ---------- RPC: results for the owner / admins ----------
create or replace function public.get_survey_results(p_survey_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_result jsonb;
begin
  select author_id into v_author from public.surveys where id = p_survey_id;
  if v_author is null then return null; end if;
  if auth.uid() <> v_author and not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'survey', (
      select jsonb_build_object('id', s.id, 'title', s.title, 'description', s.description,
                                'is_open', s.is_open, 'created_at', s.created_at)
      from public.surveys s where s.id = p_survey_id
    ),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', q.id, 'prompt', q.prompt, 'qtype', q.qtype,
               'options', q.options, 'required', q.required, 'position', q.position
             ) order by q.position, q.created_at)
      from public.survey_questions q where q.survey_id = p_survey_id
    ), '[]'::jsonb),
    'response_count', (select count(*) from public.survey_responses r where r.survey_id = p_survey_id),
    'responses', coalesce((
      select jsonb_agg(sub.resp order by sub.resp_created)
      from (
        select r.created_at as resp_created,
               jsonb_build_object(
                 'submitted_at', r.created_at,
                 'answers', coalesce((
                   select jsonb_object_agg(a.question_id::text, a.value)
                   from public.survey_answers a where a.response_id = r.id
                 ), '{}'::jsonb)
               ) as resp
        from public.survey_responses r
        where r.survey_id = p_survey_id
      ) sub
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
grant execute on function public.get_survey_results(uuid) to authenticated;
