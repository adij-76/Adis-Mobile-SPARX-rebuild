# Going live — step by step

A click-by-click guide to deploying the personalization system. No coding
required — every SQL snippet is copy-paste, every n8n step is spelled out.
Total time: roughly **45–60 minutes**, and you can stop safely after any part.

**What you're deploying, in plain terms:** a new n8n workflow (the
"recommendation engine") that reads each client's check-ins, Wheel of Life,
lesson history, **SOAP session notes**, and **approved treatment plan**, asks
Claude to pick the best videos + lessons/workshops for them, and writes the
picks where the app already looks. Plus two small edits to workflows you
already run (SOAP & chatbot) so everything stays in sync automatically.

**What you need before starting:**
- Login for your n8n instance (igntd.app.n8n.cloud).
- Login for the database SQL editor (Supabase dashboard, or wherever you run
  SQL against the same Postgres your n8n workflows use).
- The files from this folder on your computer: download
  `recommendation-engine.workflow.json` from GitHub (open the file in the repo
  → the "Download raw file" button, top-right of the file view).

---

## Part 1 — Pre-flight check (5 min)

In the SQL editor, paste and run this. It checks that every table the engine
uses actually exists in the database n8n talks to:

```sql
select t.name as required_table,
       case when to_regclass('public.' || t.name) is not null then '✅' else '❌ MISSING' end as status
from (values
  ('users'),('addictions'),('snippets'),('lessons'),('portions'),
  ('user_snippets'),('completed_lessons'),
  ('subscription_role_lessons'),('subscription_role_workshops'),
  ('wheel_of_life_scores'),('life_areas'),
  ('daily_assessments'),('daily_assessment_emotions'),('emotions'),
  ('mobile_checkins'),('mobile_wheel_entries'),('mobile_video_watches'),
  ('mobile_xp_events'),('mobile_assessment_responses'),
  ('ai_notes'),('ai_treatment_plan_items'),('sds_codes')
) as t(name);

-- and the app-context RPC (shipped from the app branch):
select public.mobile_ai_context(null) is not null as rpc_ok;
```

**Expected:** everything ✅. If `mobile_checkins` is ❌, that's OK — it just
means the new app's check-ins live in a different database; tell Claude (or
your developer) and we'll drop that one signal. Anything else ❌: stop and
ask before continuing.

## Part 2 — Create the ledger table (2 min)

1. In the SQL editor, open a new query.
2. Paste the entire contents of **`schema.sql`** (from this folder).
3. Click **Run**. Expected result: "Success. No rows returned."
4. Sanity check — run: `select count(*) from mobile_recommended_content;`
   Expected: `0`.

This is the only database change. It's a brand-new table; nothing existing is
touched, and the live app can't see it.

## Part 3 — Import the recommendation engine (10 min)

1. In n8n: **Workflows → (⋯ menu, top right) → Import from File…** → choose
   `recommendation-engine.workflow.json`.
