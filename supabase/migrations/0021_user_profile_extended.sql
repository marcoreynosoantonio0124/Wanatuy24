-- DueMeet: a fuller one-time profile record for every user (lessor & renter).
-- Adds livelihood + family details and a profile photo, all optional so an
-- account can be created even when a detail doesn't apply (N/A) or isn't ready.
alter table public.users
  add column if not exists occupation     text,
  add column if not exists employer       text,   -- company / where they work
  add column if not exists work_address   text,
  add column if not exists spouse_name    text,
  add column if not exists children_count integer;

-- Public bucket for profile photos (avatars). Unlike IDs these are low-risk and
-- meant to be shown, so a public bucket keeps display simple. The public URL is
-- stored in users.avatar_url (column already exists).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
