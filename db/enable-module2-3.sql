-- =============================================================================
-- Enable lesson exercises for Modules 2 + 3 (gradual rollout step).
--
--   Module 2 = portions.id 3, "Your Path, Your Story"  (5 lessons,  77 questions)
--   Module 3 = portions.id 4, "Understanding Here"     (8 lessons, 323 questions)
--
-- ⚠ Dispatch ONLY AFTER the labeled-scale app build is live on main — the gate
-- flips instantly against the deployed build (AGENTS.md lock-step rule).
-- Idempotent (on conflict do nothing). NOT in apply-order.txt — run via the
-- apply-migrations workflow's `file` input, like the content fixes.
-- =============================================================================

\t on
\pset format unaligned

\echo === ROLLOUT-BEFORE ===
select jsonb_agg(jsonb_build_object('module_id', module_id, 'enabled', enabled, 'note', note))
from mobile_exercise_rollout;

insert into public.mobile_exercise_rollout (module_id, note) values
  (3, 'module 2 — Your Path, Your Story'),
  (4, 'module 3 — Understanding Here')
on conflict (module_id) do nothing;

\echo === ROLLOUT-AFTER ===
select jsonb_build_object(
  'rollout', (select jsonb_agg(jsonb_build_object('module_id', module_id, 'enabled', enabled))
              from mobile_exercise_rollout),
  'view_rows', (select count(*) from mobile_lesson_exercises),
  'view_lessons', (select count(distinct lesson_id) from mobile_lesson_exercises),
  'view_kinds', (select jsonb_object_agg(input_kind, n)
                 from (select input_kind, count(*) as n
                       from mobile_lesson_exercises group by input_kind) k));
\echo === ROLLOUT-DONE ===
