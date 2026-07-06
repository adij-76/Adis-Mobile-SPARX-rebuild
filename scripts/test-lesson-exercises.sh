#!/usr/bin/env bash
# =============================================================================
# Local Postgres harness for db/lesson-exercises.sql (+ its reconcile block).
#
# The build sandbox can't reach Supabase, so this validates the SQL against a
# throwaway local cluster instead: it stubs the legacy Rails tables (profiles /
# questions / question_options / answer_headers / answers) and Supabase's
# auth.uid(), applies db/lesson-exercises.sql verbatim, then asserts:
#
#   1. view shape — ordering, input_kind mapping, options aggregation, and
#      that inactive profiles/questions and non-lesson profiles are excluded
#   2. responses table — upsert on (auth_uid, question_id) = latest-wins
#   3. RLS — a user can only read/write their own rows
#   4. the reconcile block (extracted from db/reconcile.sql by its markers) —
#      one answer_headers per (user, profile), answers keyed by question_id,
#      idempotent on re-run
#
# Usage: scripts/test-lesson-exercises.sh   (requires postgres + psql on PATH,
# e.g. /usr/lib/postgresql/16/bin). Exits non-zero on any failed assertion.
# =============================================================================
set -euo pipefail

# initdb refuses to run as root — re-exec as the postgres user (containers).
if [ "$(id -u)" = 0 ] && id postgres >/dev/null 2>&1; then
  exec setpriv --reuid=postgres --regid=postgres --clear-groups -- /bin/bash "$0" "$@"
fi

REPO="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb 2>/dev/null || echo /usr/lib/postgresql/16/bin/initdb)")}"
WORK="$(mktemp -d)"
export PGDATA="$WORK/data" PGHOST="$WORK" PGDATABASE=postgres PGUSER=postgres
trap '"$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT

"$PGBIN/initdb" -U postgres --auth=trust >/dev/null
"$PGBIN/pg_ctl" -D "$PGDATA" -o "-k $WORK -c listen_addresses=''" -l "$WORK/pg.log" start >/dev/null

psql -v ON_ERROR_STOP=1 -q <<'SQL'
-- ---- Supabase environment stubs --------------------------------------------
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create schema auth;
-- auth.uid() reads the same GUC PostgREST sets from the JWT.
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema public to anon, authenticated;

-- ---- Legacy Rails engine stubs (shape per docs/lesson-exercises-spec.md) ----
create table public.portions (id serial primary key, program_id integer, title varchar, "order" integer);
create table public.lessons (id serial primary key, portion_id integer, title varchar);
create table public.profiles (
  id serial primary key, lesson_id integer, title varchar,
  sort_order integer, active boolean default true
);
create table public.questions (
  id serial primary key, profile_id integer, title varchar,
  question_label text, widget_type integer, sort_order integer,
  active boolean default true, min_value integer, max_value integer,
  required boolean
);
create table public.question_options (
  id serial primary key, question_id integer, value varchar, sort_order integer
);
create table public.answer_headers (
  id serial primary key, user_id integer, profile_id integer,
  complete boolean, complete_date timestamptz, usage_score numeric,
  updated_at timestamptz
);
create table public.answers (
  id serial primary key, header_id integer, question_id integer,
  answer jsonb, text_answer varchar, created_at timestamptz, updated_at timestamptz
);

-- ---- Seed ------------------------------------------------------------------
insert into public.portions (id, program_id, title, "order") values
  (10, 1, 'Module 1', 1),
  (20, 1, 'Module 2', 2);
insert into public.lessons (id, portion_id, title) values
  (5, 10, 'IGNTD Hero Manifesto'),   -- module 1 → rolled out
  (6, 20, 'Module-2 Lesson');        -- module 2 → NOT rolled out initially
insert into public.profiles (id, lesson_id, title, sort_order, active) values
  (100, 5,    'Hero Manifesto',        2, true),
  (101, 5,    'Personal Power',        1, true),
  (102, 5,    'Old Inactive Sheet',    3, false),   -- excluded: inactive
  (103, null, 'Standalone Assessment', 1, true),    -- excluded: not lesson-attached
  (104, 6,    'Module-2 Sheet',        1, true);    -- excluded until module 2 rolls out
