# SPARx Recommendation Engine — n8n build guide (v4)

The n8n pipeline that turns a client's real data — daily check-ins, Wheel of
Life, lesson progress, addiction focus, **SOAP session notes**, and the
**clinician-approved treatment plan** — into personalised content: video
snippets today (the app's "Recommended Videos" rail, check-in summary, Videos
tab), lessons and workshops in the same ledger, and exercises when that
library lands.

This is the deployment vehicle for the patent-pending **Adaptive
Behavioral-Health Treatment Planning and Delivery System** (see
"Patent alignment" below).

> **New here? Start with `DEPLOYMENT.md`** — the click-by-click go-live guide.
> This README is the technical reference behind it.

> **Where the live flows run:** the IGNTD n8n cloud instance. This folder is
> the versioned source of truth for the engine; snapshots of the other live
> workflows it plugs into are in `../n8n-live/`.

## How it fits your existing pipeline

Your production system already turns sessions into structured clinical data:

```
session recording → transcript → 4.) SOAP & Note QA ──▶ ai_notes (+ goals/actions/measures/QA flags)
                                        │
                                        └─▶ 6.) Treatment Plan ──▶ ai_treatment_plan_items
                                                                   (safety-reviewed; clinician approves)
```

The v4 engine sits downstream of that and closes the loop to the app:

