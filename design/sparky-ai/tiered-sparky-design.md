# Tiered Sparky — design (in progress)

**Decision (Adi, 2026-07-08):** ONE tier-aware workflow, not per-tier copies.
Rationale: this session applied 8 patches to a single flow; N copies would
mean N× every future fix plus silent drift. Tier is read at runtime and the
flow adjusts model, limits, context depth, and summaries.

## The four tiers (specifics to be uploaded by Adi)

| Tier | Context depth | Model | Usage limit | AI summaries |
|---|---|---|---|---|
| Free | **none** (base voice/method only, no personal data) | cheapest/fast | tight | no |
| Starter | **same-day only** (today's check-in/data, no history) | low-mid | moderate | no |
| Premium | **full** (notes, assessments, memory, engagement) | high | generous | **yes, everywhere** |
| Intensive | **full** + everything | highest | highest/unlimited | **yes, everywhere** |

(Model IDs, exact caps, and window definitions pending Adi's upload.)

## What varies by tier (the levers)

1. **Model** — agent model field = expression driven by tier (within one
   provider) OR a routing branch (if mixing providers). See "Provider" below.
2. **Usage limits** — a gate right after tier lookup counts the user's
   messages in the tier's window (from `ai_chat_responses`) vs the cap; over
   cap → warm upgrade-nudge message, AI not run.
3. **Context depth** — maps directly onto the consolidated context nodes we
   just built:
   - Free → **skip** Legacy_Context + App_Context entirely; assemble an empty
     context block (Sparky still has full voice/method from the system prompt).
   - Starter → run the context queries with a **same-day filter** (today's
     check-in only; no history, no notes, no cross-session memory).
   - Premium/Intensive → **full** (current behavior).
   Implemented as tier flags read inside the two context queries + the Code
   node (which already tolerates empty inputs — it prints "none/No data").
4. **AI summaries** — premium/intensive get generated summaries surfaced more
   places (e.g. rolling conversation summary / mobile_ai_profile). Flag:
   `ai_summaries` on/off per tier.

## Provider decision — PENDING (Adi wants cost/quality info; see chat)

- Option A: one provider (all OpenAI), model chosen by expression — no branch,
  most maintainable, voice carried by shared system prompt.
- Option B: mix (e.g. Claude for premium/intensive, OpenAI for free/starter) —
  adds one Switch/branch (2 agent nodes to keep in sync), buys Claude's
  warmth/nuance for the paying tiers (the reason Claude was chosen for the
  recommendation engine originally).
- Recommendation leaning: start with A to ship tiering fast + maintainable;
  add a branch to route top tiers to Claude later if the premium feel
  justifies it. Reversible either way.

## Tier lookup source — TO CONFIRM

`users.subscription_role_id` + `subscription_role_workshops`/`_lessons` tables
already drive content entitlement. If free/starter/premium/intensive map to
subscription roles, one small lookup reads tier — no new app plumbing. Confirm
with a scratch query once tier rules land.

## Build order (once specifics arrive)

1. Tier lookup node (right after Guardrails pass).
2. Usage-limit gate → upgrade-nudge branch.
3. Context-depth flags into Legacy_Context/App_Context + Code node.
4. Model-by-expression (or provider branch).
5. Summaries flag.
6. Smoke test one user per tier (free = no context, starter = same-day,
   premium = full; a capped user hits the nudge).
