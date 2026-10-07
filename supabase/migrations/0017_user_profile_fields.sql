-- DueMeet Phase 1: a full profile kept on record for every user (lessor &
-- renter) — captured at sign-up, like a real account.
alter table public.users
  add column if not exists suffix             text,
  add column if not exists address            text,
  add column if not exists birthdate          date,
  add column if not exists marital_status     text,
  add column if not exists valid_id_file_path text,
  add column if not exists profile_completed  boolean not null default false;
