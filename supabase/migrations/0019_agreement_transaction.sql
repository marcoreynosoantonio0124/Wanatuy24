-- DueMeet Phase 3: a short transaction number on each agreement, shown on both
-- the lessor's and the renter's unit box, and used by a renter to join a unit.
alter table public.agreements
  add column if not exists transaction_no text;

create unique index if not exists agreements_transaction_no_key
  on public.agreements(transaction_no);
