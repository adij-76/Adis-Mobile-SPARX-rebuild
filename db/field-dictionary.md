# Canonical field dictionary

One vocabulary, three layers. The **`mobile_*` view column** is the canonical
name (clean snake_case). The **app field** is its exact camelCase — so the
adapter is a mechanical transform, not a semantic remap. The **production column**
is the legacy Rails source the view reads from; it never leaks past the view.

> Rule: app field === camelCase(view column). When adding a field, alias the view
> column to the clean snake_case of the app name, and the mapping stays trivial.
> The admin backend should read/write this **view/app vocabulary**, not the raw
> production columns — so a Rails rename only ever touches the view alias.

## Identity & personalisation — `mobile_me` → `MeResult` / `AuthUser`

| Production column (`public.users`) | View column (`mobile_me`) | App field |
|---|---|---|
| `id` | `app_user_id` | `appUserId` |
| `first_name` | `name` | `name` |
| `email` | `email` | `email` |
| `avatar_link` | `avatar_url` | `avatarUrl` |
| `program_id` | `program_id` | `programId` |
| `subscribed` | `subscribed` | `subscribed` |
| `stripe_subsctiption_active` *(sic — typo in prod)* | `stripe_active` | `stripeActive` |
| `advanced_coaching` | `advanced_coaching` | `advancedCoaching` |
| `addiction` (enum_id) → `addictions.title` | `addiction_label` | `addictionLabel` |
| `days_counter_amount` | `days_count` | `daysCount` |
| `days_counter_updated_at` | `days_updated_at` | `daysUpdatedAt` |
| `user_handle` | `user_handle` | `userHandle` |
| `time_zone` | `time_zone` | `timeZone` |
| `team_id` | `team_id` | `teamId` |
| `zoom_email` | `zoom_email` | `zoomEmail` |
| `subscription_role_id` | *(used internally for gating)* | — |

## Content — `mobile_lessons` → `Lesson`

| Production column | View column (`mobile_lessons`) | App field |
|---|---|---|
| `lessons.id` | `id` | `id` |
| `lessons.portion_id` *(Rails "portion")* | `module_id` | `moduleId` |
| `lessons.title` | `title` | `title` |
| `lessons.nav_title` | `nav_title` | `navTitle` |
| `lessons.position` | `position` | `position` |
| `lessons.description` | `description` | `description` |
| `vimeos.url` / `lessons.vimeo_url` | `vimeo_url` | `vimeoUrl` |
| `vimeos.vimeo_id` | `vimeo_id` | `vimeoId` |
| `lessons.lesson_type` (1=workshop) | `lesson_type` | `lessonType` |
| `lessons.worksheet_explanation_url` | `worksheet_url` | `worksheetUrl` |
| *(derived client-side)* | `thumbnail` | `thumbnail` |
| `completed_lessons.progress_value` | `progress` | `progress` |
| `lesson_ratings.rating` | `rating` | `rating` |
| `favorites` (favoritable) | `favorite` | `favorite` |
| `subscription_role_lessons/_workshops` | `accessible` | `accessible` |

## Modules / programs / wheel

| View | View columns | App |
|---|---|---|
| `mobile_modules` | `id, program_id, title, order` | `Module { id, programId, title, order }` |
| `mobile_programs` | `id, name, active` | `Program { id, name, active }` |
| `mobile_wheel_scores` | `month_key, label, year, score` | `WheelPoint { key, label, year, score }` |
| `mobile_quotes` | `id, text, author, mood` | `Quote { id, text, author, mood }` |

## Conventions for new fields

- **Booleans:** affirmative (`accessible`, `subscribed`), not negated.
- **Foreign keys:** `<thing>_id` / `<thing>Id`. Resolve labels in the view
  (e.g. `addiction_label`) rather than exposing raw ids the app can't read.
- **Timestamps:** `<event>_at` / `<event>At`.
- **Never** propagate a production typo or Rails-ism past the view alias.
