-- 0007_user_profile.sql
-- Fix: every auth user needs a matching public.users row (assets.lessor_id and
-- agreements.lessor_id reference it). RLS was blocking the app's own insert, so:
--   1) allow a user to create their own profile row,
--   2) auto-create it on signup via a trigger (canonical Supabase pattern),
--   3) backfill anyone who signed up before this migration.
-- Supabase-only (references the auth schema).

-- 1) RLS: a user may insert their own profile row.
drop policy if exists users_insert_self on users;
create policy users_insert_self on users
  for insert with check (id = auth.uid());

-- 2) Auto-create the profile whenever a new auth user is created.
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- 3) Backfill existing auth users that have no profile yet.
insert into public.users (id, email)
select id, coalesce(email, '')
from auth.users
on conflict (id) do nothing;
