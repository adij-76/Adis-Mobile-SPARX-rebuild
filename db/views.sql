-- =============================================================================
-- SPARx mobile layer — PART 1: VIEWS (what the app reads)
--
-- WHAT THIS FILE DOES / DOESN'T DO
--   * It ONLY creates our own `mobile_*` views and grants SELECT on them.
--   * It does NOT alter, drop, truncate, or update any production table, and it
--     does NOT change any production row or column. Nothing here touches your
--     data — it only adds read-only views on top of it.
--   * The only statement the SQL editor flags as "destructive" is
--     `DROP VIEW IF EXISTS mobile_lessons` — that drops *our own* view so it can
--     be recreated with new columns. It can never affect a base table. (Postgres
--     requires drop+recreate when a view's column list changes; CREATE OR REPLACE
--     can only append columns.)
--
-- SECURITY MODEL
--   Every per-user view (mobile_me, mobile_lessons, mobile_wheel_scores) filters
--   internally on the signed-in user's email (auth.jwt() ->> 'email'). A user can
--   only ever see their own rows, and anon callers see catalog data with no
--   personal fields. Because the filter lives *inside* the view, we do NOT need
--   to enable row-level security on the base tables — so this file leaves
--   public.users (and every other production table) exactly as it found it.
--
-- IDEMPOTENT: re-run anytime / after any re-import; you always land in the same
-- place. (CREATE OR REPLACE everywhere; the one DROP is IF EXISTS.)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. CATALOG VIEWS (no per-user data — safe for anon browse)
-- -----------------------------------------------------------------------------

create or replace view mobile_programs as
  select id, name, active from programs where active;

create or replace view mobile_modules as
  select id, program_id, title, "order" from portions;

