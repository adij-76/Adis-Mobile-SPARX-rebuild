-- =============================================================================
-- mobile_ai_context(auth_uid) — the whole per-user picture for Sparxy, as ONE
-- JSON object, straddling BOTH layers of the (single) database: the legacy Rails
-- production tables AND the app-owned mobile_* tables.
--
--   • Existing/legacy users → their full web history (answer_headers,
--     daily_assessments, comm_posts, user_points) UNIONED with their mobile
--     activity, so the mobile app *enhances* what we already know about them.
--   • New (mobile-first) users → their mobile data; they simply have no legacy
--     rows yet. At cutover the reconcile jobs materialize their mobile data into
--     these same production tables, so they become full production citizens and
--     every legacy feature works for them too.
--
-- Legacy assessment instruments map to the same keys as the mobile ones
-- (profile 268→gad7, 269→phq9, 49→audit_c, 163→intake), so a user's GAD-7 trend
-- is CONTINUOUS across the web→mobile transition.
--
-- SERVER-SIDE ONLY (returns sensitive data): execute granted to service_role,
-- revoked from anon/authenticated. SECURITY DEFINER. Read-only. Idempotent.
-- =============================================================================

-- Unified assessment history (mobile ∪ legacy answer_headers), one row per take.
create or replace function public.mobile_ai_assessments(p_auth_uid uuid, p_app_user_id integer)
  returns table(instrument text, score integer, severity text, taken_at timestamptz)
  language sql stable security definer set search_path = public as $$
  select r.instrument, r.score, r.severity, r.taken_at
  from public.mobile_assessment_responses r
  where r.auth_uid = p_auth_uid
  union all
  select case ah.profile_id
           when 268 then 'gad7' when 269 then 'phq9'
           when 49 then 'audit_c' when 163 then 'intake'
           else 'profile_' || ah.profile_id end,
         coalesce(ah.usage_score, ah.audit_score, ah.rating)::int,
         null,
         coalesce(ah.complete_date, ah.updated_at)
  from public.answer_headers ah
  where p_app_user_id is not null and ah.user_id = p_app_user_id
    and (ah.complete = true or ah.usage_score is not null
         or ah.audit_score is not null or ah.rating is not null)
$$;
revoke all on function public.mobile_ai_assessments(uuid, integer) from public, anon, authenticated;
grant execute on function public.mobile_ai_assessments(uuid, integer) to service_role;

create or replace function public.mobile_ai_context(p_auth_uid uuid)
  returns jsonb
  language plpgsql stable security definer set search_path = public as $$
declare
  v_email    text;
  ob         public.mobile_onboarding_profile%rowtype;
  u_id       integer;
  u_first    text; u_days integer; u_program integer; u_tz text; u_handle text;
  u_birth    date; u_gender text;
  v_birth    date; v_age integer; v_gender text; v_existing boolean;
  result     jsonb;
