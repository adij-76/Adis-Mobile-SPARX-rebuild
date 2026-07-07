-- =============================================================================
-- READ-ONLY introspection for the module 2+3 content-fix round + the
-- "show computed scores" scoping (item 1). Dispatch via apply-migrations
-- (file=introspect-fixes.sql); ⚠ DELETE THE RUN LOGS after extracting.
-- SELECTs only. NOT in apply-order.txt.
-- =============================================================================

\t on
\pset format unaligned

\echo === FIX-GUARDS-BEGIN ===
-- Current state of every row the fix file will touch (guards + before proof).
select jsonb_build_object(
  'q_id', id, 'widget', widget_type, 'title', title,
  'label_len', length(question_label), 'label_md5', md5(question_label),
  'has_opts', exists (select 1 from question_options o where o.question_id = q.id))
from questions q
where id in (252, 253, 277, 280, 397,
             332, 333, 334, 335, 336, 411, 412, 413, 414, 415, 416, 417, 418,
             419, 420, 421, 422, 423, 424,
             122, 123, 124, 126, 128,
             591, 592, 593, 594, 597, 598, 599)
order by id;
\echo === FIX-GUARDS-END ===

\echo === HORMONE-B64-BEGIN ===
-- q277's full 15KB HTML, base64 (newlines stripped) in 2000-char chunks so the
-- split offsets can be computed locally without pasting raw content around.
select n || '|' || replace(encode(convert_to(substr(q.question_label, 1 + (n - 1) * 2000, 2000), 'UTF8'), 'base64'), chr(10), '')
from questions q, generate_series(1, 8) n
where q.id = 277
order by n;
\echo === HORMONE-B64-END ===

\echo === COMPUTE-META-BEGIN ===
-- The legacy compute engine's metadata for every hidden 'display' widget in
-- modules 2+3 — what would it take to show scores client-side?
select jsonb_build_object(
  'q_id', q.id, 'sheet', pr.title, 'title', q.title,
  'compute_type', q.compute_type, 'source_id', q.source_id,
  'code_set', q.code_set, 'dest', q.destination_column,
  'label_1st', left(regexp_replace(q.question_label, '<[^>]*>', '', 'g'), 60))
from portions p
join lessons l on l.portion_id = p.id
join profiles pr on pr.lesson_id = l.id and pr.active
join questions q on q.profile_id = pr.id and q.active and q.widget_type = 5
where p."order" in (2, 3)
order by pr.id, q.sort_order;
\echo === COMPUTE-META-END ===

\echo === COMPUTE-TYPES-BEGIN ===
-- Distinct compute recipes across the WHOLE engine (how many patterns exist?).
select jsonb_build_object('compute_type', compute_type, 'n', count(*),
                          'with_source', count(source_id))
from questions where widget_type = 5 and active
group by compute_type order by compute_type;
\echo === COMPUTE-TYPES-END ===
