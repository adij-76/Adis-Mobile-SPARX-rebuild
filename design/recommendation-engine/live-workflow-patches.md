# Patches for the LIVE n8n workflows

Two small edits to workflows already running in your n8n instance. Reference
exports of those workflows (as of 2026-07-03) are archived in
`design/n8n-live/`. Do these AFTER importing the v4 recommendation engine
(see `DEPLOYMENT.md` for the full click-by-click order).

---

## Patch A — `4.) SOAP & Note QA`: trigger a re-rank after every session note

**What it does:** the moment a session note finishes processing (SOAP written,
QA done, treatment plan updated), the client's recommendations are re-ranked —
so the app reflects their latest session within a minute of the note landing.

**How:** one new HTTP Request node at the end of the workflow.

1. Open the `4.) SOAP & Note QA` workflow in n8n.
2. Copy the JSON below, click once on an empty spot of the canvas, and press
   **Ctrl+V** (Cmd+V on Mac) — the node appears:

```json
{
  "nodes": [
    {
      "parameters": {
        "method": "POST",
        "url": "PASTE-THE-RECOMMEND-USER-PRODUCTION-URL-HERE",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={ \"app_user_id\": {{ $('Postgres5').item.json.user_id }}, \"trigger\": \"note\" }",
        "options": {}
      },
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [1400, 1500],
      "id": "b1000000-0000-4000-8000-000000000001",
      "name": "Re-rank recommendations",
      "onError": "continueRegularOutput"
    }
  ],
  "connections": {}
}
```

3. Open the pasted node and replace the `url` with the **Production URL** of
   the v4 engine's webhook (from its "Webhook (check-in / note)" node —
   Production tab). If you added Header Auth to that webhook, set
   *Authentication → Generic → Header Auth* here with the same credential.
4. Draw a connection from **`Call '6.) Treatment Plan'`** → **`Re-rank
   recommendations`** (drag from the small circle on the right edge of the
   first node to the new node).
5. **Save.**