```
Daily 06:00 batch ────────────┐
Supabase webhook               │
(mobile_checkins INSERT) ──────┼──▶ Resolve targets ─▶ Gather signals + candidates (1 SQL)
SOAP workflow, after each      │      · ai_notes (last 5 SOAP notes)
note (Patch A) ────────────────┘      · ai_treatment_plan_items (approved items)
                                      · app + legacy check-ins · wheel · lesson history
                                      · video pool · entitled lesson/workshop pool
                                                 ▼
                                      Rank with Claude (structured output)
                                                 ▼
                                      Validate picks (hallucination guard)
                                       ┌─────────┴──────────────┐
                                       ▼                        ▼
                            user_snippets (videos —   mobile_recommended_content
                            live app contract)        (ALL picks + reason + signal
                                                       snapshot = provenance ledger)

chatbot (patched per live-workflow-patches.md Patch B):
Session_Notes (+ optional Treatment_Plan) → user-context block →
note-aware conversational recommendations, hard never-quote rule
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

## Design decisions worth knowing

- **Notes come straight from `ai_notes`.** No separate ingestion pipeline:
  the SOAP workflow already produces structured, QA'd notes. The engine reads
  the assessment/plan narratives + `summary_tags` + `a_risk` (never raw
  transcripts or quotes) for the 5 most recent notes.
- **Every signal always flows in; priority is conditional, not exclusive.**
  Check-ins (app + legacy assessments), the Wheel of Life, and lesson history
  are ranked for every user on every run. Two explicit prompt rules govern
  the edges: **acute-state override** — a crisis-level or heavy-slip check-in
  outranks the treatment plan, steering that run toward stabilising,
  shame-free content first; and **missing data is neutral** — empty notes or
  an empty plan (client hasn't done 1:1/group sessions) is treated as "no
  information", never as a negative signal, and never reduces pick count or
  quality.
- **The treatment plan is the top-priority signal (when present).** Only clinician-APPROVED
  items (`status_id in (254183, 254184)`), latest per goal code, resolved via
  the same `get_or_create_ai_treatment_plan_id(user_id)` function the
  Treatment Plan workflow uses. Recommendations are prompted to *serve the
  plan's goals*. (For a user with no plan yet the function creates an empty
  shell — harmless; their next session creates it anyway.)
- **Hallucination guard:** the model may only pick ids from the SQL-built
  candidate pools; a Code node drops anything else before insert.
- **Entitlement guard:** lesson/workshop candidates mirror the app's
  `accessible` logic (user's program, or subscription-role unlocks), exclude
  completed lessons and anything recommended in the last 60 days.
- **Idempotent writes:** videos insert with a `NOT EXISTS` + 60-day window;
  re-runs never duplicate.
- **Provenance:** every pick appends to `mobile_recommended_content` with
  reason, the exact `signals_used` snapshot, model id, prompt version
  (`v4`), and run source (`daily` / `checkin` / `note`). Append-only.
- **Confidentiality:** prompts forbid user-facing reasons from quoting or
  revealing notes, coaches, sessions, or the treatment plan — clinical data
  shapes *what* is picked, never what is *said*. The chatbot patch carries
  the same rule, and warns against unfiltered shared vector search over
  client notes (cross-client leakage).
- **Activity definition (daily batch):** users with an app check-in OR an
  `ai_notes` row in the last 14 days, capped at 500/run.

## Testing checklist

See `DEPLOYMENT.md` Part 7 for the full pass/fail table. The essentials:
note → re-rank works; reasons never reference clinical sources; app rail
shows picks; chat tilts without disclosure; cross-user isolation holds;
re-runs don't duplicate; disabling the engine leaves the app healthy.

## Tuning knobs

| Knob | Where | Default |
|---|---|---|
| Picks per run | "Validate picks" (`slice(0, 5)` / `slice(0, 2)`) + prompt | 3–5 videos, ≤2 lessons |
| Note history depth | signals SQL `ai_notes` lateral (`limit 5`) | last 5 notes |
| Signal priority | ranking prompt "priority order" list | plan+notes → check-ins → wheel → lessons |
| Approved-status ids | treatment-plan lateral (`254183, 254184`) | matches Treatment Plan workflow |
| No-repeat window | candidate + insert SQL (`interval '60 days'`) | 60 days |
| Candidate pool sizes | candidate SQL `limit 40` / `limit 30` | 40 videos, 30 lessons |
| "Active user" window (batch) | signals SQL (`interval '14 days'`) | 14 days |
| Batch cap | signals SQL `limit 500` | 500 users/run |
| Completed-lesson threshold | lesson candidates SQL (`progress_value >= 100`) | 100 (change if 0–1 scale) |
| Model | Anthropic node | `claude-opus-4-8` (swap to `claude-haiku-4-5` if batch cost bites; update the ledger's model string too). Never set `temperature`. |

## Patent alignment (provisional: Adaptive Behavioral-Health Treatment Planning…)

What the deployed system implements, mapped to the claim elements — spanning
your existing workflows plus this engine:

| Claim element | Implemented by |
|---|---|
| (a) multi-source data ingestion | transcribed 1:1/group sessions (SOAP pipeline), validated daily assessments + app check-ins, Wheel of Life, lesson telemetry, addiction profile |
| (b) feature construction / longitudinal semantic representations | SOAP structuring (S/O/A/P narratives, quotes, measures, goals), QA confidence scores, summary tags; trend blocks in the chatbot context |
| (c) hybrid decision engine + explainability | rules = candidate SQL (entitlement, playability, recency, approved-plan filter); ML = Claude ranking + treatment-plan generation agents; explainability = per-pick `reason` + `signals_used`, per-note QA confidence + flags |
| (d) safety manager + fallback | Treatment Plan safety-review agent + safety gate; chat crisis guardrails; note QA supervision flags; pick caps + no-repeat windows; fallback = app's static evidence-based rail |
| (g) contextual orchestration | event-driven re-ranking on check-in and on every processed session note, plus the daily batch window |
| (h) provenance subsystem | append-only `mobile_recommended_content` (signal snapshot, model, prompt version, timestamp) + `ai_treatment_plan_session_log` + QA flag tables |

Clinician-collaborative mode = approved treatment-plan items gating the
engine; user-visible automated mode = the app rail with reasons; background
adaptive mode = re-ranked rail ordering. Roadmap (not yet implemented):
dynamic temporal windows (shorten re-rank cadence when `ai_notes.a_risk` or
QA urgency rises), outcome optimization (U = 0.6·ΔSymptom + 0.4·ΔEngagement —
needs engagement telemetry on recommended content), hierarchical population
models, cryptographic hashing on ledger rows.

## Files in this folder

- `DEPLOYMENT.md` — **start here**: click-by-click go-live guide.
- `recommendation-engine.workflow.json` — importable v4 engine.
- `live-workflow-patches.md` — paste-able patches for the live SOAP + chatbot
  workflows.
- `schema.sql` — the one new DB object (provenance ledger); run once.
- `README.md` — this reference.

Live-workflow snapshots (chatbot, SOAP & Note QA, Treatment Plan,
recommendation sub-workflow) live in `../n8n-live/`.
