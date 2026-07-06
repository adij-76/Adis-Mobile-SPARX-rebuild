# Lesson exercises — interactive presentation (spec)

> Status: **scoping**. Content already exists in the legacy Postgres DB (lessons
> carry their questions). This project surfaces those questions and presents them
> as an interactive, rewarding experience — replacing today's placeholder.

## Where we are today

- A `Lesson` carries only `worksheet_explanation_url` (a link/PDF). There is **no
  structured exercise model** in the app yet.
- `src/app/lesson/[id].tsx` shows a placeholder: *"Interactive exercises for this
  lesson are coming soon. For now, follow along with the worksheet."* plus a
  Sparxy stub: *"A personalised, inspiring summary of this lesson and your
  exercise … will appear here."*
- The legacy Rails DB has a `profiles` / `questions` / `answers` /
  `answer_headers` engine. The **assessment battery already reuses it**
  (`profiles.id` 268→gad7, 269→phq9, …) and already renders questions
  interactively — so lesson exercises are the same shape of problem, one tier up.

## What we can reuse (don't rebuild)

- **`src/lib/assessments.ts`** — `Question = { key, prompt, options }`,
  `Instrument = { questions, … }`, `scoreOf`, severity bands. The exercise model
  extends this (adds free-text + other input kinds).
- **`src/app/assessments/[id].tsx`** — one-screen interactive question renderer
  (tap-to-select options, progress bar, submit). The exercise renderer is a
  richer sibling.
- **XP ledger** (`mobile_xp_events` + `useXpAward`) — award on completion.
- **Celebration** (`Confetti` + `RankMovement`, e.g. `LessonComplete`,
  `PostCelebration`) — reuse for "exercise complete."
- **Assessment persistence pattern** (`mobile_assessment_responses`, RLS,
  append-only, reconciled to `answer_headers`/`answers` at cutover) — the
  exercise-response table is a direct analogue.

## "As interactive as possible" — the vision

Not a static form. Target experience:

1. **One prompt at a time** — a guided stepper (like check-in / assessments),
   not a wall of fields. Momentum + progress bar.
2. **Mixed input kinds** — driven by the legacy question `type`:
   - free-text **reflection** (the heart of it),
   - single/multi **choice**,
   - **scale / slider** (0–N frequency/agreement),
   - optional: rank / this-or-that / number.
3. **Save-as-you-go + resumable** — answers persist per question; leaving and
   returning restores progress (write on blur / step advance).
4. **Reward on completion** — +XP through the ledger + the celebration screen,
   exactly like lessons and posts.
5. **Personalised Sparxy summary** — feed the answers to the existing
   `mobile_ai_context` / Sparxy flow to render the "inspiring summary + next
   steps" the placeholder promises.
6. **Reflections become a journal** — past answers are viewable over time
   (growth), and feed the AI context so coaching gets more personal.

## Proposed data model (app-owned, cutover-reconcilable)

Read exercise **definitions** from a new read view over the legacy tables
(mirrors `mobile_lessons`):

- `mobile_lesson_exercises` (view) — one row per question attached to a lesson:
  `lesson_id`, `question_id`, `order`, `prompt`, `type`, `options` (jsonb),
  `required`. Shape finalised once the introspection lands (see below).

Store **responses** app-side:

- `mobile_exercise_responses` (table, RLS by `auth.uid()`, append-only):
  `auth_uid`, `app_user_id`, `lesson_id`, `question_id`, `value` (text/jsonb),
  `answered_at`. **Cutover:** materialise into `answer_headers` + `answers`
  (question key → `questions.id`), same mechanism the assessment battery uses.

## Open questions (resolved by the introspection below)

1. How are questions attached to a lesson? (`questions.lesson_id`? via a
   `profile` per lesson? a join table?)
2. What question **types** exist, and how are options/scales encoded?
3. Is answer storage per-item (`answers` rows) keyed by `question_id`?
4. Are there existing web answers per user to carry forward (history)?

## Discovery step (run once, paste back)

I can't reach the live DB from the build sandbox, so run
`db/introspect.sql`'s scoped form for the exercise engine — query provided in
chat — and paste the JSON. From it I finalise the view columns, the response
table, and the input-kind mapping, then the build proceeds:

1. `db/lesson-exercises.sql` — `mobile_lesson_exercises` view +
   `mobile_exercise_responses` table (+ grants/RLS), added to `apply-order.txt`
   and the catalogue.
