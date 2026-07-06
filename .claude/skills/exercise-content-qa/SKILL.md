---
name: exercise-content-qa
description: The triple-check process for bringing a new module's lesson exercises live (introspect real content → structural pass → render pass → editorial pass → rollout). Follow this whenever enabling the next module in mobile_exercise_rollout or QA-ing exercise content changes.
---

# Lesson-exercise content QA — the module rollout process

Exercises ship **module by module** (`mobile_exercise_rollout` gates the
`mobile_lesson_exercises` view). Before enabling a module, run ALL THREE passes
below against its REAL content. Module 1 (portion 2, lessons 5–9) was the
first run of this process; `docs/lesson-exercises-spec.md` is the background.

## ⚠️ Ground rules (learned the hard way)

- **This repo is PUBLIC — so are its Actions logs.** Course content is paid
  IP. Never commit question/label text into the repo, keep introspection dumps
  clipped, and **delete the workflow run logs immediately after extracting**
  (`actions_run_trigger` → `delete_workflow_run_logs`, or the ⋯ menu on the run).
- The build sandbox cannot reach Supabase. The bridge is the
  **apply-migrations workflow dispatch** (`file=<name>.sql` input runs one
  `db/` file via psql; query output prints into the run log).
- Production content edits go through a **guarded, idempotent
  `db/fix-<module>-content.sql`** (WHERE clauses pin id + current state so
  re-runs are no-ops; SELECT before/after so the log proves the change).
  See `db/fix-module1-content.sql` for the shape.

## Step 0 — Pull the module's real content

Copy `db/introspect-module1.sql` → `db/introspect-module<N>.sql`, change the
`p."order" = <N>` filter, push to a branch, dispatch apply-migrations with
`file=introspect-module<N>.sql` on that branch ref, pull the job log, split
the marker sections (SUMMARY / QUESTIONS ndjson / VIEW-CHECK), **then delete
the run logs**. Keep the ndjson in the session scratchpad only.

## Pass 1 — Structural (SQL)

- `scripts/test-lesson-exercises.sh` still green (throwaway Postgres 16).
- VIEW-CHECK: after enabling the module (or simulating in the harness), the
  view serves the expected row/lesson counts.
- From the ndjson, verify per question:
  - `widget` is in the map (14/4/0→text-ish, 13 scale, 2/6 choice, 7 date,
    12 content, 5 display). **Any other value falls back to a text input** —
    decide whether that's right and extend the view's CASE if not.
  - `scale` (13) has sane `min`/`max` and endpoint labels in `options`.
  - `select`/`multiselect` (2/6) actually have `options`.
  - `required` flags make sense (a required content block is a bug).

## Pass 2 — Render (drive the app)

Use the project **verify** skill (Expo web + mock + Playwright). Walk every
worksheet shape the module contains, checking:

- **Headings**: outline-numbered titles ("1", "2b") are auto-suppressed;
  anything else ugly → editorial list.
- **HTML**: prompts are TinyMCE soup. The sanitizer keeps p/strong/em/a/lists
  and **drops `<table>`, `<img>`, `<iframe>` content entirely** — if a label
  relies on those, flag it (the member would see a hole).
- **Long content** (`label_len` ≳ 4000): scrolls fine, but consider splitting
  in the DB.
- **Links** in content: old web URLs (`sparx.igntd.com/...`) open the legacy
  site — editorial candidates for in-app routes.
- **Feature signals** (content edits can break these — recheck after edits):
  - *Statement sheet* = every answerable question is `text` (≥2) → composed
    statement page + print + share.
  - *Community CTA* = a content block titled like "Post to Community"
    (`/post .*communit/i`) → the statement page's share button.
  - *Print row* appears on every content step (web only).
- **Resume/XP**: partial sheet resumes at first unanswered; first completion
  awards once; retakes don't.

## Pass 3 — Editorial (report to Adi)

Produce a per-lesson table: sheets, question counts, widget mix, and every
oddity found (misplaced questions, ordering, duplicate sections, empty
titles, per-addiction blocks, widget-0 legacies). For agreed fixes, write the
guarded fix file, dispatch it, verify before/after in the log, delete logs,
re-run Step 0 to confirm the final state.

## Rollout + live check

1. `insert into mobile_exercise_rollout (module_id, note) values (<portions.id>, 'module N');`
   (SQL editor, or a dispatched one-off file) — live instantly.
2. Re-dispatch the introspection: VIEW-CHECK counts should now include the module.
3. On the live site, open one lesson of the module: worksheets render, answers
   save (check `mobile_exercise_responses` rows), celebration fires, Sparxy
   summary reads the answers.
4. Anything user-visible that needs app code → branch, PR, merge (deploys from
   `main` only; DB views must stay additive across the transition — AGENTS.md).
