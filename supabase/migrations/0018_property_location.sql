-- DueMeet Phase 2: a map location (lat/lng) on each property, set with the
-- free OpenStreetMap location picker when the lessor adds a property.
alter table public.assets
  add column if not exists latitude  double precision,
  add column if not exists longitude double precision;
