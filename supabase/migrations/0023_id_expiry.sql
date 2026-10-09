-- DueMeet: track whether an uploaded government ID is expired, so an expired ID
-- doesn't earn the Verified badge. IDs with no expiry date (UMID, PhilSys
-- National ID, Voter's ID, SSS/PhilHealth) are never treated as expired.
alter table public.users
  add column if not exists id_expired boolean;
