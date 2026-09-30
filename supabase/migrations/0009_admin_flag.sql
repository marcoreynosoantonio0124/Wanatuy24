-- Owner/admin flag for the Command Center. Off for everyone by default;
-- grant it to the owner account privately with a one-off UPDATE (kept out of
-- version control so the owner's email isn't committed to a public repo):
--
--   update public.users set is_admin = true where email = 'you@example.com';
--
alter table public.users
  add column if not exists is_admin boolean not null default false;
