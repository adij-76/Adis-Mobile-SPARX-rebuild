# SPARx Recommendation Engine — n8n build guide (v2)

The n8n flow that turns a user's real data (check-ins, Wheel of Life, lesson
progress, addiction focus) into the personalised video picks the app shows on
the home "Recommended Videos" rail, the check-in summary screen, and the
Videos tab.

> **Where the live flow lives:** in the IGNTD n8n cloud instance — it is not in
> this repo. This folder is the versioned reference implementation: import
> `recommendation-engine.workflow.json` to replace/refine the live flow, and
> keep this folder as the source of truth for how it's wired. If you export the
> current live flow's JSON into this folder, future refinements can be made as
> reviewable diffs instead of rebuilds.

## The contract with the app (must stay true)

The app side is already built and deployed; the flow's only job is to write
rows the app can read.

```
n8n flow ──INSERT──▶ public.user_snippets (user_id, snippet_id, created_at)
                              │
                              ▼  (join snippets, email-scoped)
                     mobile_recommended_videos view          ← db/views.sql
                              │
                              ▼  (newest first, deduped, top 8)
        app: home rail · check-in summary · /videos · Sparky context
```

Hard rules, derived from `db/views.sql` and `src/api/supabase.ts`:

1. **INSERT-only into `user_snippets`.** It's a production table — never
   update/delete other rows, never alter its schema.
2. **Only recommend playable, classified snippets** (`classified = true` and
   `vimeo_id`/`vimeo_url` present). The view filters unplayable rows out, so a
   bad pick silently vanishes — wasted quota.
3. **Recency is the ordering signal.** The app sorts by `us.created_at desc`
   and de-duplicates by snippet id, keeping the newest 8. Inserting 3–5 fresh
   picks per run naturally rotates the rail.
4. **Empty is safe.** If the flow inserts nothing, the app falls back to the
   newest real snippets — so the flow can safely skip users with no signals.
5. **Never touch the `mobile_*` views from this flow.** View changes ship in
   lock-step with `main` (see `AGENTS.md`).

## What v2 refines

