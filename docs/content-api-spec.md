# Content API spec (Supabase / track A) — and how C reuses it

The concrete content contract for the first cutover, mapped to the real Postgres
hierarchy: `programs → portions(modules) → lessons` (lesson_type lesson|workshop)
+ standalone `snippets`. The app already calls this via `src/api/` (Supabase
adapter); these are the views + policies the adapter reads.

## Response shapes (= `src/api/types.ts`)
`Program {id,name,active}` · `Module {id,programId,title,order}` ·
`Lesson {id,moduleId,title,navTitle,position,description,vimeoUrl,vimeoId,lessonType,worksheetUrl,thumbnail, progress?,rating?,favorite?}` ·
`Workshop = Lesson(lessonType='workshop')` ·
`Snippet {id,lessonId,description,lengthSeconds,vimeoUrl,vimeoId,aiGenerated}`

## Step 1 — read-only catalog views (do this first)
Catalog browse needs no per-user data, so it ships before auth. Run in Supabase
SQL editor (against the imported/connected prod Postgres):

```sql
create or replace view mobile_programs as
  select id, name, active from programs where active;

create or replace view mobile_modules as
  select id, program_id, title, "order" from portions;

create or replace view mobile_lessons as
  select l.id,
         l.portion_id,
         l.title,
         l.nav_title,
         l.position,
         l.description,
         l.vimeo_url,
         l.vimeo_id,
         case l.lesson_type when 1 then 'workshop' else 'lesson' end as lesson_type,
         l.worksheet_explanation_url as worksheet_url,
         null::text as thumbnail            -- see note: derive from vimeos/ActiveStorage
  from lessons l;

create or replace view mobile_snippets as
  select id, lesson_id, description, length_seconds,
         vimeo_url, vimeo_id, ai_generated, created_at
  from snippets
  where classified = true;                  -- only real, classified snippets
```

Grant read to the API role and expose to PostgREST:
```sql
grant select on mobile_programs, mobile_modules, mobile_lessons, mobile_snippets to anon, authenticated;
```

> **thumbnail / presigned video**: `lessons` has no thumbnail column — Rails derives
> it from `vimeos`/ActiveStorage. Either add a `thumbnail_url` column populated by a
> job, or compute it in a later view join. Vimeo playback works now from
> `vimeo_url`; S3 worksheet/video files need a presign **Edge Function** (port the
> Rails `presigned_video_url`).

## Step 2 — per-user enrichment + RLS (after auth lands)
Once Supabase Auth maps to the production `users` row (store `users.id` in the
JWT, e.g. `auth.jwt() ->> 'app_user_id'`), enrich `mobile_lessons`:
```sql
-- progress, rating, favorite for the current user
left join completed_lessons cl
  on cl.lesson_id = l.id and cl.user_id = (auth.jwt() ->> 'app_user_id')::int
left join lesson_ratings lr
  on lr.lesson_id = l.id and lr.user_id = (auth.jwt() ->> 'app_user_id')::int
-- favorite via favorites (favoritable_type='Lesson')
```
And gate the catalog to the user's program/subscription role (mirrors Rails
`program_links` + `subscription_role_workshops`):
```sql
alter table lessons enable row level security;
create policy mobile_lessons_access on lessons for select to authenticated
using (
  exists (
    select 1 from program_links pl
    join users u on u.program = pl.program_id
    where pl.lesson_id = lessons.id
      and u.id = (auth.jwt() ->> 'app_user_id')::int
  )
);
```
*(Audit gating parity against the Rails controllers before exposing — this is the
one area to get exactly right.)*

## Endpoints the adapter calls (PostgREST)
`GET /rest/v1/mobile_programs` · `…/mobile_modules?program_id=eq.<id>&order=order` ·
`…/mobile_lessons?portion_id=eq.<id>&lesson_type=eq.lesson&order=position` ·
`…/mobile_lessons?lesson_type=eq.workshop` · `…/mobile_snippets?order=created_at.desc`
Headers: `apikey: <anon>`, `Authorization: Bearer <user-jwt | anon>`.

## App wiring (already prepared)
- `src/api/types.ts` — the shapes above.
- `src/api/supabase.ts` — PostgREST adapter (HTTP, no SDK; `setSupabaseToken()` for the JWT).
- `src/api/mock.ts` — local fallback so the app runs with no backend.
- `src/api/index.ts` — picks Supabase when `EXPO_PUBLIC_SUPABASE_URL` is set, else mock.

**Env to set** (repo variables → injected at build like `SPARKY_WEBHOOK`):
`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

Next, content screens (videos / workshops / lessons) get rewired from `content.ts`
mocks to `await api.content.*` with loading states — done once Supabase is live so
we test against real data.

## How C (tRPC/Drizzle) reuses all of this
- The **views above stay** — Drizzle reads the same `mobile_*` views (or the base
  tables) directly; no rework.
- The **types are identical** — `src/api/types.ts` is backend-agnostic.
- Swap is one file: add `src/api/trpc.ts` implementing `ContentApi`, flip
  `src/api/index.ts`. Screens, types, and SQL are untouched.
- Auth/realtime/storage keep coming from Supabase in C (Hybrid) — so the only
  thing that ever changes is *where the data query runs*, not the contract.
