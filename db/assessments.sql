-- =============================================================================
-- App-owned assessment responses — the day-1 battery + monthly re-administration.
--
-- New users complete a small battery of standardized instruments (GAD-7, PHQ-9,
-- AUDIT-C, a brief intake) during onboarding; each submission is one row here.
-- The app computes the score/severity client-side (public-domain instruments)
-- and stores the raw answers too, so nothing is lost at cutover — these
-- reconcile 1:1 into the production `answer_headers` / `answers` framework
-- (profile_id points at the matching prod `profiles.id`).
--
-- Append-only: every take is a new row (keeps full history for the trend graphs
-- on the Data page). "Latest per instrument" is just the newest taken_at.
-- RLS-scoped by auth.uid(); reconciles to prod via app_user_id at cutover.
-- Idempotent.
-- =============================================================================

create table if not exists public.mobile_assessment_responses (
  id          bigint generated always as identity primary key,
  auth_uid    uuid        not null default auth.uid(),
  app_user_id integer,                                   -- production users.id (cutover)
  instrument  text        not null,                      -- 'gad7' | 'phq9' | 'audit_c' | 'intake' | …
  profile_id  integer,                                   -- prod profiles.id for reconciliation
  score       integer,                                   -- summed score (null for unscored intake)
  severity    text,                                      -- band label ('minimal'|'mild'|…)
  answers     jsonb       not null default '{}'::jsonb,  -- { questionKey: optionValue }
  taken_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists mobile_assessment_responses_uid_inst
  on public.mobile_assessment_responses (auth_uid, instrument, taken_at desc);

alter table public.mobile_assessment_responses enable row level security;
drop policy if exists mobile_assessment_responses_select on public.mobile_assessment_responses;
create policy mobile_assessment_responses_select on public.mobile_assessment_responses
  for select to authenticated using (auth_uid = auth.uid());
drop policy if exists mobile_assessment_responses_insert on public.mobile_assessment_responses;
create policy mobile_assessment_responses_insert on public.mobile_assessment_responses
  for insert to authenticated with check (auth_uid = auth.uid());
grant select, insert on public.mobile_assessment_responses to authenticated;