insert into public.questions
  (id, profile_id, title, question_label, widget_type, sort_order, active, min_value, max_value, required) values
  (1, 100, 'Your why',   '<p style="color:red">Why are <b>you</b> here?</p>', 14, 2, true,  null, null, true),
  (2, 100, 'One word',   '<p>One word for today</p>',                          4, 1, true,  null, null, false),
  (3, 100, 'Retired',    '<p>gone</p>',                                       14, 3, false, null, null, null),
  (4, 101, 'Agreement',  '<p>I control my choices</p>',                       13, 1, true,  0,    4,   true),
  (5, 101, 'Supports',   '<p>Pick your supports</p>',                          6, 2, true,  null, null, null),
  (6, 101, 'Intro',      '<table><tr><td>Welcome</td></tr></table>',          12, 0, true,  null, null, null),
  (7, 101, 'AUDIT text', '<p>computed</p>',                                    5, 3, true,  null, null, null),
  (8, 101, 'Legacy',     '<p>old widget</p>',                                  0, 4, true,  null, null, null),
  (9, 104, 'Module 2 Q', '<p>later cohort</p>',                               14, 1, true,  null, null, null);
insert into public.question_options (question_id, value, sort_order) values
  (4, 'Strongly disagree', 1), (4, 'Strongly agree', 2),
  (5, 'Family', 2), (5, 'Friends', 1), (5, 'Coach', 3);
SQL

echo "→ applying db/lesson-exercises.sql"
psql -v ON_ERROR_STOP=1 -q -f "$REPO/db/lesson-exercises.sql"

echo "→ 1) view shape"
psql -v ON_ERROR_STOP=1 -q <<'SQL'
do $$
declare r record; got text;
begin
  -- Rollout seed: only module 1 ("order" = 1) is enabled automatically.
  if (select array_agg(module_id order by module_id) from mobile_exercise_rollout)
       <> array[10] then
    raise exception 'rollout seed should hold exactly module 1 (portion 10)';
  end if;

  -- Exclusions: inactive profile (102), non-lesson profile (103), inactive
  -- question (3), and the not-yet-rolled-out module-2 sheet (104).
  if (select count(*) from mobile_lesson_exercises) <> 7 then
    raise exception 'expected 7 exercise rows, got %', (select count(*) from mobile_lesson_exercises);
  end if;
  if exists (select 1 from mobile_lesson_exercises where profile_id in (102, 103, 104) or question_id = 3) then
    raise exception 'inactive/non-lesson/unrolled rows leaked into the view';
  end if;

  -- Gradual rollout: enabling module 2 is ONE ROW — its exercises appear
  -- immediately; flipping enabled=false hides them again.
  insert into mobile_exercise_rollout (module_id, note) values (20, 'module 2 test');
  if not exists (select 1 from mobile_lesson_exercises where profile_id = 104) then
    raise exception 'enabling module 2 should surface its exercises';
  end if;
  update mobile_exercise_rollout set enabled = false where module_id = 20;
  if exists (select 1 from mobile_lesson_exercises where profile_id = 104) then
    raise exception 'disabling a module should hide its exercises';
  end if;
  delete from mobile_exercise_rollout where module_id = 20;

  -- Ordering keys exposed: profile 101 sorts before 100; question order intact.
  select string_agg(question_id::text, ',' order by profile_order, question_order) into got
  from mobile_lesson_exercises;
  if got <> '6,4,5,7,8,2,1' then
    raise exception 'ordering wrong: %', got;
  end if;

  -- input_kind mapping (incl. widget 0 → text fallback).
  for r in
    select * from (values (1,'longtext'), (2,'text'), (4,'scale'), (5,'multiselect'),
                          (6,'content'), (7,'display'), (8,'text')) v(qid, kind)
  loop
    if (select input_kind from mobile_lesson_exercises where question_id = r.qid) <> r.kind then
      raise exception 'question % expected kind %, got %', r.qid, r.kind,
        (select input_kind from mobile_lesson_exercises where question_id = r.qid);
    end if;
  end loop;

  -- Options aggregate in sort_order; optionless questions get [].
  if (select options from mobile_lesson_exercises where question_id = 5)
       <> '["Friends","Family","Coach"]'::jsonb then
    raise exception 'options misordered: %', (select options from mobile_lesson_exercises where question_id = 5);
  end if;
  if (select options from mobile_lesson_exercises where question_id = 1) <> '[]'::jsonb then
    raise exception 'expected empty options array';
  end if;

  -- Scale bounds + required flag (null required → false).
  if (select (min_value, max_value, required) from mobile_lesson_exercises where question_id = 4)
       is distinct from (0, 4, true) then
    raise exception 'scale bounds/required wrong';
  end if;
  if (select required from mobile_lesson_exercises where question_id = 5) then
    raise exception 'null required should read false';
  end if;
end $$;
SQL