2. The canvas opens with ~10 connected nodes. Three of them need credentials
   (they currently say "REPLACE"):
   - **Gather user signals + candidates** → open it → *Credential to connect
     with* → pick your existing **Postgres account** (the same one your
     chatbot uses) → close.
   - **Insert video recs (app rail)** and **Provenance ledger** → same
     Postgres credential.
   - **Claude (Anthropic)** → pick your existing **Anthropic account**
     credential. ⚠️ Leave *Options* empty — do **not** add Temperature
     (today's Claude models reject it and the node will error).
3. Click **Save** (top right), then flip the **Inactive → Active** toggle.
4. Grab the webhook address: open the **Webhook (check-in / note)** node →
   **Production URL** tab → copy the URL (ends in `/recommend-user`). Paste it
   somewhere handy — Parts 4 and 5 both need it.
5. *(Recommended)* Lock the webhook: in that same node set **Authentication →
   Header Auth** → *Create new credential* → Name: `X-Sparx-Key`, Value: a
   long random string → Save. Anything that calls this URL must now send that
   header (Parts 4–5 note where).

### First smoke test (don't skip)

1. Find a real test user id:
   `select user_id, count(*) from ai_notes group by 1 order by 2 desc limit 5;`
   — pick one `user_id` (call it **N**).
2. In the engine workflow, click the **Resolve run targets** node → click
   **Execute step** … actually easier: click **Execute workflow** (bottom) —
   with no webhook input it runs the *daily batch* path, OR pin a single user:
   open **Resolve run targets**, click *Execute step*, and if it shows no
   input, use the simpler route below.
3. Simpler route: from a terminal or any HTTP tool isn't needed — in the
   **Webhook** node click **Listen for test event**, then in a new browser
   tab you *can't* POST easily, so use n8n's own test: click **Execute
   workflow** and let the schedule branch run the batch. Watch the execution:
   green nodes left to right.
4. Verify in SQL:
   ```sql
   select * from mobile_recommended_content order by id desc limit 10;
   select * from user_snippets order by created_at desc limit 10;
   ```
   You should see fresh rows, each ledger row with a `reason` and a
   `signals_used` JSON blob. Read a few `reason`s — none may mention notes,
   coaches, sessions, or treatment plans.

## Part 4 — Auto re-rank after every session note (5 min)

Open `live-workflow-patches.md` → **Patch A**. Summary: in your live
`4.) SOAP & Note QA` workflow you paste one prepared HTTP-Request node, set
its URL to the Production URL from Part 3 (plus the Header-Auth credential if
you set one), connect `Call '6.) Treatment Plan'` → `Re-rank recommendations`,
and Save. From then on, every processed session note refreshes that client's
recommendations automatically.

## Part 5 — Fresh recs the moment someone checks in (5 min)

*(Only if `mobile_checkins` was ✅ in Part 1 — this covers check-ins from the
new mobile app.)*

1. Supabase dashboard → **Database → Webhooks → Create a new hook**.
2. Name: `checkin-rerank`. Table: `public.mobile_checkins`.
   Events: **Insert** only. Type: **HTTP Request**, Method: **POST**.
3. URL: the Production URL from Part 3.
4. If you set Header Auth: add HTTP header `X-Sparx-Key` = your value.
5. Save. Now a check-in in the app re-ranks that user within seconds — so the
   "Based on your inputs, we'd recommend…" screen is actually based on
   *today's* inputs.

## Part 6 — Make Sparky note- and plan-aware (15 min)

Open `live-workflow-patches.md` → **Patch B** and follow B1→B3 exactly
(B4 optional): paste one `Session_Notes` node into the `chatbot` workflow,
rewire two connections, paste two short blocks into the `Code in JavaScript`
node, and append the two provided paragraphs to your prompt rows in
`ai_prompts`. Each step in the patch doc has the exact text to paste.

## Part 7 — Full verification (10 min)

Run through this list; everything should pass before you call it live:

| # | Test | How | Pass looks like |
|---|---|---|---|
| 1 | Note → re-rank | Re-run a recent SOAP execution (open the workflow → Executions → pick one → *Retry*) | New `mobile_recommended_content` rows, `run_source='note'` |
| 2 | Confidentiality | `select reason from mobile_recommended_content order by id desc limit 20;` | No mention of notes/coach/sessions/plan |
| 3 | App rail | Sign into the app as the test user | "Recommended Videos" shows the new picks |
| 4 | Chat awareness | Chat as the test user about a topic near their last session | Suggestions tilt toward it, no note references |
| 5 | Isolation | Chat as a *different* user | Zero trace of the first user's themes |
| 6 | Idempotency | Run the engine twice for the same user | Second run inserts no duplicate videos |
| 7 | Fallback | (Optional) disable the engine workflow | App rail still renders (falls back to newest videos) |

## Part 8 — Wire the app-context RPC into the chatbot (10 min)

*(The engine already calls `mobile_ai_context` out of the box — this part is
for Sparky chat.)*

1. **Permission check first:** `live-workflow-patches.md` → Patch C0. One
   `select current_user;` from an n8n node, one `grant execute` in the SQL
   editor if the role isn't `postgres`, one verification call. Do not skip —
   this is the single most likely thing to silently no-op.
2. Apply Patch C1–C4 from `live-workflow-patches.md`: pass `authUid` through
   `Consolidate Data`, paste the `App_Context` node, extend the context
   builder, add the safety-flag line to the main prompt.
3. Note the design: the RPC node is **fail-open** (`alwaysOutputData` +
   continue-on-error). Older app builds that don't send `authUid` yet, or an
   RPC hiccup, degrade gracefully to exactly today's behavior — chat never
   breaks.

## The transition safety net (how you can't break things)

Read this once before you start; it's why each part is safe to attempt.

1. **Everything new fails open.** The engine is a separate workflow — toggle
   it off and the app instantly behaves exactly as today (the rail falls back
   to newest videos). Inside both the engine and the chatbot patches, every
   new node is set to continue-on-error: a dead RPC, a missing table, a
   permissions miss — the run degrades to the previous behavior instead of
   erroring out.
2. **Blue-green the chatbot (recommended for Part 6/8).** Don't edit the live
   chatbot directly:
   - In n8n: open `chatbot` → ⋯ menu → **Duplicate**. Rename the copy
     `chatbot v2`.
   - Apply Patches B and C to **the copy**. The copy gets its own webhook URL
     (open its Webhook node → Production URL).
   - Test the copy thoroughly (chat via its URL with test users).
   - Cut over by changing ONE thing: the GitHub repo variable
     **`SPARKY_WEBHOOK`** (repo → Settings → Secrets and variables → Actions →
     Variables) to the copy's URL, then re-run the Pages deploy (or push any
     commit to main). The live workflow is untouched.
   - **Instant rollback** = set the variable back and redeploy. Two minutes,
     zero data loss, and the original workflow never changed.
