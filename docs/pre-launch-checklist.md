# Pre-launch checklist

Living list of what to finish/verify before a public launch. Grouped by area;
check items off as they land. Items marked **(native)** only matter once we cut a
native iOS/Android build — the current deploy is web only.

## Security

- [ ] **n8n webhook auth** — the Sparky webhook URL is inlined in the web bundle
      (all `EXPO_PUBLIC_*` values are), so hiding it isn't possible client-side.
      The real fix is server-side: add Header Auth on the n8n webhook and have the
      app send the secret header. Until then the webhook is freely POST-able.
      *(App code ready to send a header on request; needs the n8n-side credential.)*
- [ ] **Secure token storage (native)** — the Supabase session (access + refresh
      JWT) is persisted via AsyncStorage. On web that compiles to localStorage
      (the standard). On native, move it to `expo-secure-store`
      (Keychain / Keystore) before shipping a native build.
- [ ] **Base-table exposure / RLS** — if the imported production tables were
      loaded without row-level security, the `anon`/`authenticated` API roles may
      be able to read them directly via PostgREST (e.g. `GET /rest/v1/users`),
      independent of our `mobile_*` views. Decide before launch: enable RLS on
      sensitive tables, or restrict the PostgREST API to the `mobile_*` views
      only. (See `db/README.md`.)
- [ ] **Rotate / scope secrets** — confirm `VIMEO_ACCESS_TOKEN` is read-only,
      the Supabase `service_role` key is only ever in CI secrets (never client),
      and rotate anything that was shared during development.
- [x] **Sparky sends the real user id** (was hardcoded `11`). — done (#68)
- [x] **Webhook out of source** — comes from `SPARKY_WEBHOOK` repo var, fail
      closed if unset. — done (#68)
- [x] **External URL validation** — only `https://…vimeo.com/…` opens via
      `Linking.openURL`. — done (#68)

## Auth & accounts

- [ ] **Enable OAuth providers** — Google / Apple / Facebook under Auth →
      Providers (client id/secret), and add the deployed origin + localhost to
      Auth → URL Configuration → Redirect URLs.
- [ ] **Avatar write-back decision** — new uploads currently persist to the
      Supabase `avatars` bucket + auth metadata only (production `users.avatar_link`
      left untouched). Decide whether to also write `avatar_link` for cross-app
      consistency (that's a write to production data).
- [ ] Verify the full user import (`db/auth-and-storage.sql`) has run for all
      users, and the `avatars` bucket + policies exist.

## Content & data

- [ ] **Real snippet thumbnails** — run the *Backfill lesson thumbnails* action
      with `table=snippets` (needs `VIMEO_ACCESS_TOKEN`), add
      `snippets.thumbnail_url`, expose it in `mobile_recommended_videos`, and have
      the adapter use it. Until then cards use a branded gradient fallback.
- [ ] **Meetings & communities views** — currently fall back to seed data
      (`supabaseMeetings` / `supabaseCommunity` TODOs). Back them with real
      `mobile_*` views.
- [ ] **Server-side check-ins** — `daily_assessments` persistence so streaks /
      days count sync across devices (currently local-only AsyncStorage).
- [ ] **Enable the per-user DB audit** — set `AUDIT_USER_EMAIL` /
      `AUDIT_USER_PASSWORD` repo secrets (a throwaway audit account) so the
      *Audit DB contract* workflow also checks titles, gating, and identity.

## Build & release (native)

- [ ] **eas.json** — add an `env` block so `EXPO_PUBLIC_*` reach native builds,
      and fill `submit.production` so non-interactive submit works.
- [ ] Add crash reporting / analytics (e.g. Sentry) — none is wired in.

## Housekeeping (low priority)

- [ ] `npm audit`: 12 moderate, all transitive `@expo/*` build tooling (0
      high/critical) — clear when Expo updates.
- [ ] Pin `react-native-svg` / `react-native-view-shot` with `~` to match the
      other Expo-managed deps.
- [ ] Add an `engines` field to `package.json`.
- [ ] Replace `router.push(x as never)` casts with typed routes.
- [ ] Validate the avatar deep-link query param in `feed/chat.tsx`.
