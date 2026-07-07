-- =============================================================================
-- One-off guarded content fixes for Modules 2+3 (editorial items agreed with
-- Adi, 2026-07-07). Idempotent: every statement pins the id AND the current
-- state, so re-runs are no-ops. Dispatch via apply-migrations (file= input);
-- the BEFORE/AFTER blocks print proof into the run log. NOT in apply-order.
--
--   1. Yes/No questions stored as legacy widget 0 → proper selects (widget 2).
--      Beliefs-about-success + SF-36 items already carry their Yes/No options;
--      the ACE questionnaire's 19 items get Yes/No options inserted.
--   2. Broken links: endocrine.org trailing "%20"; the personal responseCode
--      baked into the check-up.recoveryblueprints.com link is stripped.
--   3. Typos: q253 title "Whar do you see" → "What do you see"; q252's
--      placeholder title "title" → '' (heading falls back to the prompt).
--   4. The 15KB single-table "Hormone Regulation" reference block (q277) is
--      split into SIX per-hormone tables (header row duplicated into each,
--      composed from the DB's own text via substr — no content lives in this
--      file), interleaved so each hormone's table sits right before its
--      "log your level" field. Guarded by the md5 of the original label.
-- =============================================================================

\t on
\pset format unaligned

\echo === FIX23-BEFORE ===
select jsonb_build_object('q_id', q.id, 'widget', q.widget_type, 'sort', q.sort_order,
         'title', q.title, 'len', length(q.question_label),
         'opts', (select count(*) from question_options o where o.question_id = q.id))
from questions q
where q.id in (122,123,124,126,128, 591,592,593,594,597,598,599, 1796,
               332,333,334,335,336,411,412,413,414,415,416,417,418,419,420,421,422,423,424,
               252,253,277,280,397, 398,399,400,401,402,403)
order by q.id;

-- 1a) Widget-0 yes/no items that ALREADY have options → select --------------
update questions set widget_type = 2, updated_at = now()
where id in (122,123,124,126,128,           -- Beliefs About Success
             591,592,593,594,597,598,599,   -- Minding Your Health (SF-36 items)
             1796)                          -- Changing Our Thinking "100% true?"
  and widget_type = 0
  and exists (select 1 from question_options o where o.question_id = questions.id);

-- 1b) ACE questionnaire: insert Yes/No options, then flip to select ----------
insert into question_options (question_id, value, sort_order, created_at, updated_at)
select q.id, v.value, v.ord, now(), now()
from questions q
cross join (values ('Yes', 1), ('No', 2)) v(value, ord)
where q.id in (332,333,334,335,336,411,412,413,414,415,416,417,418,419,420,421,422,423,424)
  and q.widget_type = 0
  and not exists (select 1 from question_options o where o.question_id = q.id);

update questions set widget_type = 2, updated_at = now()
where id in (332,333,334,335,336,411,412,413,414,415,416,417,418,419,420,421,422,423,424)
  and widget_type = 0
  and exists (select 1 from question_options o where o.question_id = questions.id);

-- 2) Link repairs (targeted string replace — naturally idempotent) -----------
update questions
   set question_label = replace(question_label,
         'https://www.endocrine.org/%20', 'https://www.endocrine.org/'),
       updated_at = now()
 where position('https://www.endocrine.org/%20' in question_label) > 0;

update questions
   set question_label = replace(question_label,
         '?responseCode=WqFGLjEAq7Pu4Yn58LF41QeQu0aLseQu0aLs', ''),
       updated_at = now()
 where position('?responseCode=WqFGLjEAq7Pu4Yn58LF41QeQu0aLseQu0aLs' in question_label) > 0;

-- 3) Typos --------------------------------------------------------------------
update questions set title = 'What do you see', updated_at = now()
 where id = 253 and title = 'Whar do you see';
update questions set title = '', updated_at = now()
 where id = 252 and title = 'title';

-- 4) Hormone Regulation split (q277) ------------------------------------------
-- Original: one <table> at [1..99]=open tag(+<tbody>), header row at
-- [102 len 1844], six hormone rows, "</tbody></table>" close, stray &nbsp; tail.
-- Offsets are pinned by the md5 guard; every part is substr() of the ORIGINAL.
do $$
declare
  l   text;
  pid bigint;
  hdr text;
begin
  select question_label, profile_id into l, pid from questions where id = 277;
  if l is null or md5(l) <> '22422922ec42a60a1c1c773c0d368baa' then
    raise notice '4) hormone split: q277 not in the expected state (already split?) — skipped';
    return;
  end if;
  hdr := substr(l, 1, 99) || substr(l, 102, 1844);   -- table open + header row

  insert into questions (profile_id, widget_type, question_label, title, sort_order,
                         active, required, created_at, updated_at)
  values
    (pid, 12, hdr || substr(l,  4494, 2154) || '</tbody></table>', 'Progesterone',         276, true, false, now(), now()),
    (pid, 12, hdr || substr(l,  6650, 2134) || '</tbody></table>', 'Estrogen',             300, true, false, now(), now()),
    (pid, 12, hdr || substr(l,  8786, 2267) || '</tbody></table>', 'Human Growth Hormone', 330, true, false, now(), now()),
    (pid, 12, hdr || substr(l, 11055, 1902) || '</tbody></table>', 'Thyroid hormones',     340, true, false, now(), now()),
    (pid, 12, hdr || substr(l, 12959, 2021) || '</tbody></table>', 'Cortisol',             350, true, false, now(), now());

  update questions
     set question_label = hdr || substr(l, 1948, 2544) || '</tbody></table>',
         title = 'Testosterone', updated_at = now()
   where id = 277;

  -- Interleave: each hormone's log field follows its table; closing content last.
  update questions set sort_order = 332, updated_at = now() where id = 401 and sort_order = 319;
  update questions set sort_order = 342, updated_at = now() where id = 402 and sort_order = 320;
  update questions set sort_order = 352, updated_at = now() where id = 403 and sort_order = 321;
  update questions set sort_order = 360, updated_at = now() where id = 280 and sort_order = 322;
  raise notice '4) hormone table split into 6 per-hormone blocks, fields interleaved';
end $$;

\echo === FIX23-AFTER ===
select jsonb_build_object('q_id', q.id, 'widget', q.widget_type, 'sort', q.sort_order,
         'title', q.title, 'len', length(q.question_label),
         'opts', (select count(*) from question_options o where o.question_id = q.id))
from questions q
where q.id in (122,123,124,126,128, 591,592,593,594,597,598,599, 1796,
               332,333,334,335,336,411,412,413,414,415,416,417,418,419,420,421,422,423,424,
               252,253,277,280,397, 398,399,400,401,402,403)
order by q.id;

\echo === FIX23-HORMONE-SHEET ===
-- The Hormone Regulation sheet in final display order.
select jsonb_build_object('q_id', q.id, 'sort', q.sort_order, 'widget', q.widget_type,
                          'title', q.title, 'len', length(q.question_label))
from questions q
where q.profile_id = (select profile_id from questions where id = 277) and q.active
order by q.sort_order;
\echo === FIX23-DONE ===
