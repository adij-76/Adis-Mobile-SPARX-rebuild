-- =============================================================================
-- Recommendation engine — DB objects. Run ONCE in the SQL editor BEFORE
-- importing recommendation-engine.workflow.json.
--
-- Everything here is ADDITIVE (one new table) and app-invisible: no production
-- table is altered, nothing is granted to anon/authenticated, so the deployed
-- app cannot see it until you ship an app build that reads it (AGENTS.md
-- lock-step rule).
--
-- Session notes and treatment plans need NO new tables: the engine reads the
-- existing ai_notes (SOAP pipeline output) and ai_treatment_plan_items
-- (Treatment Plan workflow output) directly.
--
-- Idempotent: safe to run repeatedly.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- mobile_recommended_content — the append-only recommendation/provenance
-- ledger (patent: explainability layer + provenance subsystem). EVERY pick
-- the engine makes — snippet, lesson, workshop, (soon) exercise — is recorded
-- here with the reason, the signal snapshot that drove it (signals_used),
-- the model, and the prompt version. Videos are ALSO inserted into
-- user_snippets (the live app contract); lessons/workshops live only here
-- until the app ships a surface for them.
-- -----------------------------------------------------------------------------
create table if not exists public.mobile_recommended_content (
  id             bigint generated always as identity primary key,
  user_id        integer     not null,            -- production users.id
  content_type   text        not null
                 check (content_type in ('snippet','lesson','workshop','exercise')),
  content_id     bigint      not null,            -- snippets.id / lessons.id / …
  reason         text,                            -- model's user-safe rationale
  signals_used   jsonb,                           -- explainability: the exact signal
                                                  -- snapshot (check-ins, wheel, note
                                                  -- tags, plan items) fed to the model
  model          text,
  prompt_version text,
  run_source     text,                            -- 'daily' | 'checkin' | 'note'
  created_at     timestamptz not null default now()
);

create index if not exists mobile_recommended_content_user_idx
  on public.mobile_recommended_content (user_id, created_at desc);
create index if not exists mobile_recommended_content_dedupe_idx
  on public.mobile_recommended_content (user_id, content_type, content_id, created_at desc);

-- -----------------------------------------------------------------------------
-- FUTURE (do NOT run until the matching app build ships to main — AGENTS.md):
-- email-scoped view for a "Suggested next lesson" surface in the app.
-- -----------------------------------------------------------------------------
-- create view mobile_recommended_lessons as
--   select rc.id, rc.content_type, rc.content_id as lesson_id, rc.reason,
--          rc.created_at as recommended_at,
--          l.title, l.nav_title, l.description
--   from public.mobile_recommended_content rc
--   join public.lessons l on l.id = rc.content_id
--   join public.users   u on u.id = rc.user_id
--   where rc.content_type in ('lesson','workshop')
--     and lower(u.email) = lower(auth.jwt() ->> 'email');
-- grant select on mobile_recommended_lessons to authenticated;

-- Quick QA:
--   select content_type, count(*) from mobile_recommended_content
--     where created_at > now() - interval '7 days' group by 1;
--   select reason from mobile_recommended_content order by id desc limit 10;
