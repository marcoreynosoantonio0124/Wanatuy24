-- Lessor's own contact number for this agreement, so they get an SMS alert
-- when their tenant sends proof of payment.
alter table public.agreements
  add column if not exists lessor_phone text;

-- When the lessor first opened a submitted proof — drives the "blinks until
-- you've seen it" cue on the ledger.
alter table public.payment_proofs
  add column if not exists seen_at timestamptz;

-- Ledger of payments the lessor records. Amounts are applied oldest-month-first
-- so partial payments and lump sums (previous + current month) settle correctly.
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  amount_php   integer not null check (amount_php > 0),
  received_on  date not null default ((now() at time zone 'Asia/Manila')::date),
  note         text,
  recorded_by  uuid references public.users(id),
  created_at   timestamptz not null default now()
);
create index if not exists payments_agreement_idx on public.payments(agreement_id);

alter table public.payments enable row level security;

-- Both parties may read the ledger; only the lessor may add or remove entries.
create policy payments_select on public.payments
  for select using (is_party(agreement_id));
create policy payments_insert on public.payments
  for insert with check (is_lessor(agreement_id));
create policy payments_delete on public.payments
  for delete using (is_lessor(agreement_id));
