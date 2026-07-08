-- =============================================================================
-- One-off guarded content fixes (Adi, 2026-07-07 round 2). Idempotent — every
-- statement pins ids AND current state. Dispatch via apply-migrations
-- (file= input); BEFORE/AFTER prints proof. NOT in apply-order.
--
--   1. SF-36 items ("Minding Your Health and Functioning", questions 591-594,
--      597-599): option labels carried their scoring weights — members saw
--      "Yes (0)" / "No (100)" as tap choices. Clean to "Yes"/"No". The weights
--      (Yes=0, No=100, per the SF-36 role-limitation items) move to the app's
--      scoring recipe when SF-36 scoring lands (src/lib/exercise-scores.ts).
--
--   2. Module 1 First Day Quickstart: TWO near-duplicate "Implementation and
--      Next Steps" sections (the second, q1763 + steps q1765-1767, also has a
--      typo "difficulet"). Deactivate the second set; the first (q1759 +
--      q1760-1762) stays.
--
--   3. The legacy "Post to Community" content block (q62, Hero Personal Power
--      Statement) linked to the old web app. The in-app share button is now
--      standard on statement sheets, so the block is retired.
-- =============================================================================

\t on
\pset format unaligned

\echo === CLEANUP-BEFORE ===
select jsonb_build_object('q_id', q.id, 'active', q.active, 'title', q.title,
  'opts', (select jsonb_agg(o.value order by o.sort_order) from question_options o where o.question_id = q.id))
from questions q
where q.id in (591,592,593,594,597,598,599, 62, 1763,1765,1766,1767)
order by q.id;

-- 1) SF-36 option labels: strip the parenthesised weights.
update question_options set value = 'Yes', updated_at = now()
 where question_id in (591,592,593,594,597,598,599) and value = 'Yes (0)';
update question_options set value = 'No', updated_at = now()
 where question_id in (591,592,593,594,597,598,599) and value = 'No (100)';

-- 2) Duplicate Implementation set (second copy) → inactive.
update questions set active = false, updated_at = now()
 where id in (1763, 1765, 1766, 1767) and active = true;

-- 3) Legacy Post-to-Community block → inactive (in-app share replaces it).
update questions set active = false, updated_at = now()
 where id = 62 and active = true;

\echo === CLEANUP-AFTER ===
select jsonb_build_object('q_id', q.id, 'active', q.active, 'title', q.title,
  'opts', (select jsonb_agg(o.value order by o.sort_order) from question_options o where o.question_id = q.id))
from questions q
where q.id in (591,592,593,594,597,598,599, 62, 1763,1765,1766,1767)
order by q.id;
\echo === CLEANUP-DONE ===