echo "→ 2) upsert = latest answer wins"
psql -v ON_ERROR_STOP=1 -q <<'SQL'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
set role authenticated;
insert into mobile_exercise_responses (lesson_id, profile_id, question_id, value_text, answered_at)
  values (5, 100, 1, 'first draft', now() - interval '1 hour');
insert into mobile_exercise_responses (lesson_id, profile_id, question_id, value_text, answered_at)
  values (5, 100, 1, 'final answer', now())
  on conflict (auth_uid, question_id) do update
  set value_text = excluded.value_text, value_json = excluded.value_json,
      answered_at = excluded.answered_at;
insert into mobile_exercise_responses (lesson_id, profile_id, question_id, value_json)
  values (5, 101, 4, '3'::jsonb);
insert into mobile_exercise_responses (lesson_id, profile_id, question_id, value_json)
  values (5, 101, 5, '["Friends","Coach"]'::jsonb);
reset role;
do $$
begin
  if (select count(*) from mobile_exercise_responses) <> 3 then
    raise exception 'upsert duplicated instead of merging';
  end if;
  if (select value_text from mobile_exercise_responses where question_id = 1) <> 'final answer' then
    raise exception 'latest answer did not win';
  end if;
end $$;
SQL

echo "→ 3) RLS self-scoping"
psql -v ON_ERROR_STOP=1 -q <<'SQL'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
set role authenticated;
do $$
begin
  if (select count(*) from mobile_exercise_responses) <> 0 then
    raise exception 'user B can read user A''s answers';
  end if;
end $$;
insert into mobile_exercise_responses (lesson_id, profile_id, question_id, value_text)
  values (5, 100, 2, 'calm');
do $$
begin
  if (select count(*) from mobile_exercise_responses) <> 1 then
    raise exception 'user B should see exactly their own row';
  end if;
  begin
    insert into mobile_exercise_responses (auth_uid, lesson_id, profile_id, question_id, value_text)
      values ('11111111-1111-1111-1111-111111111111', 5, 100, 2, 'spoof');
    raise exception 'RLS allowed inserting as another user';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;
reset role;
SQL

echo "→ 4) reconcile block (extracted from db/reconcile.sql)"
sed -n '/\[exercise-reconcile:begin\]/,/\[exercise-reconcile:end\]/p' \
  "$REPO/db/reconcile.sql" > "$WORK/reconcile-exercises.sql"
test -s "$WORK/reconcile-exercises.sql" || { echo "reconcile markers missing"; exit 1; }
psql -v ON_ERROR_STOP=1 -q <<'SQL'
-- Link the app users to production ids (what promote-tester/cutover step 0 does).
update mobile_exercise_responses set app_user_id = 900
  where auth_uid = '11111111-1111-1111-1111-111111111111';
-- User B stays unlinked (app_user_id null) → must be skipped by the reconcile.
SQL
psql -v ON_ERROR_STOP=1 -q -f "$WORK/reconcile-exercises.sql"
psql -v ON_ERROR_STOP=1 -q -f "$WORK/reconcile-exercises.sql"   # idempotency re-run
psql -v ON_ERROR_STOP=1 -q <<'SQL'
do $$
begin
  -- User A answered 2 worksheets (profiles 100, 101) → exactly 2 headers, once.
  if (select count(*) from answer_headers) <> 2 then
    raise exception 'expected 2 answer_headers, got % (re-run not idempotent?)',
      (select count(*) from answer_headers);
  end if;
  if exists (select 1 from answer_headers where user_id is null or user_id <> 900) then
    raise exception 'unlinked (app_user_id null) responses leaked into headers';
  end if;
  -- 3 responses → 3 answers, attached to the right headers, values intact.
  if (select count(*) from answers) <> 3 then
    raise exception 'expected 3 answers, got %', (select count(*) from answers);
  end if;
  if (select a.text_answer from answers a join answer_headers h on h.id = a.header_id
      where a.question_id = 1 and h.profile_id = 100) <> 'final answer' then
    raise exception 'text answer lost in reconcile';
  end if;
  if (select a.answer from answers a where a.question_id = 5) <> '["Friends","Coach"]'::jsonb then
    raise exception 'json answer lost in reconcile';
  end if;
  if (select complete_date from answer_headers where profile_id = 100)
       <> (select max(answered_at) from mobile_exercise_responses
           where profile_id = 100 and app_user_id = 900) then
    raise exception 'header complete_date should be the take''s last answered_at';
  end if;
end $$;
SQL

echo "✓ all lesson-exercise SQL checks passed"
