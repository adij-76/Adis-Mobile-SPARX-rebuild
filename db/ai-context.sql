-- =============================================================================
-- mobile_ai_context(auth_uid) — the whole per-user picture for Sparxy, as ONE
-- JSON object, so the n8n flow makes a single call instead of eight (and stays
-- one call as we add data).
--
-- SERVER-SIDE ONLY. This returns a user's full personal + clinical profile, so
-- it must never be callable by regular app users (they could pass someone else's
-- id). Execute is granted ONLY to service_role (the n8n flow uses the service
-- key). SECURITY DEFINER so it can read across the app-owned + production tables.
--
-- Read-only. Reconciles nothing; purely assembles context. Idempotent.
-- =============================================================================

create or replace function public.mobile_ai_context(p_auth_uid uuid)
  returns jsonb
  language plpgsql
  stable
  security definer
  set search_path = public
as $$
declare
  v_email     text;
  ob          public.mobile_onboarding_profile%rowtype;
  u_id        integer;
  u_first     text;
  u_days      integer;
  u_program   integer;
  u_tz        text;
  u_handle    text;
  u_birth     date;
  u_gender    text;         -- prod users.gender::text (a code id)
  v_birth     date;
  v_age       integer;
  v_gender    text;         -- 'men' | 'women' | null
  v_existing  boolean;
  result      jsonb;
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

  -- gender band: onboarding text for new users, else the prod code via the map
  v_gender := coalesce(
    case ob.gender when 'male' then 'men' when 'female' then 'women' else null end,
    (select m.band from public.mobile_gender_map m where m.code = u_gender)
  );

  result := jsonb_build_object(
    'auth_uid', p_auth_uid,
    'app_user_id', u_id,
    'is_existing_user', v_existing,

    'identity', jsonb_build_object(
      'first_name', u_first,
      'age', v_age,
      'gender', v_gender,
      'sobriety_days', u_days,
      'program_id', u_program,
      'timezone', u_tz,
      'handle', u_handle
    ),

    'focus', jsonb_build_object(
      'primary_problem', (
        select a.title from public.addictions a
        where ob.primary_problem is not null and a.id = ob.primary_problem::int
      ),
      'secondary_problems', coalesce((
        select jsonb_agg(a.title order by a.title)
        from public.addictions a
        where a.id::text = any(coalesce(ob.secondary_problems, '{}'))
      ), '[]'::jsonb)
    ),

    -- latest score/severity per instrument
    'assessments_latest', coalesce((
      select jsonb_object_agg(instrument, jsonb_build_object(
               'score', score, 'severity', severity, 'taken_at', taken_at))
      from (
        select distinct on (instrument) instrument, score, severity, taken_at
        from public.mobile_assessment_responses
        where auth_uid = p_auth_uid
        order by instrument, taken_at desc
      ) latest
    ), '{}'::jsonb),

    -- full scored history (oldest→newest) for trend commentary
    'assessment_history', coalesce((
      select jsonb_agg(jsonb_build_object(
               'instrument', instrument, 'score', score,
               'severity', severity, 'taken_at', taken_at) order by taken_at)
      from public.mobile_assessment_responses
      where auth_uid = p_auth_uid and score is not null
    ), '[]'::jsonb),

    -- recent check-ins (last 14)
    'checkins_recent', coalesce((
      select jsonb_agg(row_to_json(c) order by c.date desc)
      from (
        select date, mood, positive, negative, behavior, amount, use_count, affirmation
        from public.mobile_checkins
        where auth_uid = p_auth_uid
        order by date desc
        limit 14
      ) c
    ), '[]'::jsonb),

    -- last 7 days of activity, rolled up by source
    'activity_7d', coalesce((
      select jsonb_object_agg(source, cnt)
      from (
        select source, count(*) as cnt
        from public.mobile_xp_events
        where auth_uid = p_auth_uid and created_at > now() - interval '7 days'
        group by source
      ) a
    ), '{}'::jsonb),

    'gamification', jsonb_build_object(
      'xp_total', (select coalesce(sum(points), 0) from public.mobile_xp_events where auth_uid = p_auth_uid),
      'streak_days', (select streak_credited_days from public.mobile_game_state where auth_uid = p_auth_uid)
    ),

    -- the user's own recent posts (their words — themes, wins, struggles)
    'recent_posts', coalesce((
      select jsonb_agg(jsonb_build_object('text', content, 'created_at', created_at) order by created_at desc)
      from (
        select content, created_at
        from public.mobile_feed_posts
        where auth_uid = p_auth_uid and active
        order by created_at desc
        limit 5
      ) p
    ), '[]'::jsonb),

    -- safety flags from the latest scored responses
    'safety_flags', jsonb_build_object(
      'self_harm', coalesce((
        select (answers->>'p9')::int > 0
        from public.mobile_assessment_responses
        where auth_uid = p_auth_uid and instrument = 'phq9'
        order by taken_at desc limit 1), false),
      'elevated_depression', coalesce((
        select score >= 20 from public.mobile_assessment_responses
        where auth_uid = p_auth_uid and instrument = 'phq9'
        order by taken_at desc limit 1), false),
      'elevated_anxiety', coalesce((
        select score >= 15 from public.mobile_assessment_responses
        where auth_uid = p_auth_uid and instrument = 'gad7'
        order by taken_at desc limit 1), false),
      'elevated_ptsd', coalesce((
        select score >= 33 from public.mobile_assessment_responses
        where auth_uid = p_auth_uid and instrument = 'pcl5'
        order by taken_at desc limit 1), false),
      'high_alcohol_risk', coalesce((
        select score >= 8 from public.mobile_assessment_responses
        where auth_uid = p_auth_uid and instrument = 'audit_c'
        order by taken_at desc limit 1), false)
    )
  );

  return result;
end
$$;

-- Lock it down: server-side only.
revoke all on function public.mobile_ai_context(uuid) from public;
revoke all on function public.mobile_ai_context(uuid) from anon, authenticated;
grant execute on function public.mobile_ai_context(uuid) to service_role;
