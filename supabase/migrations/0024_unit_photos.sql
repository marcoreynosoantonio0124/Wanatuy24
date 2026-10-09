-- DueMeet: optional photos of a unit (move-in condition / what the renter is
-- getting). Added and managed on the unit's own detail page, not on the short
-- Add-a-unit form, so first-time users aren't overwhelmed. Up to a few photos;
-- the first one is the cover. Shown to the lessor and to the renter in that
-- unit's agreement.
--
-- Paths are stored in order on the asset; the first is the cover. A private
-- bucket keeps a lessor's property photos from being publicly guessable — the
-- app serves them through short-lived signed URLs (like contracts, IDs, proofs).
alter table public.assets
  add column if not exists photo_paths text[] not null default '{}';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'unit-photos',
  'unit-photos',
  false,
  10485760, -- 10 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;
