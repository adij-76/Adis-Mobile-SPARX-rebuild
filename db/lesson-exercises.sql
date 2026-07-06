-- =============================================================================
-- Lesson exercises — the interactive worksheet engine (spec:
-- docs/lesson-exercises-spec.md).
--
-- Two halves, mirroring the assessment battery pattern:
--
--   1. mobile_lesson_exercises (VIEW, read-only) — exercise DEFINITIONS from the
--      legacy Rails engine. A lesson has titled worksheet `profiles`
--      (profiles.lesson_id), each profile has ordered `questions`, and choice
--      questions have `question_options`. One row here = one question attached
--      to a lesson, with its input kind mapped from questions.widget_type.
--
--   2. mobile_exercise_responses (TABLE, app-owned) — the user's answers.
--      RLS by auth.uid(); UPSERT on (auth_uid, question_id) — latest answer
--      wins, saved on step-advance/blur, so a worksheet is resumable from any
--      device. Reconciles into answer_headers/answers at cutover
--      (db/reconcile.sql), same mechanism as the assessment battery.
--
-- widget_type → input_kind map (confirmed against prod — see the spec):
--   14 longtext · 4/0 text · 13 scale (min_value..max_value, options = labels)
--   6 multiselect · 2 select · 7 date · 12 content (read-only rich HTML)
--   5 display (read-only computed — the app hides these for MVP)
--
-- NOTE prompt_html (questions.question_label) is TinyMCE HTML — the app MUST
-- sanitize it before rendering (src/lib/html.ts). prompt_title (questions.title)
-- is a short plain label and the safer default heading.
--
-- Like mobile_lessons, this exposes definitions to any authenticated caller;
-- the app gates locked lessons by mobile_lessons.accessible.
-- Idempotent. Additive-only (see AGENTS.md): never rename/drop a column the
-- deployed app reads — alias across the transition instead.
-- =============================================================================

-- 1) Definitions view -------------------------------------------------------
-- DROP+CREATE (not REPLACE) so column changes never need a migration dance;
-- drops only our own view, never a base table.
drop view if exists public.mobile_lesson_exercises;
create view public.mobile_lesson_exercises as
  select pr.lesson_id,
         pr.id             as profile_id,
         pr.title          as profile_title,
         pr.sort_order     as profile_order,
         q.id              as question_id,
         q.sort_order      as question_order,
         q.widget_type,
         case q.widget_type
           when 14 then 'longtext'
           when 4  then 'text'
           when 13 then 'scale'
           when 6  then 'multiselect'
           when 2  then 'select'
           when 7  then 'date'
           when 12 then 'content'
           when 5  then 'display'
           else 'text'                     -- 0 + unknown/legacy → plain text
         end               as input_kind,
         q.question_label  as prompt_html,
         q.title           as prompt_title,
         q.min_value,
         q.max_value,
         coalesce(q.required, false) as required,
         -- Option labels as an ordered jsonb array (scale endpoint labels /
         -- select + multiselect choices). Aggregated in a lateral so a
         -- question always stays exactly one row.
         coalesce(opts.options, '[]'::jsonb) as options
  from public.profiles pr
  join public.questions q on q.profile_id = pr.id and q.active
  left join lateral (
    select jsonb_agg(qo.value order by qo.sort_order, qo.id) as options
    from public.question_options qo
    where qo.question_id = q.id
  ) opts on true
  where pr.lesson_id is not null
    and pr.active;

grant select on public.mobile_lesson_exercises to authenticated;

-- 2) Responses table (app-owned; preserve on re-import ⚠ — holds user data) --
create table if not exists public.mobile_exercise_responses (
  id          bigint generated always as identity primary key,
  auth_uid    uuid        not null default auth.uid(),
  app_user_id integer,                       -- production users.id (cutover)
  lesson_id   integer     not null,          -- legacy lessons.id
  profile_id  integer     not null,          -- legacy profiles.id (the worksheet)
  question_id integer     not null,          -- legacy questions.id
  value_text  text,                          -- text/longtext/date/select answers
  value_json  jsonb,                         -- scale (number) / multiselect (array)
  answered_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  -- Latest-answer-wins resumability: the app upserts on this key
  -- (PostgREST ?on_conflict=auth_uid,question_id + resolution=merge-duplicates).
  constraint mobile_exercise_responses_uid_question unique (auth_uid, question_id)
);

-- Resume/progress reads are always "my answers for this lesson".
create index if not exists mobile_exercise_responses_uid_lesson
  on public.mobile_exercise_responses (auth_uid, lesson_id);

alter table public.mobile_exercise_responses enable row level security;

drop policy if exists mobile_exercise_responses_select on public.mobile_exercise_responses;
create policy mobile_exercise_responses_select on public.mobile_exercise_responses
  for select to authenticated using (auth_uid = auth.uid());

drop policy if exists mobile_exercise_responses_insert on public.mobile_exercise_responses;
create policy mobile_exercise_responses_insert on public.mobile_exercise_responses
  for insert to authenticated with check (auth_uid = auth.uid());

-- UPDATE is required by the upsert (ON CONFLICT DO UPDATE) — still self-scoped.
drop policy if exists mobile_exercise_responses_update on public.mobile_exercise_responses;
create policy mobile_exercise_responses_update on public.mobile_exercise_responses
  for update to authenticated using (auth_uid = auth.uid()) with check (auth_uid = auth.uid());

grant select, insert, update on public.mobile_exercise_responses to authenticated;

-- =============================================================================
-- VERIFY (optional):
--   select lesson_id, profile_title, count(*) from mobile_lesson_exercises
--   group by 1, 2 order by 1, 2 limit 20;
-- =============================================================================