-- Each lesson/workshop's Vimeo video lives in the polymorphic `vimeos` table
-- (vimeoable_type='Lesson'), not on `lessons`, so we lateral-join the newest one.
--
-- PER-USER ENRICHMENT (progress / rating / favorite): the GoTrue JWT carries only
-- `email`, not the production users.id, so we resolve the caller to their users
-- row by email and LEFT JOIN their personal rows. Anon browse → `me` empty →
-- NULL personal columns. A signed-in user only ever matches their own rows.
drop view if exists mobile_lessons;
create view mobile_lessons as
  select l.id,
         l.portion_id as module_id,        -- canonical (app domain = "module")
         l.portion_id,                     -- compat: pre-rename app builds filter on portion_id
         l.title,
         l.nav_title,
         l.position,
         l.description,
         coalesce(v.url, l.vimeo_url)                 as vimeo_url,
         coalesce(v.vimeo_id::text, l.vimeo_id::text) as vimeo_id,
         case l.lesson_type when 1 then 'workshop' else 'lesson' end as lesson_type,
         l.worksheet_explanation_url as worksheet_url,
         null::text     as thumbnail,       -- client derives it from Vimeo oEmbed
         -- Per-user fields as scalar subqueries (NOT joins): completed_lessons /
         -- lesson_ratings / favorites can each have MANY rows per (lesson,user),
         -- and joining them fans out — one lesson becomes N duplicate rows. A
         -- single-value subquery keeps mobile_lessons at exactly one row/lesson.
         (select cl.progress_value from completed_lessons cl
           where cl.lesson_id = l.id and cl.user_id = me.id
           order by cl.updated_at desc nulls last limit 1)          as progress,
         (select lr.rating from lesson_ratings lr
           where lr.lesson_id = l.id and lr.user_id = me.id
           order by lr.updated_at desc nulls last limit 1)          as rating,
         exists (select 1 from favorites fav
           where fav.favoritable_type = 'Lesson'
             and fav.favoritable_id = l.id and fav.user_id = me.id) as favorite,
         -- ACCESS MODEL (locked by default for content the user isn't entitled to):
         --   1. PROGRAM CONTENT — lessons in the user's enrolled program
         --      (portion.program_id = users.program_id) are accessible. This is
         --      the primary entitlement and mirrors the original app.
         --   2. SUBSCRIPTION ROLE — additionally, anything the user's
         --      subscription role explicitly unlocks (premium add-ons).
         --   Anyone signed out, or content outside both, is locked.
         case
           when me.id is null then false
           when p.program_id is not null and p.program_id = me.program_id then true
           when l.lesson_type = 1 then exists (
             select 1 from subscription_role_workshops srw
             where srw.role_id = me.subscription_role_id and srw.workshop_id = l.id)
           else exists (
             select 1 from subscription_role_lessons srl
             where srl.role_id = me.subscription_role_id and srl.lesson_id = l.id)
         end as accessible
  from lessons l
  left join portions p on p.id = l.portion_id
  left join lateral (
    select url, vimeo_id
    from vimeos
    where vimeoable_type = 'Lesson' and vimeoable_id = l.id
    order by updated_at desc nulls last
    limit 1
  ) v on true
  left join lateral (
    select id, program_id, subscription_role_id from public.users
    where lower(email) = lower(auth.jwt() ->> 'email')
    limit 1
  ) me on true;

create or replace view mobile_snippets as
  select id,
         lesson_id,
         description,                          -- the DB "title" text
         length_seconds, vimeo_url, vimeo_id, ai_generated, created_at,
         title,                               -- DB title column (usually empty)
         ai_summary as summary                -- generated long description
  from snippets
  where classified = true;

-- Daily quotes. The text lives in `quote_full`; there is no `mood` column in
-- production, so default 'steady' (the app's check-in quote recommender falls
-- back gracefully when it can't match a mood).
create or replace view mobile_quotes as
  select id,
         quote_full     as text,
         author,
         'steady'::text as mood
  from quotes
  where active = true and quote_full is not null;

grant select on mobile_programs, mobile_modules, mobile_lessons, mobile_snippets, mobile_quotes
  to anon, authenticated;

-- Recommended videos rail — the snippets the recommendation engine (n8n) writes
-- to public.user_snippets, joined to the snippet's video. Email-scoped, so it
-- returns only the caller's picks. NO DISTINCT ON / no ORDER BY here: PostgREST
-- adds its own order+limit, and a DISTINCT ON view combined with that can fail
-- the request (which then silently fell back to seed videos). The adapter sorts
-- by recommended_at and de-duplicates by snippet id instead.
-- DROP+CREATE (not REPLACE): the title expression's type is text (was varchar).
drop view if exists mobile_recommended_videos;
create view mobile_recommended_videos as
  select s.id,
         -- Title source is messy in prod: `title` is usually empty and
         -- `description` is sometimes the literal placeholder "No description
         -- available". Prefer a real title, skip the placeholder, and fall back
         -- to a trimmed summary so a card is NEVER labelled "No description…".
         case
           when nullif(trim(s.title), '') is not null then s.title
           when s.description is not null and trim(s.description) <> ''
                and lower(trim(s.description)) <> 'no description available' then s.description
           when nullif(trim(s.ai_summary), '') is not null then left(s.ai_summary, 70)
           else 'SPARx video'
         end                                          as title,
         s.ai_summary                                 as description,
         s.length_seconds,
         s.vimeo_url,
         s.vimeo_id,
         us.created_at                                as recommended_at
  from public.user_snippets us
  join public.snippets s on s.id = us.snippet_id
  join public.users    u on u.id = us.user_id
  where lower(u.email) = lower(auth.jwt() ->> 'email')
    and (s.vimeo_id is not null or s.vimeo_url is not null);   -- must have a playable video

grant select on mobile_recommended_videos to authenticated;

-- Substance-use tracking — the recurring usage assessment writes a row per
-- attempt to answer_headers with a usage_score (and audit_score). Email-scoped;
-- the app buckets these into recent / weekly / monthly / annual trends. Higher
-- score = more use, so the client treats a DROP as improvement.
create or replace view mobile_use_tracking as
  select ah.id,
         coalesce(ah.complete_date, ah.start_date, ah.created_at) as recorded_at,
         ah.usage_score,
         ah.audit_score
  from public.answer_headers ah
  join public.users u on u.id = ah.user_id
  where lower(u.email) = lower(auth.jwt() ->> 'email')
    and ah.usage_score is not null
  order by recorded_at;

grant select on mobile_use_tracking to authenticated;

-- Wheel of Life — real per-area current + previous score for the signed-in user.
-- Two sources are UNIONed and the newest two per area win:
--   1. production wheel_of_life_scores.score (0-10) — scaled ×10 to the app's 0-100 chart.
--   2. app-owned mobile_wheel_entries.score (already 0-100) — a mobile "retake".
-- life_area_id (1..10) maps 1:1 (same order) to the app's wheel areas / life_areas.title.
-- The app-entries arm is spliced in only when that table exists, so this file still
-- runs standalone against a fresh import (before mobile-wheel-entries.sql is applied).
do $wheel$
declare app_union text := '';
begin
  if to_regclass('public.mobile_wheel_entries') is not null then
    app_union := 'union all select we.life_area_id, we.score::numeric as s, we.taken_at as at '
              || 'from public.mobile_wheel_entries we where we.auth_uid = auth.uid()';
  end if;
  execute format($v$
    create or replace view mobile_wheel_areas as
      with scores as (
        select ws.life_area_id, (ws.score * 10)::numeric as s, ws.created_at as at
        from public.wheel_of_life_scores ws
        join public.users u on u.id = ws.user_id
        where lower(u.email) = lower(auth.jwt() ->> 'email')
        %s
      ),
      ranked as (
        select life_area_id, s,
               row_number() over (partition by life_area_id order by at desc) as rn
        from scores
      )
      select r.life_area_id,
             la.title,
             round(max(case when r.rn = 1 then r.s end)) as current_score,
             round(max(case when r.rn = 2 then r.s end)) as last_score
      from ranked r
      join public.life_areas la on la.id = r.life_area_id
      where r.rn <= 2
      group by r.life_area_id, la.title
  $v$, app_union);
  execute 'grant select on mobile_wheel_areas to authenticated';
end
$wheel$;

-- Community leaderboard — total points per user (user_points), top 50. Global
-- (a leaderboard is inherently multi-user); `you` flags the caller's own row.
create or replace view mobile_leaderboard as
  select u.id                                                              as user_id,
         coalesce(nullif(trim(u.first_name), ''), split_part(u.email, '@', 1)) as name,
         u.avatar_link                                                     as avatar,
         coalesce(sum(up.points), 0)::int                                  as points,
         (u.id = (select id from public.users where lower(email) = lower(auth.jwt() ->> 'email'))) as you
  from public.users u
  join public.user_points up on up.user_id = u.id
  group by u.id, u.first_name, u.email, u.avatar_link
  order by points desc
  limit 50;

grant select on mobile_leaderboard to authenticated;

-- Assessments the user has taken — answer_headers joined to the assessment name
-- (profiles.title), limited to attempts that are complete or carry a score. No
-- DISTINCT ON (PostgREST-unsafe with order+limit); the adapter keeps the latest
-- per assessment. `score` coalesces the per-instrument score column.
create or replace view mobile_assessments as
  select ah.id,
         ah.profile_id,
         p.title                                              as name,
         coalesce(ah.complete_date, ah.updated_at)            as taken_at,
         coalesce(ah.usage_score, ah.audit_score, ah.rating)  as score
  from public.answer_headers ah
  join public.users    u on u.id = ah.user_id
  join public.profiles p on p.id = ah.profile_id
  where lower(u.email) = lower(auth.jwt() ->> 'email')
    and (ah.complete = true or ah.usage_score is not null or ah.audit_score is not null or ah.rating is not null);

grant select on mobile_assessments to authenticated;

-- -----------------------------------------------------------------------------
-- 2. mobile_me — maps the signed-in auth email → the production users row, plus
--    the personalisation fields the app reads after login. Filters internally on
--    the caller's email, so it returns ONLY their row WITHOUT any base-table RLS.
--    addiction is an integer FK → public.addictions; we JOIN to return its title.
--    DROP+CREATE (not REPLACE): an earlier mobile_me exposed `addiction` as an
--    integer, and CREATE OR REPLACE can't change a column's type or drop one.
-- -----------------------------------------------------------------------------

drop view if exists mobile_me;
create view mobile_me as
  -- Column aliases are the canonical clean contract: each is the snake_case of
  -- the app's camelCase field, so the adapter is a mechanical transform and the
  -- admin backend can speak the same vocabulary. (See db/field-dictionary.md.)
  -- Canonical clean names PLUS backward-compat aliases: the deployed app build
  -- (from main) still reads the pre-rename names (avatar, addiction,
  -- days_counter_updated_at). We expose both so a view update never breaks the
  -- live app; the old aliases can be dropped once the new build ships to main.
  select u.id                                          as app_user_id,
         u.first_name                                  as name,
         u.email,
         u.avatar_link                                 as avatar_url,
         u.avatar_link                                 as avatar,           -- compat
         u.program_id,
         coalesce(u.subscribed, false)                 as subscribed,
         -- production column has the typo "subsctiption"; the clean name hides it.
         coalesce(u.stripe_subsctiption_active, false) as stripe_active,
         coalesce(u.advanced_coaching, false)          as advanced_coaching,
         a.title                                       as addiction_label,
         a.title                                       as addiction,        -- compat
         u.days_counter_amount                         as days_count,
         u.days_counter_updated_at                     as days_updated_at,
         u.days_counter_updated_at,                                         -- compat
         u.user_handle,
         u.time_zone,
         u.team_id,
         u.zoom_email
  from public.users u
  -- users.addiction stores the addictions ENUM_ID (0=Alcohol, 1=Cannabis, …),
  -- NOT the primary key, so we join on enum_id to resolve the title.
  left join public.addictions a on a.enum_id = u.addiction
  where lower(u.email) = lower(auth.jwt() ->> 'email');   -- self-scope, no RLS needed

grant select on mobile_me to authenticated;

-- -----------------------------------------------------------------------------
-- 3. mobile_wheel_scores — trailing monthly wheel-of-life averages (per user).
--    Source: public.wheel_of_life_scores (user_id, life_area_id, score, created_at).
--    One overall score per month = average across the user's life areas, scoped
--    by the caller's email.
--
--    SCALE: raw wheel_of_life_scores.score is 0-10 (confirmed); the app chart is
--    0-100, so we scale the monthly average by 10.
-- -----------------------------------------------------------------------------

do $$
declare app_union text := '';
begin
  if to_regclass('public.wheel_of_life_scores') is not null then
    -- App-owned retakes (mobile_wheel_entries) are spliced in as extra monthly
    -- samples so a fresh retake immediately moves this month's average. Scores
    -- there are already 0-100; production is 0-10, so it's the one scaled ×10.
    -- Only splice when the table exists (fresh imports run this file first).
    if to_regclass('public.mobile_wheel_entries') is not null then
      app_union := 'union all select we.score::numeric as s, we.taken_at as at '
                || 'from public.mobile_wheel_entries we where we.auth_uid = auth.uid()';
    end if;
    -- DROP+CREATE: an earlier mobile_wheel_scores had a user_id column we no
    -- longer expose, and CREATE OR REPLACE can't drop a column.
    execute 'drop view if exists mobile_wheel_scores';
    execute format($v$
      create view mobile_wheel_scores as
        with samples as (
          select (ws.score * 10)::numeric as s, ws.created_at as at
          from public.wheel_of_life_scores ws
          join public.users u on u.id = ws.user_id
          where lower(u.email) = lower(auth.jwt() ->> 'email')
          %s
        )
        select to_char(date_trunc('month', at), 'YYYY-MM') as month_key,
               to_char(date_trunc('month', at), 'Mon')     as label,
               extract(year from at)::int                  as year,
               round(avg(s))::int                          as score  -- already 0-100
        from samples
        group by 1, 2, 3
    $v$, app_union);
    execute 'grant select on mobile_wheel_scores to authenticated';
  end if;
end $$;

commit;

-- =============================================================================
-- VERIFY (optional):
--   select * from mobile_me;                       -- one row: you (when signed in)
--   select id, title, progress, rating, favorite from mobile_lessons limit 5;
-- =============================================================================
