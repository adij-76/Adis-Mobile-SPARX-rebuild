# ai_prompts v2 cutover — run AFTER the green copy proves stable (~48h)

**Goal:** move the v2 prompts from being hardcoded in the green workflow's
nodes into the `ai_prompts` table, and restore the workflow's table lookups —
so the admin backend ("Chatbot", "Chatbot Safety", …) becomes the live edit
surface for Sparky's prompts again.

**Pre-check before starting:** green copy's Executions tab shows normal
traffic and no error streak since the flip.

## Step 1 — backup the v1 rows (scratch workflow, 🔴 Postgres account)

```sql
create table ai_prompts_bak_v1_20260708 as
select * from ai_prompts
where status_id = 247191
  and category_id in (254436, 255020, 255066, 255067);
-- expect 5 rows. Rollback at any time = restore ai_prompt from this table.
```

## Step 2 — update the rows to v2

The exact UPDATE statements are generated at cutover time from
`prompt-suite-v2.md` (Claude preps them — texts are long and need SQL
escaping; don't hand-build). Row targets, per the verified map:

| Row | category_id / role_id | v2 source |
|---|---|---|
| Chatbot (System) 255176 | 254436 / 247167 | suite §1 |
| Chatbot (User) 255175 | 254436 / 247168 | suite §2 |
| Chatbot Safety (System) 255021 | 255020 / 247167 | suite §5 |
| Chatbot - Reccomendation (System) 255064 | 255066 / 247167 | suite §3 |
| Chatbot - Program Data (System) 255065 | 255067 / 247167 | suite §4 |

Note: rows store HTML today; plain markdown text passes through the
workflow's html→markdown node essentially unchanged, so v2 can be stored as
plain text. Future edits via the backend's rich-text editor also survive the
conversion.

## Step 3 — restore the green copy's table lookups

For the **per-message, recommendation, program-data, and judge** prompts:
restore each agent node's prompt field to its original expression (the
`{{ $('Markdown - …').item.json.data }}` reference — copy from the archived
`design/n8n-live/chatbot.json` if unsure). Publish.

**EXCEPTION — the main system prompt stays hardcoded in the node.** The v2
main prompt injects the live user id via an n8n expression
(`{{ $('Consolidate Data').item.json.body.userId }}`), which only works in a
node field — table-served text is data, not evaluated. (v1 had this bug: the
table's literal `{{ user_id }}` was never substituted; the model saw the
braces.) So: the "Chatbot (System)" table row is updated for reference and
backend visibility, but live edits to the MAIN prompt are made in the agent
node. All four other prompts become backend-editable.

## Step 4 — verify

Re-run smoke tests 1 (struggle → coaching voice) and 4 (crisis phrase →
crisis script) through the tester with a FRESH uuid sessionId. Both pass →
cutover complete.

## Rollback

`update ai_prompts p set ai_prompt = b.ai_prompt from ai_prompts_bak_v1_20260708 b where b.id = p.id;`
(and re-hardcode the nodes from the suite if needed — the green workflow's
version history also keeps every published state).
