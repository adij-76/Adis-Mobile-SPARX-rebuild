-- =============================================================================
-- Harden app-owned writes — derive app_user_id SERVER-SIDE (S-M1).
--
-- App-owned tables carry app_user_id (production users.id) so the cutover sync
-- can attribute rows to the real clinical record. The client used to SEND it,
-- and nothing tied it to the caller — so an attacker could insert e.g. a relapse
-- check-in with a VICTIM's app_user_id and pre-seed their clinical record.
--
-- This trigger overrides app_user_id on INSERT with the value derived from the
-- caller's own auth_uid (auth.uid() → auth.users.email → users.id), so the
-- client's value is ignored. New mobile-first users (no prod row) resolve to
-- NULL, which is correct. Attached to every app-owned table that has an
-- app_user_id column. INSERT-only (leaves the admin promote-tester UPDATE path
-- untouched). SECURITY DEFINER so it can read auth.users + users.
-- =============================================================================

create or replace function public.mobile_bind_app_user_id()
  returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  new.app_user_id := (
    select u.id
    from public.users u
    join auth.users au on lower(au.email) = lower(u.email)
    where au.id = new.auth_uid
    limit 1
  );
  return new;
end $$;

do $$
declare r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'app_user_id'
      and c.table_name ~ '^mobile_'
      -- must also have auth_uid (the caller key we derive from)
      and exists (
        select 1 from information_schema.columns c2
        where c2.table_schema = 'public' and c2.table_name = c.table_name
          and c2.column_name = 'auth_uid'
      )
  loop
    execute format('drop trigger if exists trg_bind_app_user_id on public.%I', r.table_name);
    execute format(
      'create trigger trg_bind_app_user_id before insert on public.%I '
      || 'for each row execute function public.mobile_bind_app_user_id()', r.table_name);
  end loop;
end $$;
