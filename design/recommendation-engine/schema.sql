-- =============================================================================
-- Recommendation engine + client-notes personalization — DB objects.
-- Run ONCE in the Supabase/production SQL editor BEFORE importing the v3
-- workflows. Everything here is ADDITIVE (new tables only) and app-invisible:
-- no production table is altered, and nothing is granted to anon/authenticated,
-- so the deployed app cannot see these until you ship an app build that reads
-- them (see AGENTS.md lock-step rule).
--
-- Idempotent: safe to run repeatedly.
-- =============================================================================

-- pgvector should already be enabled (snippet_vectors etc. exist). Just in case:
create extension if not exists vector;

-- -----------------------------------------------------------------------------
-- 1. client_note_insights — canonical AI-processed record of ONE session note
--    (individual or group). The notes-ingestion workflow writes here; the
--    recommendation engine and the chatbot read summaries/themes from here.
--    Raw note text is kept for provenance but is NEVER put into prompts —
--    only the structured summary fields are.
-- -----------------------------------------------------------------------------
create table if not exists public.client_note_insights (
  id            bigint generated always as identity primary key,
  user_id       integer     not null,             -- production users.id
  source        text        not null default 'individual'
                check (source in ('individual','group','intake','other')),
  session_date  date,
  coach         text,                             -- coach name/email if provided
  external_ref  text,                             -- source system id (Fathom call id, EHR note id, …)
  raw_text      text,                             -- original note (provenance only)
  summary       text,                             -- 2-3 sentence clinical summary
  themes        text[]      not null default '{}',-- e.g. {cravings, family-conflict}
  concerns      text[]      not null default '{}',
  wins          text[]      not null default '{}',
  focus_areas   text[]      not null default '{}',-- what content should focus on next
  risk          text        not null default 'none'
                check (risk in ('none','monitor','elevated')),
  model         text,                             -- model that produced the extraction
  created_at    timestamptz not null default now()
);

create index if not exists client_note_insights_user_idx
  on public.client_note_insights (user_id, session_date desc nulls last, created_at desc);

-- Same external note never ingested twice (webhook retries, Fathom re-sends).
create unique index if not exists client_note_insights_ext_uniq
  on public.client_note_insights (external_ref) where external_ref is not null;

-- -----------------------------------------------------------------------------
-- 2. client_notes_vectors — pgvector store over note SUMMARIES (not raw text),
--    matching the naming/column convention of snippet_vectors / lessons_vectors
--    (content, meta_data, embedding). meta_data always carries user_id so any
--    retrieval MUST filter on it — see the per-user filtering warning in
--    chatbot-notes-patch.md.
--    1536 dims = OpenAI text-embedding-3-small, same family as your other
--    vector tables.
-- -----------------------------------------------------------------------------
create table if not exists public.client_notes_vectors (
  id         bigint generated always as identity primary key,
  content    text not null,                       -- summary + themes text
  meta_data  jsonb not null default '{}'::jsonb,  -- {user_id, note_id, source, session_date}
  embedding  vector(1536)
);

create index if not exists client_notes_vectors_embedding_idx
  on public.client_notes_vectors
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists client_notes_vectors_meta_idx
  on public.client_notes_vectors using gin (meta_data);

-- -----------------------------------------------------------------------------
-- 3. mobile_recommended_content — the append-only recommendation/provenance
--    ledger (patent: explainability layer + provenance subsystem). EVERY pick
--    the engine makes — snippet, lesson, workshop, (soon) exercise — is
--    recorded here with the reason, the signal snapshot that drove it, the
--    model and prompt version. Videos are ALSO inserted into user_snippets
--    (the live app contract); lessons/workshops live only here until the app
--    ships a surface for them.
--    Supersedes the earlier mobile_recommendation_log design.
-- -----------------------------------------------------------------------------
create table if not exists public.mobile_recommended_content (
  id             bigint generated always as identity primary key,
  user_id        integer     not null,            -- production users.id
  content_type   text        not null
                 check (content_type in ('snippet','lesson','workshop','exercise')),
  content_id     bigint      not null,            -- snippets.id / lessons.id / …
  reason         text,                            -- model's user-safe rationale
  signals_used   jsonb,                           -- explainability: the exact signal
                                                  -- snapshot (check-ins, wheel, notes
                                                  -- themes, lessons) fed to the model
  model          text,
  prompt_version text,
  run_source     text,                            -- 'daily' | 'checkin' | 'note' | 'chat'
  created_at     timestamptz not null default now()
);

create index if not exists mobile_recommended_content_user_idx
  on public.mobile_recommended_content (user_id, created_at desc);
create index if not exists mobile_recommended_content_dedupe_idx
  on public.mobile_recommended_content (user_id, content_type, content_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. FUTURE (do NOT run until the matching app build ships to main — AGENTS.md):
--    email-scoped view for a "Suggested next lesson" surface in the app.
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
--   select * from client_note_insights order by created_at desc limit 10;
--   select content_type, count(*) from mobile_recommended_content
--     where created_at > now() - interval '7 days' group by 1;