begin
  select email into v_email from auth.users where id = p_auth_uid;
  select * into ob from public.mobile_onboarding_profile where auth_uid = p_auth_uid;

  select u.id, u.first_name, u.days_counter_amount, u.program_id, u.time_zone,
         u.user_handle, u.birth_date, u.gender::text
    into u_id, u_first, u_days, u_program, u_tz, u_handle, u_birth, u_gender
  from public.users u
  where v_email is not null and lower(u.email) = lower(v_email);

  v_existing := u_id is not null;
  v_birth    := coalesce(ob.birth_date, u_birth);
  v_age      := case when v_birth is null then null else extract(year from age(v_birth))::int end;
  v_gender   := coalesce(
    case ob.gender when 'male' then 'men' when 'female' then 'women' else null end,
    (select m.band from public.mobile_gender_map m where m.code = u_gender)
  );

  result := jsonb_build_object(
    'auth_uid', p_auth_uid,
    'app_user_id', u_id,
    'is_existing_user', v_existing,

    'identity', jsonb_build_object(
      'first_name', u_first, 'age', v_age, 'gender', v_gender,
      'sobriety_days', u_days, 'program_id', u_program,
      'timezone', u_tz, 'handle', u_handle),

    'focus', jsonb_build_object(
      'primary_problem', (
        select a.title from public.addictions a
        where ob.primary_problem is not null and a.id = ob.primary_problem::int),
      'secondary_problems', coalesce((
        select jsonb_agg(a.title order by a.title) from public.addictions a
        where a.id::text = any(coalesce(ob.secondary_problems, '{}'))), '[]'::jsonb)),

    -- assessments: mobile ∪ legacy, unified by instrument key
    'assessments_latest', coalesce((
      select jsonb_object_agg(instrument, jsonb_build_object(
               'score', score, 'severity', severity, 'taken_at', taken_at))
      from (select distinct on (instrument) instrument, score, severity, taken_at
            from public.mobile_ai_assessments(p_auth_uid, u_id)
            order by instrument, taken_at desc) latest), '{}'::jsonb),
    'assessment_history', coalesce((
      select jsonb_agg(jsonb_build_object('instrument', instrument, 'score', score,
               'severity', severity, 'taken_at', taken_at) order by taken_at)
      from public.mobile_ai_assessments(p_auth_uid, u_id) where score is not null), '[]'::jsonb),

    -- check-ins: mobile ∪ legacy daily_assessments, mobile wins per date, last 14
    'checkins_recent', coalesce((
      select jsonb_agg(to_jsonb(c) order by c.date desc)
      from (
        select date, mood, positive, negative, behavior, amount, use_count, affirmation
        from (
          select distinct on (date) date, mood, positive, negative, behavior, amount, use_count, affirmation, pri
          from (
            select date, mood, positive, negative, behavior, amount, use_count, affirmation, 2 as pri
            from public.mobile_checkins where auth_uid = p_auth_uid
            union all
            select da.created_at::date, da.score, '{}'::text[], '{}'::text[],
                   case when da.tracking_used then 'yes' else 'no' end, null::text,
                   case when da.tracking_used then coalesce(da.tracking_amount, 0)::text else '' end,
                   coalesce(da.i_am, ''), 1
            from public.daily_assessments da where u_id is not null and da.user_id = u_id
          ) unioned
          order by date, pri desc
        ) dedup
        order by date desc
        limit 14
      ) c), '[]'::jsonb),

    'activity_7d', coalesce((
      select jsonb_object_agg(source, cnt)
      from (select source, count(*) as cnt from public.mobile_xp_events
            where auth_uid = p_auth_uid and created_at > now() - interval '7 days'
            group by source) a), '{}'::jsonb),

    'gamification', jsonb_build_object(
      'xp_total', (select coalesce(sum(points), 0) from public.mobile_xp_events where auth_uid = p_auth_uid),
      'legacy_points', (select coalesce(sum(up.points), 0) from public.user_points up where u_id is not null and up.user_id = u_id),
      'streak_days', (select streak_credited_days from public.mobile_game_state where auth_uid = p_auth_uid)),

    -- lesson-exercise reflections (their own words — the journal): latest 10
    -- free-text answers, clipped so one long reflection can't blow up the
    -- payload. Powers the personalised lesson summary + deeper coaching.
    'exercise_reflections', coalesce((
      select jsonb_agg(jsonb_build_object(
               'lesson_id', r.lesson_id,
               'question', coalesce(e.prompt_title, ''),
               'answer', left(r.value_text, 400),
               'answered_at', r.answered_at) order by r.answered_at desc)
      from (
        select er.lesson_id, er.question_id, er.value_text, er.answered_at
        from public.mobile_exercise_responses er
        where er.auth_uid = p_auth_uid and nullif(trim(er.value_text), '') is not null
        order by er.answered_at desc
        limit 10
      ) r
      left join public.mobile_lesson_exercises e on e.question_id = r.question_id), '[]'::jsonb),

    -- posts: mobile ∪ legacy comm_posts (their own words), last 5
    'recent_posts', coalesce((
      select jsonb_agg(jsonb_build_object('text', content, 'created_at', created_at, 'source', src) order by created_at desc)
      from (
        select content, created_at, 'mobile' as src
        from public.mobile_feed_posts where auth_uid = p_auth_uid and active
        union all
        select cp.content, cp.created_at, 'legacy'
        from public.comm_posts cp
        where u_id is not null and cp.user_id = u_id and cp.active and not coalesce(cp.is_profane, false)
        order by created_at desc limit 5
      ) p), '[]'::jsonb),

    'safety_flags', jsonb_build_object(
      -- item-level self-harm only exists on mobile responses
      'self_harm', coalesce((
        select (answers->>'p9')::int > 0 from public.mobile_assessment_responses
        where auth_uid = p_auth_uid and instrument = 'phq9'
        order by taken_at desc limit 1), false),
      -- severity thresholds off the latest UNIFIED score (mobile or legacy)
      'elevated_depression', coalesce((select score >= 20 from public.mobile_ai_assessments(p_auth_uid, u_id)
        where instrument = 'phq9' order by taken_at desc limit 1), false),
      'elevated_anxiety', coalesce((select score >= 15 from public.mobile_ai_assessments(p_auth_uid, u_id)
        where instrument = 'gad7' order by taken_at desc limit 1), false),
      'elevated_ptsd', coalesce((select score >= 33 from public.mobile_ai_assessments(p_auth_uid, u_id)
        where instrument = 'pcl5' order by taken_at desc limit 1), false),
      'high_alcohol_risk', coalesce((select score >= 8 from public.mobile_ai_assessments(p_auth_uid, u_id)
        where instrument = 'audit_c' order by taken_at desc limit 1), false))
  );

  return result;
end
$$;

revoke all on function public.mobile_ai_context(uuid) from public, anon, authenticated;
grant execute on function public.mobile_ai_context(uuid) to service_role;
