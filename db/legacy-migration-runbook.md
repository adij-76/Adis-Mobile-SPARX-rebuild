# Legacy → Supabase final-migration runbook

**Why this file exists:** we make data-level changes to the LIVE legacy DB
(ec2-…, n8n credential "Postgres account") while a final full migration to
Supabase is still ahead. Every such change must be captured here as a
re-runnable step so nothing is lost regardless of HOW the migration happens
(straight copy vs rebuild-from-source). Rule: **no manual data surgery
anywhere unless its SQL lives in git and is listed here.**

## Principles

1. **Straight-copy migration** (pg_dump/restore or ETL of current state):
   data changes below carry over automatically — the checklist is then just
   verification.
2. **Rebuild migration** (vector tables re-embedded from raw transcripts):
   data changes must be RE-APPLIED — run the linked SQL against the new DB.
3. All SQL here is idempotent (DELETE by id, UPDATE scrubs, CREATE IF NOT
   EXISTS) — running twice is safe.

## Data-level changes to carry across (in order)

| # | Change | SQL lives in | Applied to legacy? | Post-migration action |
|---|---|---|---|---|
| 1 | ~~`conversational_segments_vectors` QA delete/scrub on legacy~~ **SUPERSEDED 2026-07-07**: corpus moves to NEW Supabase table `sparky_segments`; the 116 bad rows simply don't carry over, the 86 keepers seed the new table. No legacy surgery needed. | `design/sparky-ai/segments-ingestion-v2.md` (keep-list in `design/method-corpus/31-conversational-segments-qa.md`) | n/a | Legacy `conversational_segments_vectors` is retired at chatbot repoint; EXCLUDE from migration |
| 2 | Segment ingestion v2 → `sparky_segments` (Supabase): Deep Dive groups + QA-gated 1:1s, name-scrubbed, session_kind/coach tags | `design/sparky-ai/segments-ingestion-v2.md` | ⬜ to build | Nothing — table is already in the destination DB. Only the SOURCE (transcript_conversations) migrates; re-point the ingestion workflow's read side afterward |
| 3 | `ai_chat_profiles` rolling-summary table (Patch D3 — future) | patches doc Patch D | ⬜ not built | Create table in new DB; re-point nightly job |

## App-DB objects already migration-proof (in git, Supabase side)

- `mobile_recommended_content` ledger — `design/recommendation-engine/schema.sql` (RUN in prod)
- `mobile_ai_context` RPC — `db/ai-context.sql` (on main)
- All `mobile_*` views — `db/*.sql` (lock-step-with-main rule per AGENTS.md)

## n8n re-pointing checklist (day of migration)

1. Create new credential for the migrated DB; do NOT edit the old one
   (rollback = flip back).
2. Workflows touching the legacy credential today: recommendation engine
   ("Clinical signals (legacy DB)"), chatbot (Session_Notes, Chat_History,
   ai_chat_responses + user_alerts inserts, all 4 vector tools + 3 Postgres
   chat memories), SOAP & Note QA, Treatment Plan, and any scratch workflows.
   Flip each node's credential; Publish; run the smoke tests in
   `design/recommendation-engine/DEPLOYMENT.md` Part 7.
3. Verify vector tables migrated WITH embeddings (pgvector extension enabled
   in target; `select count(*) from …_vectors` matches source post-QA counts).
4. Verify sequences/PK ranges (mmlists/sds_codes ids like 254183 must keep
   their values — workflows reference them as literals).
5. Re-export workflow snapshots to `design/n8n-live/` after re-pointing.

## Decision log

- 2026-07-07: segments QA (change #1) approved to run BEFORE migration — the
  live chatbot reads this table today, so deferring means Sparky keeps
  retrieving the 116 bad rows; the SQL in git makes it re-applicable if the
  migration rebuilds the table. Backup table
  `conversational_segments_vectors_bak_20260707` stays in the legacy DB and
  should be EXCLUDED from (or dropped after) migration.
