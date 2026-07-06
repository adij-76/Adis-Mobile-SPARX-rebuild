-- =============================================================================
-- Module 1 content fix (one-off, idempotent) — run via the apply-migrations
-- workflow dispatch (file=fix-module1-content.sql). NOT in apply-order.txt.
--
-- The "Alcohol" First-Day tips block (questions.id = 6) was attached to the
-- IGNTD HERO MANIFESTO worksheet (profiles.id = 1). It belongs at the TOP of
-- IGNTD FIRST DAY QUICKSTART TIPS AND TRICKS (profiles.id = 8), so the tips
-- read Alcohol → Marijuana (7) → Drugs (8) → Sex (13) → Gambling (16) →
-- Food (1442) → Implementation sections.
--
-- Guarded: only moves the row if it still sits on the manifesto profile, so a
-- re-run (or a run after a manual fix) is a no-op. Emits ids/titles only.
-- =============================================================================

\set ON_ERROR_STOP on

\echo === FIX-M1-BEFORE ===
select id, profile_id, sort_order, title from questions where id = 6;

update questions
   set profile_id = 8,          -- IGNTD FIRST DAY QUICKSTART TIPS AND TRICKS
       sort_order = 1,          -- before Marijuana (sort_order 7)
       updated_at = now()
 where id = 6
   and title = 'Alcohol'
   and profile_id = 1;          -- only if still misplaced on the manifesto

\echo === FIX-M1-AFTER ===
select id, profile_id, sort_order, title from questions where id = 6;

-- The quickstart running order as the app will serve it:
select q.id, q.sort_order, q.widget_type, q.title
from questions q
where q.profile_id = 8 and q.active
order by q.sort_order;
\echo === FIX-M1-DONE ===
