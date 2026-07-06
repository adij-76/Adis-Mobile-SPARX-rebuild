-- =============================================================================
-- READ-ONLY introspection: the real Module 1 exercise content, for the content
-- QA loop (docs/lesson-exercises-spec.md → "build module 1").
--
-- The build sandbox can't reach Supabase, but the apply-migrations workflow
-- can — dispatch it manually with file=introspect-module1.sql and the results
-- print into the workflow log between the BEGIN/END markers below.
--
-- SELECTs only — touches no data, reads no user tables (definitions only).
-- NOT in apply-order.txt (like introspect.sql).
-- =============================================================================

\t on
\pset format unaligned

\echo === MODULE1-SUMMARY-BEGIN ===
-- One JSON line per Module-1 lesson: worksheet + question counts and a widget
-- histogram, including lessons with NO exercises (so the report can say so).
select jsonb_build_object(
  'program_id', pg.id, 'program', pg.name,
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
join programs pg on pg.id = p.program_id
join lessons l on l.portion_id = p.id
left join profiles pr on pr.lesson_id = l.id and pr.active
left join questions q on q.profile_id = pr.id and q.active
where p."order" = 1
group by pg.id, pg.name, l.id, l.position, l.title
order by pg.id, l.position;
\echo === MODULE1-SUMMARY-END ===

\echo === MODULE1-QUESTIONS-BEGIN ===
-- One JSON line per question (ndjson). question_label is clipped to 2000 chars
-- (label_len carries the true length so we can spot monsters).
select jsonb_build_object(
  'lesson_id', l.id, 'pos', l.position,
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
where p."order" = 1
order by l.position, pr.sort_order, q.sort_order;
\echo === MODULE1-QUESTIONS-END ===

\echo === MODULE1-VIEW-CHECK-BEGIN ===
-- Sanity: what the live view actually serves (rollout gate included).
select jsonb_build_object(
  'rollout', (select jsonb_agg(jsonb_build_object('module_id', module_id, 'enabled', enabled))
              from mobile_exercise_rollout),
  'view_rows', (select count(*) from mobile_lesson_exercises),
  'view_lessons', (select count(distinct lesson_id) from mobile_lesson_exercises),
  'view_kinds', (select jsonb_object_agg(input_kind, n)
                 from (select input_kind, count(*) as n
                       from mobile_lesson_exercises group by input_kind) k));
\echo === MODULE1-VIEW-CHECK-END ===
