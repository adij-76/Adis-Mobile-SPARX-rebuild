-- =============================================================================
-- Durable lesson/workshop completions — app-owned, cross-device, reconcilable.
--
-- Completion state used to live ONLY in the on-device store, so the "completed"
-- checkmark didn't follow a user across devices and there was no server record
-- besides the XP event. This table is the first-class, durable record — same
-- shape as mobile_checkins / mobile_video_watches. RLS by auth.uid().
--
-- One row per (user, lesson). Idempotent (PK on-conflict), append-only in spirit
-- (first completion wins the timestamp). Reconciles to prod `completed_lessons`
-- at cutover (app_user_id → user_id, lesson_id → lessons.id).
-- =============================================================================

create table if not exists public.mobile_completed_lessons (
  auth_uid     uuid        not null default auth.uid(),
  app_user_id  integer,
  lesson_id    text        not null,
  lesson_type  text        not null default 'lesson',   -- 'lesson' | 'workshop'
  completed_at timestamptz not null default now(),
  primary key (auth_uid, lesson_id)
);

alter table public.mobile_completed_lessons enable row level security;

drop policy if exists mobile_completed_lessons_select on public.mobile_completed_lessons;
create policy mobile_completed_lessons_select on public.mobile_completed_lessons
  for select to authenticated using (auth_uid = auth.uid());

drop policy if exists mobile_completed_lessons_insert on public.mobile_completed_lessons;
create policy mobile_completed_lessons_insert on public.mobile_completed_lessons
  for insert to authenticated with check (auth_uid = auth.uid());

grant select, insert on public.mobile_completed_lessons to authenticated;