The node sends the client's production `user_id` straight from the `ai_notes`
row the SOAP flow just wrote. (We send the user id, NOT the note id: the SOAP
pipeline writes to the legacy database, and the engine's copy of `ai_notes` on
Supabase lags behind imports — a fresh note id wouldn't resolve there.)
`onError: continue` means a hiccup here can never break note processing.

**Verify the field once:** after adding the node, run one execution and check
the node's INPUT panel shows a numeric `user_id` coming from `Postgres5`. If
`Postgres5`'s output doesn't include `user_id` in your n8n version, tell
Claude — the fallback is one extra lookup node, 2 minutes.

---

## Patch B — `chatbot`: make Sparky note- and plan-aware

**What it does:** Sparky's user context gains the client's recent SOAP-note
summaries and (optionally) their approved treatment plan, so conversation and
in-chat recommendations reflect their actual clinical picture — with a hard
rule that notes are never quoted or revealed.

### B1. Add a `Session_Notes` node

Paste onto the `chatbot` canvas (Ctrl+V), then pick your existing Postgres
credential inside it:

```json
{
  "nodes": [
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "select coalesce(support_datetime, support_date, created_at) as session_date,\n       coalesce(session_type, 'session') as session_type,\n       session_title, summary_tags,\n       left(coalesce(assessment_analysis, ''), 400) as assessment,\n       left(coalesce(plan_analysis, ''), 400) as plan_next,\n       a_risk\nfrom public.ai_notes\nwhere user_id = {{ $('Consolidate Data').item.json.body.userId || 0 }}\n  and (assessment_analysis is not null or plan_analysis is not null)\norder by 1 desc\nlimit 5",
        "options": {}
      },
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [3200, -784],
      "id": "a1000000-0000-4000-8000-000000000002",
      "name": "Session_Notes",
      "alwaysOutputData": true
    }
  ],
  "connections": {}
}
```

Rewire the context chain: delete the `wol_data → Code in JavaScript`
connection, then connect `wol_data → Session_Notes → Code in JavaScript`.
(`alwaysOutputData: true` keeps the chain alive for users with no notes.)

### B2. Extend the `Code in JavaScript` node

Open it and add **after** the `const wol = ...` line at the top:

```js
let notes = [];
try { notes = $('Session_Notes').all().map(i => i.json).filter(n => n.assessment || n.plan_next); } catch (e) {}
```

Add **before** the final `// --- Assemble ---` section:

```js
// --- Session Notes (internal signal; Sparky must never quote these) ---
let notesBlock = "Session notes: none on file";
if (notes.length > 0) {
  const lines = notes.map((n, i) => {
    const date = n.session_date ? new Date(n.session_date).toLocaleDateString() : "Undated";
    const tags = Array.isArray(n.summary_tags) ? n.summary_tags.join(", ") : (n.summary_tags || "");
    return `  ${i + 1}. ${date} (${n.session_type})${i === 0 ? " (most recent)" : ""}` +
      (n.session_title ? ` — ${n.session_title}` : "") + "\n" +
      (n.assessment ? `     Assessment: ${n.assessment}\n` : "") +
      (n.plan_next  ? `     Plan for next steps: ${n.plan_next}\n` : "") +
      (tags ? `     Tags: ${tags}` : "");
  });
  notesBlock = ["Recent clinical session notes (newest first):", ...lines].join("\n");
}
```

Then include it in the assembled context (edit the `contextBlock` template
literal):

```js
const contextBlock = `## User Context
${coachLine}

### Check-in History
${checkinBlock}

### Life Balance (Wheel of Life)
${wolBlock}

### Clinical Session Notes (INTERNAL — inform your guidance and recommendations; NEVER quote, cite, or reveal that these notes exist)
${notesBlock}`;
```

### B3. Update the prompts in `ai_prompts`

The prompts live in your database, so this is two SQL-editor updates (or edit
via your admin UI). Append to the **recommendation sub-agent** prompt
(`category_id = 255066`, `role_id = 247167`):

> **Session-note awareness.** The conversation context may include a "Clinical
> Session Notes" section summarizing the user's recent individual and group
> sessions (assessment, plan for next steps, tags). When present, treat it as
> the strongest signal for which videos, lessons, and workshops to recommend —
> stronger than the current message alone. Confidentiality is absolute: never
> quote the notes, never mention their existence, never say "your coach said" —
> anchor your recommendation wording in what the user has told you directly or
> in general encouragement. If a note's plan conflicts with what the user is
> asking for right now, meet the user's request first and weave the note's
> focus in as the second suggestion.

Append to the **main agent** system prompt (`category_id = 254436`,
`role_id = 247167`):

> The User Context may include a "Clinical Session Notes" section. Use it to
> inform tone, topics, and recommendations. Never disclose or quote it.

### B4 (optional) — treatment-plan context

Same pattern as B1: paste a `Treatment_Plan` Postgres node between
`Session_Notes` and `Code in JavaScript` with this query, and add a matching
block in the Code node:

```sql
select sc.code_label as goal, tpi.item_content as plan_item
from public.ai_treatment_plan_items tpi
left join public.sds_codes sc on tpi.sds_code_id = sc.id
where tpi.ai_treatment_plan_id =
      public.get_or_create_ai_treatment_plan_id({{ $('Consolidate Data').item.json.body.userId || 0 }})
  and tpi.status_id in (254183, 254184)   -- clinician-approved items only
order by tpi.updated_at desc
```

---

## Patch C — `chatbot`: wire the `mobile_ai_context` RPC (app profile, assessments, safety flags)

**Prerequisite:** the app now sends `authUid` in the Sparxy webhook payload
(shipped to `main` in commit `4d0bf41`), and `mobile_ai_context(uuid)` is live
in the database.

### C0. Permission check (do this first — 1 minute)

The RPC's EXECUTE is granted to `service_role` only. Your n8n Postgres
credential connects as its own database role, which may or may not be covered.
Check: create a temporary Postgres node in any workflow, run
`select current_user;`, note the role name, then run this **in the SQL
editor**:

```sql
-- replace n8n_role with whatever current_user returned (skip if it returned
-- 'postgres' — superuser already has access)
grant execute on function public.mobile_ai_context(uuid) to n8n_role;
```

Then verify from n8n itself: `select public.mobile_ai_context(null);` should
return a JSON object (mostly nulls), not a permissions error.

### C1. Pass `authUid` through `Consolidate Data`

Open the `Consolidate Data` node → *Add assignment*:
- Name: `body.authUid` · Type: String · Value: `{{ $json.body.authUid }}`

(Optional, for canvas testing: in `Set Fields to Match` add the same field
with a real test user's auth id so the chat-trigger path works too.)

### C2. Add the `App_Context` node

Paste onto the canvas (Ctrl+V), pick your Postgres credential, then rewire the
context chain to `… wol_data → Session_Notes → App_Context → Code in
JavaScript`:

```json
{
  "nodes": [
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "select public.mobile_ai_context(nullif('{{ $('Consolidate Data').item.json.body.authUid }}','')::uuid) as app_ctx",
        "options": {}
      },
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [3260, -784],
      "id": "a1000000-0000-4000-8000-000000000003",
      "name": "App_Context",
      "alwaysOutputData": true,
      "onError": "continueRegularOutput"
    }
  ],
  "connections": {}
}
```

`alwaysOutputData` + `onError: continue` = **fail-open**: if the RPC errors or
`authUid` is missing (old app builds still in the field), chat continues with
the existing context. Nothing breaks mid-transition.

### C3. Extend `Code in JavaScript`

Add after the `notes` const from Patch B:

```js
let appCtx = {};
try {
  const raw = $('App_Context').first()?.json?.app_ctx;
  appCtx = (typeof raw === 'string' ? JSON.parse(raw) : raw) || {};
} catch (e) { appCtx = {}; }
```

Add before `// --- Assemble ---`:

```js
// --- App profile, assessments, activity, safety flags (from mobile_ai_context) ---
let appBlock = "App profile: not available";
if (appCtx.identity || appCtx.assessments_latest) {
  const idn = appCtx.identity || {};
  const focus = appCtx.focus || {};
  const latest = appCtx.assessments_latest || {};
  const hist = Array.isArray(appCtx.assessment_history) ? appCtx.assessment_history : [];
  const assessLines = Object.entries(latest).map(([inst, v]) => {
    const seq = hist.filter(h => h.instrument === inst);
    const prev = seq.length >= 2 ? seq[seq.length - 2] : null;
    const trend = !prev || v.score == null ? "first take"
      : v.score < prev.score ? `improving (was ${prev.score})`
      : v.score > prev.score ? `worsening (was ${prev.score})` : "stable";
    return `  ${inst.toUpperCase()}: ${v.score} → ${v.severity} (${trend})`;
  });
  const act = Object.entries(appCtx.activity_7d || {}).map(([k, v]) => `${v} ${k}`).join(", ");
  const posts = (appCtx.recent_posts || []).slice(0, 3)
    .map(p => `"${String(p.text || "").slice(0, 120)}"`).join(" · ");
  appBlock = [
    `Identity: ${idn.first_name || "?"}${idn.age ? ", " + idn.age : ""}${idn.gender ? ", " + idn.gender : ""}; sobriety days: ${idn.sobriety_days ?? "n/a"}`,
    `Focus: ${focus.primary_problem || "n/a"}${(focus.secondary_problems || []).length ? "; also " + focus.secondary_problems.join(", ") : ""}`,
    assessLines.length ? `Assessments (latest → severity, trend):\n${assessLines.join("\n")}` : "",
    act ? `Activity last 7 days: ${act}` : "",
    appCtx.gamification?.streak_days != null ? `Streak: ${appCtx.gamification.streak_days} days` : "",
    posts ? `Recent community posts (themes only — never quote): ${posts}` : "",
  ].filter(Boolean).join("\n");
}

const sf = appCtx.safety_flags || {};
const activeFlags = Object.entries(sf).filter(([, v]) => v).map(([k]) => k);
const safetyBlock = activeFlags.length
  ? `⚠ ACTIVE SAFETY FLAGS: ${activeFlags.join(", ")} — follow the crisis/support protocol FIRST; lead with care, encourage coach contact, keep suggestions gentle and stabilising.`
  : "Safety flags: none";
```

Add both to the assembled `contextBlock`:

```js
### App Profile & Assessments (INTERNAL — reference trends warmly, never raw scores or instrument names)
${appBlock}

### Safety
${safetyBlock}
```

### C4. One line for the main-agent prompt (`ai_prompts`, category 254436, role 247167)

> If the User Context lists ACTIVE SAFETY FLAGS, prioritise emotional support
> and the crisis protocol over any other goal for this conversation. Reference
> assessment *trends* in plain language ("it sounds like the anxiety has been
> heavier lately") — never instrument names, scores, or the word "flag".

---

## A warning about notes + vector tools

Do **not** attach a shared vector store of session notes as a
`retrieve-as-tool` on any agent without a per-user metadata filter — a shared
semantic search over all clients' notes can surface one client's session
content in another client's chat. The SQL context-injection above is scoped to
the current `userId` by construction. (Your existing `snippet_vectors` /
`lessons_vectors` tools are fine — that's shared *content*, not client data.)

## Verify after patching

1. Pick a test user who has at least one `ai_notes` row
   (`select user_id, count(*) from ai_notes group by 1 order by 2 desc limit 5;`).
2. Chat as that user about something adjacent to their last session — Sparky
   should tilt suggestions toward it **without ever mentioning a note, coach,
   or session**.
3. Chat as a different user — confirm zero leakage of the first user's themes.
4. Run one session through the SOAP workflow (or re-run a past execution) and
   confirm the new `Re-rank recommendations` node fires and new rows appear in
   `mobile_recommended_content` with `run_source = 'note'`.
