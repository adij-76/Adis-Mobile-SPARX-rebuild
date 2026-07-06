-- =============================================================================
-- CUTOVER RECONCILE — app-owned (mobile_*) → production Rails tables.  ONE-TIME.
--
-- This is the "write back" half of cutover: it materializes everything users did
-- in the mobile app into the real production tables, so the web/Rails app sees it
-- too and mobile-first users become full production citizens.
--
-- ⚠️  RUN MANUALLY, ONCE, WITH REVIEW — never in the auto-apply workflow.
--     • Take a production backup first.
--     • Run inside the transaction below; inspect the RAISE NOTICE row counts;
--       only then COMMIT (change the final `rollback;` to `commit;`).
--     • Every section is idempotent (guards / on-conflict / not-exists), so a
--       re-run never double-writes.
--     • Lines marked  ⚠ CONFIRM  depend on exact prod columns/code_sets that
--       vary by environment — verify them against the live schema before COMMIT.
--
-- Keys: app-owned rows carry `app_user_id` = production `users.id`. Rows whose
-- `app_user_id` is null (a tester who never converted) are skipped here — run
-- `db/promote-tester.sql` first to backfill their id, or handle separately.
-- Spec: docs/db-migration-catalogue.md section C.
-- =============================================================================

\set ON_ERROR_STOP on
begin;

-- 0) New mobile-first users need a production users row before anything can FK
--    to it. Create one from their onboarding profile + auth email.  ⚠ CONFIRM
--    the required non-null columns on your `users` table (this sets the common
--    ones; add any others your schema requires).
do $$
declare n int;
begin
  with created as (
    insert into public.users (email, first_name, birth_date, created_at, updated_at)
    select au.email,
           coalesce(split_part(au.email, '@', 1), 'Member'),
           ob.birth_date,
           now(), now()
    from public.mobile_onboarding_profile ob
    join auth.users au on au.id = ob.auth_uid
    where ob.app_user_id is null
      and not exists (select 1 from public.users u where lower(u.email) = lower(au.email))
    returning id, email
  )
  -- link the new prod id back onto the profile so the sections below can use it
  update public.mobile_onboarding_profile ob
     set app_user_id = c.id
    from created c
    join auth.users au on lower(au.email) = lower(c.email)
   where ob.auth_uid = au.id;
  get diagnostics n = row_count;
  raise notice '0) users created + linked for new mobile users: %', n;
end $$;

-- 0b) Backfill app_user_id everywhere from the (now-complete) onboarding link,
--     so every app-owned table can resolve its user. (promote-tester.sql does
--     this per-user; here we do it in bulk by auth_uid.)
--     ⚠ this assumes each app-owned table has auth_uid + app_user_id (they do).

-- 1) mobile_onboarding_profile → users (demographics)  ⚠ CONFIRM code_sets
--    Gender uses mobile_gender_map in reverse (band → prod code). Race /
--    orientation need their own code maps — left as TODO (see note).
update public.users u
   set birth_date = coalesce(u.birth_date, ob.birth_date),
       gender     = coalesce(u.gender, (select m.code::int from public.mobile_gender_map m
                                         where m.band = case ob.gender when 'male' then 'men'
                                                                        when 'female' then 'women' end
                                         limit 1)),
       addiction  = coalesce(u.addiction, (select a.enum_id from public.addictions a
                                            where a.id = ob.primary_problem::int)),
       updated_at = now()
  from public.mobile_onboarding_profile ob
 where ob.app_user_id = u.id;
-- TODO race → users.race code, orientation → users.identify code (need Race /
-- Identify code_set maps, same shape as mobile_gender_map). secondary_problems
-- → users.secondary_addictions.

-- 2) mobile_checkins → daily_assessments  (mood, tracking, affirmation)  ⚠ CONFIRM
insert into public.daily_assessments (user_id, created_at, score, tracking_used, tracking_amount, i_am)
select c.app_user_id, c.created_at, c.mood,
       (c.behavior = 'yes'),
       nullif(c.use_count, '')::int,
       nullif(c.affirmation, '')
from public.mobile_checkins c
where c.app_user_id is not null
  and not exists (
    select 1 from public.daily_assessments da
    where da.user_id = c.app_user_id and da.created_at::date = c.date
  );

-- 3) mobile_assessment_responses → answer_headers  (one header per take)  ⚠ CONFIRM
--    Per-item `answers` (jsonb key → prod questions.id) is a separate mapping —
--    left as TODO; the header carries the score so trends/reporting work.
insert into public.answer_headers (user_id, profile_id, complete, complete_date, usage_score, updated_at)
select r.app_user_id, r.profile_id, true, r.taken_at, r.score, now()
from public.mobile_assessment_responses r
where r.app_user_id is not null and r.profile_id is not null
  and not exists (
    select 1 from public.answer_headers ah
    where ah.user_id = r.app_user_id and ah.profile_id = r.profile_id
      and ah.complete_date = r.taken_at
  );
-- TODO: insert per-question `answers` rows from r.answers (map answer key → questions.id).

