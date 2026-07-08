# Sparxy AI — data-enrichment brief (paste into your n8n improvement process)

> Goal: give Sparxy (the AI coach) full, current knowledge of each user — their
> demographics, clinical assessments and trends, daily check-ins, content and
> community activity, streaks/XP, and group membership — and keep that knowledge
> continuously fresh as new data lands. Below is everything the workflow needs:
> the data surfaces, how to read them, how to assemble the model context, and how
> to keep it live.

---

## 0. How Sparxy is called today

The app POSTs to the n8n webhook (`EXPO_PUBLIC_SPARKY_WEBHOOK`) with an
`Authorization: Bearer <supabase-jwt>` header and this body:

```json
{ "action": "sendMessage", "chatInput": "<user message>", "sessionId": "<per-chat id>",
  "userId": "<mobile_me.app_user_id>", "authUid": "<supabase auth user id>",
  "timestamp": "<iso>", "message": "...", "history": [...] }
```

`authUid` (the Supabase auth user id) is now always sent. All the app-owned
tables below are keyed by `auth_uid`; `app_user_id` is only present for users who
have a production `users` row (existing users + converted testers). Use `authUid`
to read every user's data reliably, testers included; fall back to `userId`
(`app_user_id`) where you need the production id.

### Authenticate the call — do NOT trust the body ids (audit S-H1)

The webhook is a public URL, so the `userId`/`authUid` in the body are
**client-supplied and spoofable** — anyone could POST that URL claiming to be
another user and pull their clinical data back. The app now sends the caller's
**Supabase session JWT** as `Authorization: Bearer <jwt>`. The flow must:

1. **Verify the JWT** at the front of the flow — validate the signature against
   Supabase's JWKS (`https://<project>.supabase.co/auth/v1/.well-known/jwks.json`,
   ES256) or the project's JWT secret (HS256), and check `exp`. Reject
   (401) if it's missing, expired, or invalid — fail closed.
2. **Derive identity from the token, not the body.** The verified JWT's `sub`
   claim IS the Supabase `auth.users.id` — use that as `authUid`. Look up
   `app_user_id` server-side by joining `auth.users.email → users.email`. Treat
   the body `userId`/`authUid` as advisory only; if they disagree with the token,
   the token wins.

Until the flow enforces step 1, the body ids remain the source of identity and
the endpoint is unauthenticated — this is the open half of S-H1 and lives on the
n8n side. The app change (sending the Bearer token) has shipped.

## 1. Access model for n8n

- Use the **Supabase service_role key** (server-side only, in n8n credentials — never in the app). It bypasses RLS, so you query the app-owned **tables** directly.
- Filter app-owned data by **`auth_uid = <authUid>`** (and/or `app_user_id = <userId>`).
- The self-scoped read **views** (`mobile_me`, `mobile_use_tracking`, …) are scoped by the caller's JWT email and won't work under service_role — read the **underlying tables/prod tables** instead, or use the consolidated RPC in §4.
- **Never** expose service_role to the client; the app only ever holds the anon key.

## 2. The data surfaces (all per-user)

Clinical + demographic (highest value for a recovery coach):

| Source | Key | What it gives Sparxy |
|---|---|---|
| `mobile_onboarding_profile` | `auth_uid` | birth_date, gender, orientation, race, **primary_problem** (→ `addictions.id`), **secondary_problems[]** |
| `addictions` (join on the ids above) | — | human labels for the problems (e.g. "Alcohol", "Anger management") |
| `mobile_assessment_responses` | `auth_uid` | **every assessment take**: `instrument` (gad7/phq9/audit_c/pcl5/intake), `score`, `severity`, `answers` (jsonb), `taken_at` — full history for trends |
| `mobile_checkins` | `auth_uid` | daily check-ins: `mood` (0-100), `positive[]`/`negative[]` emotions, `behavior` (used?), `amount`, `use_count`, `affirmation`, `date` |
| `mobile_wheel_entries` | `auth_uid` | Wheel-of-Life self-ratings per life area over time |
| `mobile_me` (or prod `users`) | email / id | program, subscription, **addiction_label**, **days_counter_amount** (sobriety days), user_handle, time_zone |

Behavioral / engagement:

| Source | Key | What it gives Sparxy |
|---|---|---|
| `mobile_xp_events` | `auth_uid` | **itemized activity timeline** — one row per action: `source` (checkin/video/lesson/module/community_post/community_reply/assessment/streak_milestone/onboarding/intro), `ref_id`, `points`, `created_at`. This is the single best "what has this user been doing lately" feed. |
| `mobile_game_state` | `auth_uid` | totals: XP, streak run + credited days, streak badges |
| `mobile_video_watches` | `auth_uid` | which videos watched + `percent` |
| `mobile_favorites` | `auth_uid` | saved lessons/videos |
| `mobile_group_signups` | `auth_uid` | which coaching groups they joined |
| `mobile_feed_posts` / `mobile_feed_comments` | `app_user_id`/`auth_uid` | **their own posts and replies** (text they wrote — tone, themes, wins, struggles) |

