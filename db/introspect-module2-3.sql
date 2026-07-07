-- =============================================================================
-- READ-ONLY introspection: the real Module 2 + 3 exercise content, for the
-- content QA loop (.claude/skills/exercise-content-qa — "build modules 2+3").
--
-- Dispatch apply-migrations with file=introspect-module2-3.sql; results print
-- into the workflow log between the markers. ⚠ Delete the run logs after
-- extracting — the repo (and its logs) are public, the content is paid IP.
--
-- SELECTs only — touches no data, reads no user tables (definitions only).
-- NOT in apply-order.txt (like introspect.sql).
-- =============================================================================

\t on
\pset format unaligned

\echo === M23-MODULES-BEGIN ===
-- The portions themselves (rollout needs their real ids).
select jsonb_build_object(
  'portion_id', p.id, 'order', p."order", 'title', p.title,
  'program_id', p.program_id, 'program', pg.name)
from portions p
join programs pg on pg.id = p.program_id
where p."order" in (2, 3)
order by p.program_id, p."order";
\echo === M23-MODULES-END ===

\echo === M23-SUMMARY-BEGIN ===
-- One JSON line per lesson: worksheet + question counts and a widget
-- histogram, including lessons with NO exercises (so the report can say so).
select jsonb_build_object(
  'module', p."order", 'portion_id', p.id,
  'lesson_id', l.id, 'pos', l.position, 'lesson', l.title,
  'sheets', count(distinct pr.id),
  'questions', count(q.id),
  'widgets', coalesce((
     select jsonb_object_agg(w.widget_type, w.n)
     from (select q2.widget_type, count(*) as n
           from profiles pr2 join questions q2 on q2.profile_id = pr2.id and q2.active
           where pr2.lesson_id = l.id and pr2.active
           group by q2.widget_type) w), '{}'::jsonb))
from portions p
join lessons l on l.portion_id = p.id
left join profiles pr on pr.lesson_id = l.id and pr.active
left join questions q on q.profile_id = pr.id and q.active
where p."order" in (2, 3)
group by p."order", p.id, l.id, l.position, l.title
order by p."order", l.position;
\echo === M23-SUMMARY-END ===

\echo === M23-QUESTIONS-BEGIN ===
-- One JSON line per question (ndjson). question_label clipped to 2000 chars
-- (label_len carries the true length so we can spot monsters).
select jsonb_build_object(
  'module', p."order", 'lesson_id', l.id, 'pos', l.position,
  'profile_id', pr.id, 'sheet', pr.title, 'sheet_order', pr.sort_order,
  'q_id', q.id, 'q_order', q.sort_order, 'widget', q.widget_type,
  'title', q.title, 'required', q.required,
  'min', q.min_value, 'max', q.max_value,
  'label_len', length(q.question_label),
  'label', left(q.question_label, 2000),
  'options', coalesce((
     select jsonb_agg(qo.value order by qo.sort_order, qo.id)
     from question_options qo where qo.question_id = q.id), '[]'::jsonb))
from portions p
join lessons l on l.portion_id = p.id
join profiles pr on pr.lesson_id = l.id and pr.active
join questions q on q.profile_id = pr.id and q.active
where p."order" in (2, 3)
order by p."order", l.position, pr.sort_order, q.sort_order;
\echo === M23-QUESTIONS-END ===

\echo === M23-VIEW-CHECK-BEGIN ===
-- Sanity: what the live view serves right now (rollout gate included).
select jsonb_build_object(
  'rollout', (select jsonb_agg(jsonb_build_object('module_id', module_id, 'enabled', enabled))
              from mobile_exercise_rollout),
  'view_rows', (select count(*) from mobile_lesson_exercises),
  'view_lessons', (select count(distinct lesson_id) from mobile_lesson_exercises),
  'view_kinds', (select jsonb_object_agg(input_kind, n)
                 from (select input_kind, count(*) as n
                       from mobile_lesson_exercises group by input_kind) k));
\echo === M23-VIEW-CHECK-END ===