2. App: exercise types in `src/lib/exercises.ts`, an interactive renderer
   (extends the assessment stepper), wired into `src/app/lesson/[id].tsx`.
3. XP + celebration on completion; Sparxy summary from the answers.
4. Reconcile block in `db/reconcile.sql` (responses → `answer_headers`/`answers`).

Build can run in a fresh session against this spec; this doc is the brief.

---

## Discovery results (confirmed against prod)

The legacy engine (no DB-level FKs — Rails convention associations by column name):

```
lessons (91)
  └─ profiles (148)            profiles.lesson_id = lessons.id, active, ordered by sort_order
       └─ questions (1616)     questions.profile_id = profiles.id, active, ordered by sort_order
            └─ question_options (719)  question_options.question_id, ordered by sort_order, .value = label
  responses: answer_headers (per take, profile_id+user_id) + answers (149k rows;
             answer json OR text_answer varchar, keyed by question_id + header_id)
```

A lesson has several titled worksheet **profiles** (e.g. lesson 5 → "IGNTD Hero
Manifesto", "Hero Personal Power Statement", "First Day Quickstart"). Each
profile is one worksheet/exercise; its questions are the prompts.

### Question input kinds — `questions.widget_type` (integer)

| widget_type | ~count | input kind        | notes |
|-------------|--------|-------------------|-------|
| 14          | 650    | `longtext`        | free-text reflection (dominant) |
| 4           | 288    | `text`            | short free-text; some required |
| 0           | 40     | `text` (fallback) | mixed/legacy |
| 13          | 94     | `scale`           | Likert, `min_value`..`max_value` (0–4), options = labels |
| 6           | 14     | `multiselect`     | checkboxes, `question_options.value` |
| 2           | 8      | `select`          | single-choice radio |
| 7           | 1      | `date`            | date picker |
| 12          | 136    | `content`         | **read-only** rich-HTML block (incl. tables) |
| 5           | 147    | `display`         | **read-only** computed/summary (e.g. AUDIT score) |

**~68% of prompts are free-text** → the experience is a guided **reflection/
journaling** flow first, quiz second.

### Critical build note — prompts are rich HTML
`questions.question_label` holds TinyMCE HTML (inline `style=`, `<span>`,
`<table>`). The renderer MUST sanitize it (strip inline styles; render a safe
subset or convert to clean text). `questions.title` is a short plain label and
is the safer default heading. Budget for an HTML sanitize/render step.

### Finalised data model

**`mobile_lesson_exercises`** (read view — definitions):
`lesson_id, profile_id, profile_title, profile_order, question_id,
question_order, widget_type, input_kind (mapped text), prompt_html
(question_label), prompt_title (title), min_value, max_value, required,
options jsonb (agg of question_options.value by sort_order)`.
Filter: `profiles.lesson_id is not null and profiles.active and questions.active`.
Skip `input_kind in ('display')` for MVP unless we render read-only.

**`mobile_exercise_responses`** (app-owned table, RLS by `auth.uid()`):
`auth_uid default auth.uid(), app_user_id, lesson_id, profile_id, question_id,
value_text, value_json jsonb, answered_at`. Resumable → **upsert on
(auth_uid, question_id)** (latest answer wins; save on step-advance/blur).
**Cutover:** one `answer_headers` per (user, profile) + `answers` rows
(question_id → `answer` json / `text_answer`), same mechanism as the assessment
battery. Add a section to `db/reconcile.sql`.

### Renderer plan
Extend the assessment stepper (`assessments/[id].tsx` pattern):
- `longtext`/`text` → multiline / single-line `TextInput` (the star of the show)
- `scale` → segmented 0–N with endpoint labels
- `select` → single-choice option rows; `multiselect` → toggle rows
- `date` → date field
- `content`/`display` → sanitized read-only block, "Continue"
One prompt per screen, progress bar, save-on-advance, +XP + celebration on
finishing a worksheet (reuse `PostCelebration`/`LessonComplete`), then a Sparxy
summary from the answers via `mobile_ai_context`.

### Open product decisions (not blockers)
- Keep answer **history** (journal over time) or latest-only? (MVP: latest.)
- Render `display`/computed widgets, or hide for MVP? (MVP: hide.)
- XP per question, per worksheet, or per lesson? (Suggest: per worksheet.)
