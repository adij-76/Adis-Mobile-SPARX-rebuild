# Backend integration — crawl findings + plan

From a read-only crawl of the production webapp (`igntd-main`). No changes were
or will be made to that repo.

## What the production backend actually is
- **Rails 7.1 monolith**, Ruby 3.2.2, **PostgreSQL**, Sidekiq/Redis, ActiveStorage + **AWS S3**.
- **Auth: Devise** (cookie sessions; OAuth routes exist at `/users/auth/oauth`). All app + mobile pages require a Devise session.
- **Frontend is server-rendered**: `react-on-rails` (desktop) + **Hotwire (Turbo/Stimulus)** for the `/mobile/community` UI. Pages are ERB, not a SPA.
- There **is no token-based public REST API.** Controllers do `render json:` for AJAX, but those endpoints are **session-cookie + CSRF authenticated** and coupled to the web app. The only `api/v1` namespace is tiny (`video_events`, `rewards`).

### Why this matters for the Expo app
Our mobile app is a **separate origin** (github.io) with **no Devise cookie**. It can't call these endpoints as-is: they need a session cookie, a CSRF token, and CORS for our origin — none of which a cross-origin SPA/native client has. **A dedicated mobile API is required.**

## Content model (our first track) — confirmed hierarchy
`programs → portions (= modules) → lessons`, via a `portion_lessons` join.
- **`programs`** — e.g. "The Hero Code" (`id, name, active`).
- **`portions`** — the **modules** (`id, program_id, title, order`); Hero Code ≈ 13.
- **`lessons`** — the ~53 lessons. `lesson_type` enum = **`[lesson, workshop]`**, so
  **workshops are lessons** with `lesson_type = workshop` (grouped into portions too;
  attached after the main program — a DB shape they want to clean up later).
- **`snippets`** — standalone short-form videos (`lesson_id` nullable), own `vimeo_url`.
- **`program_links`** — flexible link table (program/portion/snippet/lesson/group).

Gated by **subscription role + program** (`subscription_role_workshops`, `program_links`).

| Table | Key columns (real shapes) |
|---|---|
| `lessons` | `id, portion_id, nav_title, position, title, description, vimeo_url, vimeo_id, lesson_type, worksheet_explanation_url, meeting_link` |
| `snippets` *(videos)* | `id, lesson_id, description, length_seconds, vimeo_id, vimeo_url, transcript, ai_generated, classified, youth` |
| `completed_lessons` *(progress)* | `id, lesson_id, user_id, program_id, progress_value, video_status, worksheet_ids[]` |
| `user_snippets` *(saved videos)* | `id, snippet_id, user_id` |
| `sections` | `id, page_id, profile_id, title, description, sort_order, active` |

**Key win:** real video URLs live in **`snippets.vimeo_url`** and **`lessons.vimeo_url`** (e.g. `https://player.vimeo.com/video/…`). Some workshop videos are also AWS-S3 with **server-generated presigned URLs** (time-limited). This is also the source of truth that fixes Sparky's hallucinated-video problem.

### The web's content JSON (shape reference)
`WorkshopsController#index` returns each workshop as: lesson `as_json` **plus**
`progress, workshop_vimeos, thumbnail_image, rating, favorite?`. `#show` computes a **presigned** video URL + worksheet URL. `lessons#recomendation_videos` → `{ videos: [...] }`. Progress/complete endpoints return `{ progress, uploaded_worksheet_ids }`.

## Relevant existing routes (templates for the mobile API)
- Content: `GET /workshops`, `GET /workshops/:id`, `GET /lesson/:id`, `GET /lesson/:id/recomendation_videos`, `POST /lesson/:id/video|intro|worksheet`, `resources :favorites`, `POST /create_user_snippet`.
- Check-in / wheel: `POST /daily-assessment`, `POST /lesson/:id/wheel-of-life`, `sds_assessments#*`, `GET /recommendation-snippets`.
- Community (already a clean namespace): `mobile/community/*` — posts, comments, reactions, chats, notifications (but Turbo/HTML responses, Devise session).
- Payments: Stripe (`stripe#*`), Zoom for meetings.

## The path to "live" — two tracks

### Track A — n8n → Postgres bridge (fast; I can build now, no Rails changes)
Exactly the Sparky pattern. n8n webhooks run read-only SQL over the **same Postgres** (already connected for Sparky — it has `snippets`, `lessons`, `daily_assessments`, `v_wol`, etc.) and return JSON shaped for the app. Good for **content browse + Vimeo playback** and reading check-in/wheel/leaderboard data. Auth = `userId` for now (like Sparky).
- ✅ I build the n8n flows + the Expo API client + wiring end-to-end.
- ⚠️ Reimplements access in SQL; can't generate S3 presigned URLs (fine — content has `vimeo_url`); not a long-term auth story.

### Track B — tokenized Rails mobile API (clean; **their Rails team builds from my spec**)
Add `api/v1` with **Devise-JWT** (or token) auth + **CORS** + serializers that reuse the existing gating, presigning, and progress logic. This is the correct long-term home because auth, program gating, and presigned URLs already live in Rails and shouldn't be duplicated.
- ✅ I deliver a precise endpoint + auth + response-shape spec derived from their controllers, and build the Expo client to match.
- ⚠️ Requires work in the Rails repo (which I won't touch) + their deploy.

## Recommendation
**Do both, in order:** start **Track A** to get content (and Vimeo playback) live now with zero Rails changes, while handing their team the **Track B** spec so the clean tokenized API lands in parallel. The Expo client is written against a thin `api` layer, so swapping Track A → Track B later is a config change, not a rewrite.

## Auth note
Current = Devise sessions (+ OAuth scaffolding). Future = Auth0 / social. For Track B the cleanest is **Devise-JWT** issuing a bearer token the app stores; social/Auth0 can federate into the same user. Until then, Track A uses `userId` like Sparky.
