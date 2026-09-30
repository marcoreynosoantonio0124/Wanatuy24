-- Private Storage bucket for signed rental contracts (PDF / photo).
-- Access is via the service role from the server (lessor uploads; lessor and
-- the agreement's renter get signed-URL reads), so no public policies are
-- added — the bucket stays private. The path is stored in
-- agreements.contract_file_path (which already exists).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
