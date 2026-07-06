---
name: verify
description: Build, launch, and drive this Expo web app to verify changes at the real surface (mock backend, Playwright).
---

# Verifying changes in this repo

## Launch (web, mock backend)

No `EXPO_PUBLIC_SUPABASE_URL` in the env → the app serves the **mock adapter**
(`src/api/mock.ts`) — fully offline, any email/password logs in.

```bash
npx expo start --web --port 8081 &   # Metro dev server; ready in ~25s
curl -s -o /dev/null -w "%{http_code}" http://localhost:8081   # 200 when up
```

Metro hot-rebuilds on file save — after editing source, wait ~5s and reload the
page; no server restart needed.

## Drive with Playwright

Chromium is pre-installed; Playwright is global (not in this repo's deps):

```bash
mkdir -p "$SCRATCH/node_modules"
ln -sfn /opt/node22/lib/node_modules/playwright      "$SCRATCH/node_modules/playwright"
ln -sfn /opt/node22/lib/node_modules/playwright-core "$SCRATCH/node_modules/playwright-core"
# then in the script: chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
```

Use a phone-ish viewport (420×860). Flow gotchas:

- Landing redirects to `/login`; fill the email + password inputs, click
  "Sign in" (mock accepts anything), you land on `/checkin`.
- Mock lesson ids are the `workshops` seed slugs from `src/data/content.ts`
  (`heart-therapy`, `bliss-blueprint`, …) → `http://localhost:8081/lesson/<id>`.
- RN-web renders text in `div`s; `getByText(/^Next$/)` matches BOTH the lesson
  footer and anything inside an open Modal. Modals mount at the end of the DOM
  → use `.last()` for buttons inside a Modal, `.first()`/plain otherwise.
- `Escape` fires a Modal's `onRequestClose` (works for closing runners/sheets).
- Console shows `ERR_TUNNEL_CONNECTION_FAILED` noise for external images
  (unsplash/pravatar/vimeo blocked by the proxy) — harmless, filter it out.

## Static gates

`npx tsc --noEmit` is the only working static check. `npm run lint` tries to
auto-install an ESLint config over the network and fails in the sandbox — skip.

## SQL changes

`db/*.sql` files are validated by `scripts/test-lesson-exercises.sh` (spins up
a throwaway Postgres 16 cluster as the `postgres` user, stubs the legacy tables
+ `auth.uid()`, applies the file, asserts). Pattern to copy for new db files.
