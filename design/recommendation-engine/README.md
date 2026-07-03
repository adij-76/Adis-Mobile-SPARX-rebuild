# SPARx Recommendation Engine — n8n build guide (v3)

The n8n pipeline that turns a client's real data — daily check-ins, Wheel of
Life, lesson progress, addiction focus, and **clinical session notes from
individual and group sessions** — into personalised content: video snippets
today (the app's "Recommended Videos" rail, check-in summary, Videos tab),
lessons and workshops in the same ledger, and exercises when that library
lands.

This is the deployment vehicle for the patent-pending **Adaptive
Behavioral-Health Treatment Planning and Delivery System** (see
"Patent alignment" below).

> **Where the live flows run:** the IGNTD n8n cloud instance. This folder is
> the versioned source of truth — import the `.workflow.json` files there and
> keep changes flowing through this repo as reviewable diffs.

## The three moving parts

```
                       coach tool / Fathom relay / Rails
                                    │  POST note
                                    ▼
              ┌── notes-ingestion.workflow.json ─────────────────┐
              │ extract insights (Claude, structured)            │
              │ → client_note_insights (+ client_notes_vectors)  │
              │ → elevated-risk Slack alert                      │
              │ → POST re-rank for that user ──────────────┐     │
              └─────────────────────────────────────────────│────┘
                                                            ▼
Schedule (daily 06:00) ─┐                    ┌── recommendation-engine.workflow.json (v3)
Supabase DB webhook     ├──▶ Resolve targets─▶ Gather signals + candidates (1 SQL)
(mobile_checkins INSERT)┘                    │   check-ins · assessments · wheel ·
                                             │   lessons · SESSION NOTES ·
                                             │   video pool · lesson/workshop pool
                                             ▼
                                       Rank with Claude (structured output)
                                             ▼
                                       Validate picks (hallucination guard)
                                        ┌────┴───────────────┐
                                        ▼                    ▼
                             user_snippets (videos,   mobile_recommended_content
                             live app contract)       (ALL picks + reason +
                                                       signal snapshot = provenance)

              chatbot (live, patched per chatbot-notes-patch.md):
              Session_Notes node → user-context block → note-aware
              conversational recommendations, with a hard never-quote rule
```

## The contract with the app (must stay true)

Derived from `db/views.sql` and `src/api/supabase.ts`:

1. **INSERT-only into `user_snippets`** (production table): the app reads it
   through `mobile_recommended_videos`, newest-first, deduped, top 8.
2. **Only classified snippets with a playable video** — the view hides
   anything else, so a bad pick silently vanishes.
3. **Empty is safe** — the app falls back to newest real snippets.
4. **Never change `mobile_*` views from these flows** — view changes ship in
   lock-step with `main` (AGENTS.md).
5. Lessons/workshops have **no app surface yet** — they accumulate in
   `mobile_recommended_content` until the "Suggested next lesson" app build
   ships (the ready-to-run view is commented at the bottom of `schema.sql`).

## What v3 adds over v2

| Area | v3 |
|---|---|
| **Session notes** | New ingestion workflow: any source POSTs a note → Claude extracts a structured insight record (summary, themes, concerns, wins, focus areas, risk) → stored in `client_note_insights`. The ranking prompt weights note focus-areas **above every other signal**, and a fresh note immediately re-ranks that user's content. |
| **Multi-content** | Candidates now include entitled, not-completed lessons and workshops (entitlement mirrors `mobile_lessons.accessible`: user's program + subscription-role unlocks). Model returns up to 5 videos + up to 2 lessons/workshops. `exercise` is reserved in the ledger's type enum for when the exercises library exists. |
| **Provenance / explainability** | Every pick is appended to `mobile_recommended_content` with its reason, the exact signal snapshot that drove it (`signals_used` jsonb), model id, prompt version, and run source. Append-only; nothing updates or deletes rows. |
| **Production signals** | Signals now also read legacy `daily_assessments` + emotions (the same source the live chatbot uses), so long-time clients aren't cold-started. |
| **Safety** | Elevated-risk language in a session note fires a Slack alert to the coaching channel (mirrors the chatbot's crisis-alert pattern). |
| **Privacy** | Prompts see note *summaries*, never raw text. User-facing reasons are forbidden (by prompt) from quoting or revealing notes; the chatbot patch carries the same rule. |

## Deployment runbook (in order)

1. **Schema:** run `schema.sql` once in the SQL editor. Additive only; the
   app can't see any of it.
2. **Notes ingestion:** import `notes-ingestion.workflow.json` → set the
   Postgres / Anthropic / Slack credentials marked `REPLACE` and the Slack
   channel id → add **Header Auth** on the webhook → Save, Activate.
3. **Recommendation engine:** import `recommendation-engine.workflow.json`
   (replaces v2 if you imported it) → set credentials → Header Auth → Save,
   Activate. Copy its **production** webhook URL into:
   - the `Re-rank this user's content` node of the notes workflow, and
   - a Supabase Database Webhook: *Database → Webhooks → Create*, table
     `public.mobile_checkins`, event `INSERT`, POST to that URL (sends
     `body.record.app_user_id`).
4. **Chatbot:** apply `chatbot-notes-patch.md` to the live chatbot workflow
   (one pasted node, one JS edit, two `ai_prompts` row addenda).
5. **Point note sources at the webhook.** POST
   `{ user_id | email, note_text, source: individual|group, session_date, coach, external_ref }`
   to `/webhook/note-created` from wherever notes originate:
   - **Coach tooling / Rails admin:** an after-save hook.
   - **Fathom (session recordings):** a relay that maps the meeting summary →
     `note_text`, attendee email → `email`, call id → `external_ref`
     (`external_ref` is unique-indexed, so re-sends are deduped).
   - **Existing notes table:** if session notes already live in a Postgres
     table, add a Schedule trigger + "select new rows" Postgres node in front
     of `Normalize note payload` — the pipeline is source-agnostic.
6. **Verify** with the testing checklist below, then let the 06:00 batch run.

### Embeddings note (`client_notes_vectors`)

The ingestion flow stores note summaries + metadata into
`client_notes_vectors` with a NULL embedding — nothing queries this table yet
(the chatbot patch deliberately uses SQL context injection instead of a shared
vector tool; see the privacy warning in `chatbot-notes-patch.md`). When you
want per-user semantic search over notes, swap the "Store note vector row"
node for a PGVector *insert* node (+ Default Data Loader + your OpenAI
embeddings credential, matching `snippet_vectors`' 1536-dim family) and add
the filtered tool per the patch doc.

## Testing checklist

- **Note path:** POST a fake note for a test user → `client_note_insights`
  row appears with sane themes/focus areas → the re-rank fires → new rows in
  `user_snippets` + `mobile_recommended_content` whose `signals_used`
  contains `session_note_themes`.
- **Confidentiality:** read every `reason` for that run —
  `select reason from mobile_recommended_content order by id desc limit 10;`
  — none may reference notes, coaches, or sessions.
- **Cross-user isolation:** ingest notes for user A, chat/rank as user B →
  B's picks and chat show zero trace of A's themes.
- **Risk path:** POST a note with crisis language → `risk = 'elevated'` +
  Slack alert fires.
- **Idempotency:** re-POST the same note (`external_ref` unchanged) → no
  duplicate insight row; re-run the engine → no duplicate recs inside the
  60-day window.
- **Entitlement:** for a test user, confirm every `lesson`/`workshop` row in
  the ledger is accessible to them in the app (their program or
  subscription-role unlock).
- **Fallback:** break the Anthropic credential → app rail still renders
  (falls back to newest snippets); fix credential.

## Tuning knobs

| Knob | Where | Default |
|---|---|---|
| Picks per run | "Validate picks" (`slice(0, 5)` / `slice(0, 2)`) + prompt | 3–5 videos, ≤2 lessons |
| Note history depth | signals SQL notes lateral (`limit 5`) | last 5 notes |
| Signal priority | ranking prompt "priority order" list | notes → check-ins → wheel → lessons |
| No-repeat window | candidate + insert SQL (`interval '60 days'`) | 60 days |
| Candidate pool sizes | candidate SQL `limit 40` / `limit 30` | 40 videos, 30 lessons |
| "Active user" window (batch) | signals SQL `interval '14 days'` | 14 days |
| Batch cap | signals SQL `limit 500` | 500 users/run |
| Completed-lesson threshold | lesson candidates SQL (`progress_value >= 100`) | 100 (change if 0–1 scale) |
| Models | Anthropic nodes | `claude-opus-4-8` both flows (swap the ranker to `claude-haiku-4-5` if batch cost bites; keep Opus for note extraction — it's clinical). Never set `temperature`. |

## Patent alignment (provisional: Adaptive Behavioral-Health Treatment Planning…)

What this deployment implements today, mapped to the claim elements:

| Claim element | Implemented by |
|---|---|
| (a) multi-source data ingestion | check-ins (app + legacy assessments), Wheel of Life, lesson telemetry, **transcribed/group session notes**, addiction profile |
| (b) feature construction / longitudinal semantic representations | structured note-insight extraction (themes, concerns, wins, focus areas) + summary embeddings table; trend blocks in the chatbot context builder |
| (c) hybrid decision engine + explainability | rule layer = candidate SQL (entitlement, playability, recency windows); ML layer = Claude ranking; explainability = per-pick `reason` + `signals_used` snapshot |
| (d) safety manager + fallback | crisis guardrails in chat; elevated-risk note alerts; hard caps on picks/run + no-repeat windows; fallback = app's static evidence-based rail when the engine yields nothing |
| (g) contextual orchestration | event-driven re-ranking on check-in and on new session note + daily batch window |
| (h) provenance subsystem | append-only `mobile_recommended_content` ledger (inputs snapshot, model, prompt version, timestamp) |

Not yet implemented (roadmap, in rough order of value): dynamic temporal
windows (shorten re-rank cadence when risk/volatility rises — the `risk` field
in `client_note_insights` is the ready-made trigger), outcome optimization
(U = 0.6·ΔSymptom + 0.4·ΔEngagement — needs engagement telemetry on
recommended content), background adaptive re-ordering in the app UI,
hierarchical population models, and cryptographic hashing on the ledger rows.

## Files in this folder

- `recommendation-engine.workflow.json` — importable v3 engine.
- `notes-ingestion.workflow.json` — importable notes pipeline.
- `chatbot-notes-patch.md` — 10-minute patch for the live chatbot.
- `schema.sql` — all DB objects (run once; supersedes the old `log-table.sql`).
- `README.md` — this guide.
