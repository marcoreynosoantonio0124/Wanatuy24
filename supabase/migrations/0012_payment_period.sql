-- Tie each recorded payment to the specific month (period) it settles, so
-- partial payments stay on their own month instead of spilling over.
-- Existing payments keep period_id = null (treated as legacy/unassigned).
alter table public.payments
  add column if not exists period_id uuid references public.periods(id) on delete set null;

create index if not exists payments_period_idx on public.payments(period_id);
