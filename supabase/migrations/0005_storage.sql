-- 0005_storage.sql
-- Private Storage bucket for payment-proof files (screenshots / receipts).
-- Supabase-only (needs the `storage` schema). All access is via the service
-- role from the server (renter uploads, lessor signed-URL reads), so no public
-- policies are added — the bucket stays private.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
