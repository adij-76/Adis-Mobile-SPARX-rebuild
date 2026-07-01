-- =============================================================================
-- One-shot schema dump. Run this ONCE in the Supabase SQL editor and paste the
-- single JSON result back. From that one payload the whole mobile layer (views,
-- adapter types, RLS) can be generated in one pass — no column-by-column Q&A.
--
-- Network note: this environment's egress policy blocks the Supabase host, so the
-- assistant cannot read the DB directly. This query is the substitute: you run
-- it, the JSON comes back, and it has everything (tables, columns, types,
-- nullability, defaults, and foreign-key targets) needed to wire connections.
-- =============================================================================

-- ---- A. Full public-schema map (tables + columns + types + FK targets) ------
-- If the result is too large to paste, scope it with the table filter in part C.
select json_agg(t order by t.table_name) as schema
from (
  select c.table_name,
         json_agg(
           json_build_object(
             'column',   c.column_name,
             'type',     c.data_type,
             'nullable', c.is_nullable,
             'default',  c.column_default,
             'fk',       fk.target
           ) order by c.ordinal_position
         ) as columns
  from information_schema.columns c
  left join (
    select kcu.table_name,
           kcu.column_name,
           ccu.table_name || '.' || ccu.column_name as target
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
  ) fk on fk.table_name = c.table_name and fk.column_name = c.column_name
  where c.table_schema = 'public'
    and c.table_name not like 'pg_%'
    and c.table_name not like 'mobile_%'      -- skip our own views
  group by c.table_name
) t;

-- ---- B. Table list with row counts (small; helps prioritise which to wire) ---
-- select relname as table, n_live_tup as approx_rows
-- from pg_stat_user_tables
-- order by n_live_tup desc;

-- ---- C. Scoped variant — if part A is too big, list just the tables we care
--          about and re-run part A with this filter swapped in for the WHERE:
--   and c.table_name in (
--     'users','addictions','programs','portions','lessons','vimeos','snippets',
--     'completed_lessons','lesson_ratings','favorites','wheel_scores',
--     'program_links','subscription_roles','subscription_role_workshops',
--     'subscription_role_addictions','quotes','teams','meetings'
--   )
