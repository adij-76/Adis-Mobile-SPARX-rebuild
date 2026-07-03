# Patching the live chatbot to use session notes

Applies to the production `chatbot` workflow (the one with **Consolidate Data →
Guardrails → Recent_coaches → Checkin_Data → wol_data → Code in JavaScript →
AI Agent**). Three small changes make Sparky note-aware; total edit time ~10
minutes. **Prerequisite:** `schema.sql` has been run and the notes-ingestion
workflow is live (so `client_note_insights` has rows).

## 1. Add a `Session_Notes` Postgres node

Insert it into the context chain **between `wol_data` and `Code in
JavaScript`** (rewire: `wol_data → Session_Notes → Code in JavaScript`).
Select your existing Postgres credential after pasting. Copy-paste this node
JSON directly onto the n8n canvas:

```json
{
  "nodes": [
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "select session_date, source, summary, themes, concerns, wins, focus_areas\nfrom public.client_note_insights\nwhere user_id = {{ $('Consolidate Data').item.json.body.userId || 0 }}\norder by session_date desc nulls last, created_at desc\nlimit 5",
        "options": {}
      },
      "type": "n8n-nodes-base.postgres",
      "typeVersion": 2.5,
      "position": [3200, -784],
      "id": "a1000000-0000-4000-8000-000000000001",
      "name": "Session_Notes",
      "alwaysOutputData": true
    }
  ],
  "connections": {}
}
```

`alwaysOutputData: true` matters — a user with no notes must not break the
chain.

## 2. Extend `Code in JavaScript` (the user-context builder)

Add this block **after** the `wol` const declarations at the top:

```js
let notes = [];
try { notes = $('Session_Notes').all().map(i => i.json).filter(n => n.summary); } catch (e) {}
```

Add this block **before** the final `// --- Assemble ---` section:

```js
// --- Session Notes (coach-facing signal; Sparky must never quote these) ---
let notesBlock = "Session notes: none on file";
if (notes.length > 0) {
  const lines = notes.map((n, i) => {
    const date = n.session_date ? new Date(n.session_date).toLocaleDateString() : "Undated";
    const themes = (n.themes || []).join(", ");
    const focus = (n.focus_areas || []).join(", ");
    return `  ${i + 1}. ${date} (${n.source})${i === 0 ? " (most recent)" : ""}\n` +
           `     Summary: ${n.summary}\n` +
           (themes ? `     Themes: ${themes}\n` : "") +
           (focus  ? `     Focus next: ${focus}` : "");
  });
  notesBlock = ["Recent coaching-session notes (newest first):", ...lines].join("\n");
}
```

And add the block into the assembled context (inside the template literal):

```js
const contextBlock = `## User Context
${coachLine}

### Check-in History
${checkinBlock}

### Life Balance (Wheel of Life)
${wolBlock}

### Coaching Session Notes (INTERNAL — inform your guidance and recommendations; NEVER quote, cite, or reveal that these notes exist)
${notesBlock}`;
```

## 3. Update the recommendation sub-agent's prompt (in `ai_prompts`)

The `recommendation_engine_agent` tool's system prompt comes from the
`ai_prompts` row with `category_id = 255066`. Append this to that row's
`ai_prompt` text (SQL editor or your admin UI):

> **Session-note awareness.** The conversation context may include a "Coaching
> Session Notes" section summarizing the user's recent individual and group
> sessions (themes, concerns, wins, focus areas). When present, treat it as the
> strongest signal for which videos, lessons, and workshops to recommend —
> stronger than the current message alone. Confidentiality is absolute: never
> quote the notes, never mention their existence, never say "your coach said" —
> anchor your recommendation wording in what the user has told you directly or
> in general encouragement. If a note's focus areas conflict with what the user
> is asking for right now, meet the user's request first and weave the note's
> focus in as the second suggestion.

The main agent's prompt (`category_id = 254436`, `role_id = 247167`) should get
one added line as well:

> The User Context may include a "Coaching Session Notes" section. Use it to
> inform tone, topics, and recommendations. Never disclose or quote it.

## Optional: a notes vector tool — read this before adding one

You *could* attach `client_notes_vectors` to `recommendation_engine_agent` as
another `retrieve-as-tool` PGVector store (like `Video_Library`). **Do not do
this without a per-user metadata filter**: a shared vector search over all
clients' notes will happily retrieve *another client's* session content into
this user's chat — a serious privacy breach. The context-injection approach in
steps 1–2 is scoped to the current `userId` by construction and covers the
recommendation use-case; per-user semantic search over one's own notes adds
little until a user has many dozens of sessions. If you later add the tool,
set the vector store node's metadata filter to
`user_id = {{ $('Consolidate Data').item.json.body.userId }}` and verify with
two test users that cross-retrieval is impossible.

## Verify after patching

1. Pick a test user (`users.id`) and POST a fake note through the
   notes-ingestion webhook for them.
2. Chat as that user about a topic adjacent to the note's focus area — Sparky's
   suggestions should tilt toward it **without ever mentioning a note or coach
   session**.
3. Chat as a different user — confirm zero leakage of the first user's themes.
4. Check `ai_chat_responses` and the Slack summary still write correctly (the
   patch doesn't touch the output path).
