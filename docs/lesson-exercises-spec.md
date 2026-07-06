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