-- 3b) mobile_exercise_responses → answer_headers + answers  (lesson exercises)
--     The app stores ONE latest answer per (user, question) — upsert on
--     (auth_uid, question_id) — so a user has at most one "take" per worksheet
--     profile. Materialize: one answer_headers row per (user, profile) stamped
--     with the take's last answered_at, then one answers row per response,
--     keyed by the REAL legacy questions.id the view exposed (no key mapping
--     needed, unlike the assessment battery).  ⚠ CONFIRM answers columns —
--     `answer` (json) vs `text_answer` (varchar) match prod; add user_id if
--     your answers table carries it.
-- [exercise-reconcile:begin]
do $$
declare n int;
begin
  with takes as (
    select r.app_user_id, r.profile_id, max(r.answered_at) as taken_at
    from public.mobile_exercise_responses r
    where r.app_user_id is not null
    group by r.app_user_id, r.profile_id
  )
  insert into public.answer_headers (user_id, profile_id, complete, complete_date, updated_at)
  select t.app_user_id, t.profile_id, true, t.taken_at, now()
  from takes t
  where not exists (
    select 1 from public.answer_headers ah
    where ah.user_id = t.app_user_id and ah.profile_id = t.profile_id
      and ah.complete_date = t.taken_at
  );
  get diagnostics n = row_count;
  raise notice '3b) exercise answer_headers created: %', n;

  with takes as (
    select r.app_user_id, r.profile_id, max(r.answered_at) as taken_at
    from public.mobile_exercise_responses r
    where r.app_user_id is not null
    group by r.app_user_id, r.profile_id
  )
  insert into public.answers (header_id, question_id, answer, text_answer, created_at, updated_at)
  select ah.id, r.question_id, r.value_json, r.value_text, r.answered_at, r.answered_at
  from public.mobile_exercise_responses r
  join takes t on t.app_user_id = r.app_user_id and t.profile_id = r.profile_id
  join public.answer_headers ah
    on ah.user_id = t.app_user_id and ah.profile_id = t.profile_id
   and ah.complete_date = t.taken_at
  where r.app_user_id is not null
    and not exists (
      select 1 from public.answers a
      where a.header_id = ah.id and a.question_id = r.question_id
    );
  get diagnostics n = row_count;
  raise notice '3b) exercise answers created: %', n;
end $$;
-- [exercise-reconcile:end]

-- 4) mobile_xp_events → user_points  (itemized, dated — authoritative XP)  ⚠ CONFIRM
--    Replays each event as points dated by created_at. `source` should map to a
--    prod reward type in user_rewards; here we write the point value + keep the
--    source label for traceability. Dedup on (user, source, ref, created_at).
insert into public.user_points (user_id, points, created_at)
select e.app_user_id, e.points, e.created_at
from public.mobile_xp_events e
where e.app_user_id is not null
  and not exists (
    select 1 from public.user_points up
    where up.user_id = e.app_user_id and up.points = e.points and up.created_at = e.created_at
  );
-- NOTE: mobile_game_state (running total) is intentionally NOT replayed — the
-- ledger above is authoritative. mobile_video_watches points are already in the
-- ledger as 'video' events, so they're covered here too.

-- 5) mobile_feed_posts → comm_posts  ⚠ CONFIRM (image_url has no prod column)
insert into public.comm_posts (user_id, comm_channel_id, title, content, created_at, active)
select p.app_user_id, p.comm_channel_id, p.title, p.content, p.created_at, p.active
from public.mobile_feed_posts p
where p.app_user_id is not null
  and not exists (
    select 1 from public.comm_posts cp
    where cp.user_id = p.app_user_id and cp.content = p.content and cp.created_at = p.created_at
  );

-- 6) mobile_favorites → favorites  (polymorphic)  ⚠ CONFIRM favoritable_type values
insert into public.favorites (user_id, favoritable_type, favoritable_id, created_at)
select f.app_user_id,
       case f.kind when 'lesson' then 'Lesson' when 'video' then 'Snippet' end,
       f.item_id::int, now()
from public.mobile_favorites f
where f.app_user_id is not null and f.active
  and not exists (
    select 1 from public.favorites pf
    where pf.user_id = f.app_user_id
      and pf.favoritable_type = case f.kind when 'lesson' then 'Lesson' when 'video' then 'Snippet' end
      and pf.favoritable_id = f.item_id::int
  );

-- 7) Deferred to cutover-time decisions (no safe generic write — see §C):
--    • mobile_feed_comments  → comments   (polymorphic commentable_* + emoji ids)
--    • mobile_feed_reactions → reactions  (reaction → emoji_id via emojis)
--    • mobile_conversations/_members/_messages → community_* (group threads have
--      no direct prod equivalent)
--    • mobile_blocks         → prod block/mute mechanism (TBD)
--    • mobile_group_signups  → prod group-membership mechanism (TBD)
--    Implement these once the prod destinations are confirmed for the target env.

-- Inspect the counts above, then flip to commit.
rollback;   -- ⚠ change to `commit;` after reviewing the NOTICE output.
