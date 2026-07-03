-- =============================================================================
-- mobile_recommendation_log — OPTIONAL observability for the n8n recommendation
-- engine. Records why each video was recommended (the model's one-sentence
-- reason), which model produced it, and whether the run was the daily batch or
-- a post-check-in webhook run.
--
-- Additive and reversible: creating/dropping this table never touches any
-- production data. n8n writes to it with its own Postgres credentials; there
-- are deliberately NO grants to anon/authenticated, so it is invisible to the
-- app until you decide to surface it (e.g. a future "why this video" label —
-- that would need a new email-scoped mobile_* view, added additively per the
-- rules in AGENTS.md).
--
-- Idempotent: safe to run repeatedly.
-- =============================================================================

create table if not exists public.mobile_recommendation_log (
  id          bigint generated always as identity primary key,
  user_id     integer     not null,   -- production users.id
  snippet_id  bigint      not null,   -- production snippets.id
  reason      text,                   -- model's one-sentence rationale
  model       text,                   -- model id that produced the ranking
  run_source  text,                   -- 'daily' (batch) | 'checkin' (webhook)
  created_at  timestamptz not null default now()
);

create index if not exists mobile_recommendation_log_user_idx
  on public.mobile_recommendation_log (user_id, created_at desc);

-- Quick QA queries:
--   select * from mobile_recommendation_log order by created_at desc limit 20;
--   select run_source, count(*) from mobile_recommendation_log
--     where created_at > now() - interval '7 days' group by 1;
