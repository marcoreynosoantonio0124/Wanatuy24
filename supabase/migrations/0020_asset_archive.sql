-- DueMeet Phase 4: soft-archive a property. When a contract ends the lessor can
-- "retain" the unit (keep it open for leasing) or "delete" it — a delete just
-- sets archived_at, so the unit leaves the dashboard but its past agreements
-- stay intact in History.
alter table public.assets
  add column if not exists archived_at timestamptz;
