-- Identity verification: each user (lessor now, renter later) can keep a photo
-- of their ID on file. Stored privately — accessed only via the service role
-- and signed URLs, like contracts — so no public Storage policies are added.
alter table public.users
  add column if not exists id_file_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ids',
  'ids',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
