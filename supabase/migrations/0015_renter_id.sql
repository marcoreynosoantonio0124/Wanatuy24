-- Renter identity verification. The renter often has no account (they use the
-- shared link), so their ID lives on the agreement rather than a user profile.
-- Stored privately in the same 'ids' bucket (service-role + signed URLs).
alter table public.agreements
  add column if not exists renter_id_file_path text;
