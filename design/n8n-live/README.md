# Live n8n workflow exports (reference snapshots)

Read-only snapshots of the workflows running in the IGNTD n8n instance,
exported **2026-07-03**. They are archived here so that changes to the live
system can be reviewed as diffs — when you edit a live workflow, re-export it
(workflow ⋯ menu → *Download*) and replace the file here in the same PR.

| File | Live workflow | What it does |
|---|---|---|
| `chatbot.json` | `chatbot` | Sparky chat: guardrails/crisis detection → user context (coach, check-ins, wheel) → GPT main agent with recommendation + program-data sub-agents → Claude judge on the way out → Slack alerts + `ai_chat_responses` logging. Prompts load from the `ai_prompts` table. |
| `soap-note-qa.json` | `4.) SOAP & Note QA` | Session transcript → SOAP note (S/O/A/P ratings, narratives, quotes, measures, goals, actions) → QA agent (confidence, flags, supervision recommendation) → `ai_notes` + child tables → calls `6.) Treatment Plan`. |
| `treatment-plan.json` | `6.) Treatment Plan` | Reads the new `ai_notes` row → three-step agent chain (session analysis → evaluate/generate → safety review) → `ai_treatment_plan_items` (+ `ai_treatment_plan_session_log`), keyed by `get_or_create_ai_treatment_plan_id(user_id)`; approved item statuses 254183/254184. |
| `recommendation-engine-subworkflow.json` | `Recommendation Engine` | Sub-workflow variant of the in-chat recommendation agent (video/lesson vector tools + `sds_groups`). |

Note: these exports contain n8n credential *references* (ids/names), not
secrets. The pending patches to `chatbot` and `4.) SOAP & Note QA` are in
`../recommendation-engine/live-workflow-patches.md` — after applying them,
re-export and update these snapshots.
