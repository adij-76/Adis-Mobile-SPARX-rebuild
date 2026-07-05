-- =============================================================================
-- Expand the problem taxonomy — production data seed (writes to `addictions`).
--
-- Adds the behavioral / mental-health / executive problems the app's onboarding
-- offers, so they're live everywhere: the mobile app, the web/Rails app, and
-- admin all read the same `addictions` table. New rows get new enum_ids (10+);
-- the legacy users.addiction enum (0-9) is untouched — new problems are
-- referenced by users.addiction_id (→ addictions.id), exactly like the intake.
--
-- NOTE: this is a PRODUCTION DATA write (visible to the web app + admin). It only
-- ADDS rows. Idempotent — matches on title, so re-running never duplicates.
-- =============================================================================

insert into public.addictions (title, enum_id, created_at, updated_at)
select v.title, v.enum_id, now(), now()
from (values
  ('Anger management',            10),
  ('Impulsivity',                 11),
  ('Depression',                  12),
  ('Anxiety',                     13),
  ('Stress & burnout',            14),
  ('Procrastination',             15),
  ('Screen & technology overuse', 16),
  ('Work & workaholism',          17),
  ('Relationship & codependency', 18)
) as v(title, enum_id)
where not exists (select 1 from public.addictions a where a.title = v.title);