Do **not** feed private DMs (`mobile_messages`) into the model.

## 3. What to put in the model context (per message)

Assemble a compact, structured "user context" block and prepend it to Sparxy's
system prompt. Keep it tight (summarize, don't dump rows). Suggested shape:

```
USER CONTEXT (confidential; use to personalize, never read verbatim):
- Identity: {first_name}, {age}, {gender}; {sobriety_days} days; program {program}; timezone {tz}
- Focus: primary {primary_problem}; also {secondary_problems}
- Latest assessments (score → severity, taken {date}, Δ vs previous):
    PHQ-9 {s}→{sev} ({trend}) · GAD-7 {s}→{sev} ({trend}) · AUDIT-C {s}→{sev} · PCL-5 {s}→{sev}
- Mood (last 7 check-ins avg {n}); recent emotions: {top negative}, {top positive}
- Use: {clean days / recent use pattern from check-ins}
- Recent activity (7d): {counts from mobile_xp_events by source} — e.g. 5 videos, 2 lessons, 3 check-ins, 1 community post
- Streak: {current} days; XP rank {week rank}
- Recent community posts (themes only): "{short paraphrase}"
- SAFETY FLAGS: {see §5}
```

Rules for the model (add to the system prompt): personalize warmly; reference
trends ("your anxiety has come down since last month") not raw scores;
respect that this is a recovery context; if a safety flag is set, follow the
crisis protocol first.

## 4. Recommended: one RPC that returns the whole context as JSON

Rather than 8 queries per message, add a single `SECURITY DEFINER` function the
flow calls once: `mobile_ai_context(p_auth_uid uuid)` → returns a JSON object with
`profile`, `latest_assessments`, `assessment_trends`, `recent_checkins`,
`activity_7d` (xp_events rolled up by source), `streak`, `recent_posts`, and
`safety_flags`. One HTTP node, one row, done. (I can build this — it mirrors the
tables above and keeps all the logic server-side, so the n8n flow stays a single
call even as we add data.)

## 5. Safety signals (compute in the context, act on in the flow)

- **PHQ-9 item 9 > 0** (`answers->>'p9'`) → self-harm ideation flag.
- **PHQ-9 total ≥ 20** or **PCL-5 ≥ 33** or **AUDIT-C ≥ 8** → elevated risk flag.
- A check-in with very low `mood` + `behavior=used` → watch flag.

When any hard flag is set, the flow's crisis branch should lead with support +
988 (US) and encourage reaching a coach/clinician, before anything else.

## 6. Keeping it continuously fresh

Two layers:

1. **Real-time (per message):** call `mobile_ai_context(authUid)` on every
   Sparxy turn. Always current, no sync to maintain. Start here.

2. **Rolling summary / long-term memory (event-driven):** for cheaper, richer
   context, maintain a per-user summary that updates when *significant* new data
   lands:
   - Add **Supabase Database Webhooks** on INSERT to `mobile_assessment_responses`,
     `mobile_checkins`, and `mobile_xp_events` (or a nightly cron) → hit an n8n
     "profile refresh" workflow.
   - That workflow pulls `mobile_ai_context`, has the model write a 5–8 line
     evolving summary ("where this person is, what's working, what to watch"),
     and upserts it into a new table `mobile_ai_profile(auth_uid, summary,
     updated_at)` (+ optionally embeddings in a `pgvector` column for retrieval).
   - The chat flow then reads that summary (fast) and only pulls fresh rows for
     the last 24–48h. This gives continuity ("last week you mentioned…") without
     re-summarizing everything every message.

Start with layer 1 (immediate value); add layer 2 when you want memory + cost
control.

## 7. Concrete n8n changes (checklist)

- [ ] Add Supabase (service_role) credential.
- [ ] Accept `authUid` from the webhook payload (app change to send it).
- [ ] Add an HTTP/Supabase node: `mobile_ai_context(authUid)` (or the individual
      table reads in §2 if you prefer to start without the RPC).
- [ ] Build the USER CONTEXT block (§3) and inject into the system prompt.
- [ ] Add the safety-flag branch (§5).
- [ ] (Later) Add the DB-webhook-triggered "profile refresh" workflow (§6) +
      `mobile_ai_profile` table.
```
