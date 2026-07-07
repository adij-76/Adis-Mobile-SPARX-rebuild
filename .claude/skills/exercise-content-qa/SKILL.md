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
  - `scale` (13): real legacy scales are **labeled Likert lists** — `min`/`max`
    are 0/0 or null and every point's label is in `options` (modules 2-3 have
    3-7 options). The renderer shows labeled rows when `options.length >= 2`
    (`isLabeledScale`) and stores `{json: 0-based index, text: label}`; the
    numeric strip only fires for option-less scales. A scale with NO options
    and NO usable min/max is a content bug — flag it.
  - `select`/`multiselect` (2/6) actually have `options`.
  - `required` flags make sense (a required content block is a bug).
  - `display` (5) can be BULK (module 3: 117 of 400 questions) — they're the
    legacy compute engine's score readouts (`source_id`/`compute_type`),
    hidden in the app; all-display sheets are auto-hidden from the list.
    Report the hidden count so Adi knows what feedback members aren't seeing.

## Pass 2 — Render (drive the app)

Use the project **verify** skill (Expo web + mock + Playwright). Walk every
worksheet shape the module contains, checking:

- **Headings**: outline-numbered titles ("1", "2b") are auto-suppressed;
  anything else ugly → editorial list.
- **HTML**: prompts are TinyMCE soup. The sanitizer keeps p/strong/em/a/lists,
  **tables** (bordered + x-scrollable on web, " · "-separated text on native)
  and **https `<img>`** stripped to src+alt (module 3's optical-illusion
  sheets depend on their images). `<iframe>`/scripts/handlers stay dropped.
  On NATIVE builds images don't render (plain-text fallback) — flag any new
  image-dependent sheet as a known native gap.
- **Long content** (`label_len` ≳ 4000): scrolls fine, but consider splitting
  in the DB.
- **Links** in content: old web URLs (`sparx.igntd.com/...`) open the legacy
  site — editorial candidates for in-app routes.
- **Feature signals** (content edits can break these — recheck after edits):
  - *Statement sheet* = the sheet TITLE matches
    `/statement|manifesto|hero code|pledge|commitment/i` AND every answerable
    question is `text` (≥2) → composed statement page + print + share. The
    title gate matters: belief checklists and the ACE questionnaire are also
    all-text and must NOT get the poster treatment. Adi controls this from
    the DB via the sheet title.
  - *Community CTA* = a content block titled like "Post to Community"
    (`/post .*communit/i`) → the statement page's share button.
  - *Scored sheet* = a title-matched recipe in `src/lib/exercise-scores.ts`
    (e.g. ACE ← `/adverse childhood/i`). On completion the score is saved
    WITH ITS DATE as an append-only `mobile_assessment_responses` row
    (instrument key), shown on a calm result screen (framing → number →
    band note), and re-recorded on edited retakes — that's the dated
    history for future comparisons, and Sparxy's context unions it in
    automatically. Adding the next instrument (Wheel readouts, SF-36,
    Likert sheets) = one config entry; get the bands + framing from Adi
    (the legacy compute engine was Rails code — there's nothing to port
    from the DB). NOTE: IGNTD's ACE is the EXPANDED 19-item version, so
    the traditional "4+" threshold does NOT apply — 5+ = likely serious
    developmental trauma, always framed gently (Adi's rule).
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

0. **If the module needed app-code changes, merge + deploy them FIRST** and
   only then enable the rollout row — a view/gate change is live instantly
   against whatever build main last deployed (AGENTS.md lock-step rule).
   Module 2-3 example: labeled-scale rendering had to ship before enabling,
   or members would have seen a broken 2-dot numeric strip.
1. `insert into mobile_exercise_rollout (module_id, note) values (<portions.id>, 'module N');`
   (SQL editor, or a dispatched one-off file) — live instantly.
2. Re-dispatch the introspection: VIEW-CHECK counts should now include the module.
3. On the live site, open one lesson of the module: worksheets render, answers
   save (check `mobile_exercise_responses` rows), celebration fires, Sparxy
   summary reads the answers.
4. Anything user-visible that needs app code → branch, PR, merge (deploys from
   `main` only; DB views must stay additive across the transition — AGENTS.md).
