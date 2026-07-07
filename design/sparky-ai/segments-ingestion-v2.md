# Segments ingestion v2 — `sparky_segments` (Supabase, migration-proof)

**Decision (Adi, 2026-07-07):** Sparky's therapist-pattern corpus moves to a
NEW table in the NEW database (Supabase). It is born on the right side of the
legacy migration, so it never has to move; the chatbot's
`conversational_segments` tool gets repointed to it during the chat
deployment. The legacy `conversational_segments_vectors` table is then
retired — **the 116-row QA delete on legacy is no longer needed** (we simply
don't carry those rows over). The QA keep-list in
`../method-corpus/31-conversational-segments-qa.md` becomes the seed filter.

## What the discovery found (legacy DB, 2026-07-07)

- `transcripts`: 1,154 sessions (2025-05-27 → today), avg ~39 min. Group
  sessions are identified by TITLE (weekday prefix), not by `sds_group_id`
  (always null) or `sds_user_support_type_id` (always null).
- **≥20 "Tuesday - Dr. Jaffe Deep Dive" sessions** + other named groups
  (No Stigma, Transforming Family Relationships, Spirituality, Gratitude
  Group, Inclusive Women's, Progress is Progress). 503 group transcripts,
  148 untitled, rest 1:1 (Accountability Coach Calls, IOP therapist/case
  manager, onboarding).
- `transcript_conversations`: **11,927 structured exchanges** across 907
  transcripts — client_message, coach_message, ideal_response,
  conversation_note, client_state, response_type, interaction_type,
  tagged_techniques. Only 202 were ever embedded.
- ⚠️ `session_type` on exchanges is unreliable (thousands of group-transcript
  rows say "1:1"). Classify via `transcripts.title`.
- ⚠️ Titles contain full client names → scrub at ingestion.

## Target table (Supabase — run once; add to schema.sql territory)

```sql
create extension if not exists vector;

create table if not exists sparky_segments (
  id          uuid primary key default gen_random_uuid(),
  text        text not null,          -- the CLIENT message = vector search key
  metadata    jsonb not null,         -- see layout below
  embedding   vector(1536),           -- text-embedding-3-small (matches chatbot)
  created_at  timestamptz not null default now()
);
-- Mirrors the legacy vector-table layout (id/text/metadata/embedding) so the
-- n8n PGVector tool node works unchanged after repointing.

alter table sparky_segments enable row level security;  -- service-role/n8n only; no app access
```

`metadata` layout (superset of legacy, plus what we always wished we had):
```json
{
  "coach_message":  "…the real response (PREFERRED pattern source)…",
  "ideal_response": "…cleaned summary (fallback only)…",
  "conversation_note": "…",
  "client_state": "guilt",
  "interaction_type": "coach_reflection",
  "tagged_techniques": "…",
  "source": "legacy_seed | ingestion_v2",
  "transcript_id": 5353,
  "session_kind": "adi_deep_dive | group | one_on_one | intake",
  "coach": "Adi Jaffe | Fred | …",
  "session_date": "2025-09-16"
}
```
`session_kind` + `coach` let the program-data agent PREFER Adi-led material.

## Selection SQL (runs on LEGACY; feeds the n8n ingestion workflow)

Priority tiers, all through the same QA gate:

```sql
select tc.id, tc.client_message, tc.coach_message, tc.ideal_response,
       tc.conversation_note, tc.client_state, tc.response_type,
       tc.interaction_type, tc.tagged_techniques, tc.transcript_id,
       t.title, t.created_at as session_date,
       case
         when t.title ilike '%jaffe%' or t.title ilike '%deep dive%' then 'adi_deep_dive'
         when t.title ~* '^(mon|tues|wednes|thurs|fri|satur|sun)day' then 'group'
         when tc.session_type = 'intake' then 'intake'
         else 'one_on_one'
       end as session_kind
from transcript_conversations tc
join transcripts t on t.id = tc.transcript_id
where length(coalesce(tc.client_message, '')) >= 40      -- no dead "Okay." keys
  and length(coalesce(tc.coach_message,  '')) >= 60      -- a real response exists
  and t.title not ilike '%onboarding%'                   -- ops filter
order by (t.title ilike '%jaffe%' or t.title ilike '%deep dive%') desc,
         t.created_at desc;
```

## QA gate (applied in the workflow, per `31-…-qa.md` criteria)

1. Key quality: client_message ≥ 40 chars and not pure acknowledgment (SQL above).
2. Ops screen: drop exchanges about scheduling/tech/program admin — cheap LLM
   classifier pass (claude-haiku) with the QA doc's category-B definition;
   batch of 50 per call.
3. Speaker sanity: drop rows where client_message reads as the coach
   (classifier flag).
4. Name scrub: regexp over both fields using the roster harvested from
   `transcripts.title` (names in parentheses/"with X") + manual additions.
5. Dedup: skip if an existing `sparky_segments.text` is near-identical
   (exact-match on normalized text is enough — the legacy dupes were exact).

## Workflow outline (n8n, to build as `sparky-segments-ingestion`)

```
Manual/Schedule trigger
  → Legacy: selection SQL (batched, e.g. 500/run, offset via workflow static data)
  → Code: name scrub + normalize + build metadata
  → Haiku classifier: ops/speaker screen (batch)
  → OpenAI embeddings (text-embedding-3-small) on client_message
  → Supabase: insert into sparky_segments (skip on conflict/dup)
  → run log
```
Seed step 0: the 86 QA keepers from legacy (by id list) go through the same
pipeline with `source='legacy_seed'` (re-embedded — cheap at 86 rows).

## Chatbot repoint (part of the chat deployment mission)

In the duplicated chatbot: `conversational_segments` tool node → credential
🟢 "Supabase (app DB)", table `sparky_segments`. Everything else unchanged
(same column layout). v2 program-data prompt already prefers
`coach_message`; add one line: "segments tagged session_kind='adi_deep_dive'
are the gold standard — prefer them when relevance is comparable."

## Update 2026-07-07 (Adi) — expanded tiers, QA after pull

Adi: there should be **100+ Tuesday groups** (the earlier query was LIMIT 20),
plus his **men's group** and older **Friday and Monday gratitude groups**.
Approach confirmed: pull generously, QA afterwards inside `sparky_segments`
(rows are plain SQL — reviewable and deletable in place).

Tier classification implemented in `segments-ingestion.workflow.json`:

| session_kind | Rule (on transcript title) | coach tag |
|---|---|---|
| `adi_deep_dive` | contains "jaffe" or "deep dive" | Adi Jaffe |
| `adi_tuesday` | starts with "Tuesday" | null (verify) |
| `mens_group` | "men's"/"mens" and not "women" | null (verify) |
| `group` | any other weekday-prefixed title | parsed from "with X" |
| `one_on_one` | everything else (phase 2 — not pulled in run 1) | parsed from "with X" |

Run 1 pulls ONLY the group tiers (the workflow's WHERE clause). Phase 2
(best 1:1s) = remove the group filter from the Pull query and re-run —
dedup makes re-runs safe.

## Estimated volumes

11,927 total → after length gate ≈ 5–7k → after ops/speaker screen ≈ 3–5k
high-quality exchanges, of which Deep Dive + named groups ≈ 1,100+. Even the
low end is ~40× today's usable corpus.

## Post-smoke-test backlog (2026-07-08)

- **Catalog drift check:** vimeo id 507704285 exists in legacy `snippet_vectors`
  (served in chat) but not in Supabase `snippets.vimeo_url` — vector catalog
  and app catalog have drifted. Add a periodic diff (links in vectors missing
  from app catalog and vice versa) so chat and rail recommend from provably
  identical inventories.
- **Titles for video vectors:** `snippet_vectors` has ai_summary + snippet_link
  but no title, so the rec agent cannot name videos (falls back to URL-as-title;
  main agent currently prefers titled lessons). Enrich vector metadata with
  titles at next re-embed, or join titles at retrieval.