| Area | Before (v1 behaviour to avoid) | v2 |
|---|---|---|
| **Freshness** | Recs only as fresh as the last batch run; the check-in summary screen ("Based on your inputs…") shows stale picks | Second trigger: a Supabase Database Webhook on `mobile_checkins` INSERT re-ranks **that user immediately after they check in** |
| **Signals** | Little/none — picks not grounded in user data | Latest 5 check-ins (mood, emotion tags, use behaviour), 3 lowest Wheel of Life areas, last 5 lessons touched, addiction focus |
| **Hallucination** | Model may emit snippet ids that don't exist | Model chooses **only from a SQL-built candidate pool**; a Code node then drops any id not in that pool before insert |
| **Repeats** | Same video recommended over and over | Candidate pool excludes anything recommended to that user in the last 60 days; insert has a matching `NOT EXISTS` so re-runs are idempotent |
| **Playability** | Picks could be unclassified / videoless snippets that the view hides | Candidate SQL enforces `classified = true` + playable video up front |
| **Cost/scale** | Rank every user every run | Daily batch covers only users active in the last 14 days (capped at 500/run); everyone else gets the webhook path when they next check in |
| **Observability** | No record of why a video was picked | Optional `mobile_recommendation_log` table records reason/model/source per pick (`log-table.sql`) |
| **Model** | Old pinned model ids rot (the chat agent's `claude-sonnet-4-20250514` is now retired) | Pinned to `claude-opus-4-8`; **no `temperature`** — current Claude models reject sampling params |

## Architecture

```
Schedule (daily 06:00) ─┐
                        ├─▶ Resolve run targets ─▶ Gather user signals + candidates (1 SQL)
Webhook (post check-in) ┘         (Code)                        │  one row per user
                                                                ▼
                                              Rank with Claude (LLM chain)
                                                 ▲ Claude (claude-opus-4-8)
                                                 ▲ Structured Output (JSON schema)
                                                                │
                                                                ▼
                                                    Validate picks (Code)
                                                    · id ∈ candidate pool
                                                    · cap 5 · escape for SQL
                                                       ┌────────┴────────┐
                                                       ▼                 ▼
                                        INSERT user_snippets   INSERT mobile_recommendation_log
                                        (NOT EXISTS dedupe)    (optional, continue-on-error)
```

Everything runs against the **same Postgres** the app's Supabase views read —
no new services.

## Setup — step by step

1. **Import** `recommendation-engine.workflow.json` (*Workflows → Import from
   File*).
2. **Credentials** — open the nodes marked `REPLACE`:
   - the three **Postgres** nodes → your existing Postgres credential (same one
     Sparky uses);
   - **Claude (Anthropic)** → your Anthropic API key. Leave options empty — do
     **not** add `temperature` (current Claude models reject it with a 400).
3. *(Optional but recommended)* run `log-table.sql` once in the Supabase SQL
   editor to enable the per-pick reason log. Without it, the log node fails
   quietly (it's set to continue on error) and everything else still works.
4. **Save**, toggle **Active**. The daily batch now runs at 06:00 (n8n
   instance timezone — adjust the cron in "Daily 06:00" if you want a
   different hour).
5. **Instant post-check-in recs** (the biggest UX win): in Supabase,
   *Database → Webhooks → Create*: table `public.mobile_checkins`, event
   `INSERT`, method `POST`, URL = the workflow's **production** webhook URL
   (`https://igntd.app.n8n.cloud/webhook/recommend-user`). Supabase sends the
   inserted row as `body.record`; the flow reads `record.app_user_id`. Users
   whose check-in has no `app_user_id` (not linked to a production user) are
   skipped silently.
6. **Security:** unlike the Sparky webhook, this URL is never shipped in the
   app bundle — only Supabase calls it. Still, add **Header Auth** on the
   Webhook node and set the same header in the Supabase webhook config, so
   random POSTs can't burn Anthropic credit. (Same fix the pre-launch
   checklist wants for Sparky.)

## Testing checklist

- **Single-user dry run:** in n8n, run the workflow manually with pinned data
  on "Resolve run targets": `{ "user_id": <your users.id>, "source": "checkin" }`.
  Check the execution: candidates non-empty → 3–5 picks → inserted rows.
- **Verify in SQL:**
  `select * from user_snippets where user_id = <id> order by created_at desc limit 5;`
- **Verify in the app:** sign in as that user → home rail should show the new
  picks (newest first). The check-in summary screen reads the same rail.
- **Idempotency:** run it twice for the same user — the second run must insert
  0 rows for the same snippet ids (`NOT EXISTS` + 60-day window).
- **Batch:** trigger the schedule path manually; confirm it only picks up
  users with a `mobile_checkins` row in the last 14 days.
- **Failure mode:** temporarily break the Anthropic credential and confirm the
  app still shows the fallback rail (it does — the app treats an empty/missing
  view result as "fall back to newest snippets").

## Tuning knobs (all in one place)

| Knob | Where | Default |
|---|---|---|
| Picks per run | "Validate picks" Code node (`slice(0, 5)`) and the prompt ("3 to 5") | 3–5 |
| No-repeat window | candidate SQL + insert SQL (`interval '60 days'`) — keep the two in sync | 60 days |
| Candidate pool size | candidate SQL `limit 40` | 40 newest |
| "Active user" window (batch) | signals SQL `interval '14 days'` | 14 days |
| Batch cap | signals SQL `limit 500` | 500 users/run |
| Model | Claude node | `claude-opus-4-8` (swap to `claude-haiku-4-5` if the daily batch gets expensive — rankings from a fixed candidate list are a task it handles well; update the model string in the log node too) |
| Voice/criteria | the prompt inside "Rank with Claude" | Adi-voice, shame-free, variety |

## Phase 2 — lesson recommendations (not built yet)

Videos ship first because the app already renders them. Lessons need an
app-side surface, so they must land in lock-step with `main` (AGENTS.md):

1. **DB (additive, safe any time):** an app-owned
   `mobile_recommended_lessons_data` table (like the log table: `user_id`,
   `lesson_id`, `reason`, `created_at`; no app grants yet) + later an
   email-scoped `mobile_recommended_lessons` view joining `mobile_lessons`.
2. **Flow:** add a second candidate lateral (from `lessons`, excluding
   completed ones via `completed_lessons`, respecting the `accessible` gating
   logic from `mobile_lessons`) and a second output array in the schema
   (`recommended_lessons`), inserted into the new table.
3. **App:** a "Suggested next lesson" card (home or check-in summary) reading
   the new view. Merge app change to `main` **before or together with**
   granting the view to `authenticated`.

Also worth doing later: once the Sparky **ingestion workflow** exists
(`design/sparky-ai/README.md`, Workflow 2), snippet transcripts will have
pgvector embeddings — the candidate pool can then be *retrieved by similarity
to the user's check-in text* instead of "newest 40", which scales better as
the library grows. The ranking stage stays the same.

## Files in this folder

- `recommendation-engine.workflow.json` — importable workflow (triggers, SQL,
  prompt, guards, inserts all pre-wired).
- `log-table.sql` — optional per-pick reason log (run once).
- `README.md` — this guide.