3. **Version history everywhere.** n8n keeps per-workflow version history
   (⋯ → Version history) — restore any prior save in one click. The repo keeps
   exports in `design/n8n-live/` — re-export *before* you start editing so the
   pre-change state is committed.
4. **The database changes are one new table and one already-shipped function.**
   `schema.sql` creates `mobile_recommended_content` (brand new, app-invisible)
   and touches nothing else. The RPC shipped from the app branch with execute
   revoked from clients. There is no destructive migration anywhere in this
   deployment.
5. **Writes are append-only and fenced.** The engine only ever INSERTs — into
   `user_snippets` (idempotent, 60-day fence) and the ledger. No UPDATE, no
   DELETE, no schema change at runtime. Worst case is "a few odd video picks,"
   which age out of the rail on their own.
6. **Test-user-first rule.** After each part, run the relevant check from
   Part 7 with a test account before assuming real users see it. Keep one
   test user with rich data (notes + assessments + check-ins) and one brand-new
   empty test user — the pair catches both overweighting and missing-data
   regressions.

## Rollback (if anything looks wrong)

- **Engine misbehaving:** open the workflow → toggle **Active → Inactive**.
  The app instantly falls back to its built-in behavior; nothing breaks.
- **Bad picks in the rail:** `delete from user_snippets where created_at > '<timestamp>' and id in (…);` — or just let them age out (rail shows newest 8).
- **Chatbot patch:** delete the `Session_Notes` node, reconnect
  `wol_data → Code in JavaScript`, and remove the pasted JS blocks. (n8n also
  keeps workflow version history: ⋯ menu → *Version history*.)
- The ledger table is append-only bookkeeping — it never needs rollback.

## Troubleshooting

| Symptom | Fix |
|---|---|
| A node shows a red warning after import | n8n version differences. Delete that node, add the same node type fresh from the palette, copy the parameters from the JSON file, reconnect. |
| "Gather user signals" errors mentioning a table name | Re-run Part 1; whichever table is ❌ is the culprit — tell Claude and we'll adjust that one signal. |
| Anthropic node errors about `temperature` or model | Remove any Options set on the node; confirm the model id is `claude-opus-4-8`. |
| Engine runs but zero rows written | Check the **Validate picks** node output in the execution view — if empty, the model returned ids outside the candidate pool (guard working as designed) or the user had no candidates. Try another user. |
| Webhook returns 403 | Header Auth mismatch — the caller (Supabase webhook / SOAP node) must send the exact header name + value. |

## What's deliberately NOT live yet

- **Lessons/workshops in the app UI** — they're accumulating in the ledger
  with reasons, ready for a "Suggested next lesson" card. That needs an app
  build + the commented view in `schema.sql`, shipped together (AGENTS.md
  lock-step rule). Say the word and that's the next build.
- **Exercises** — reserved in the ledger; wires up when the exercises library
  exists.
- **Dynamic cadence** (re-rank faster for higher-risk clients) and **outcome
  optimization** — see the roadmap in `README.md`.
