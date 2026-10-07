-- DueMeet: per-month messages ("Message the owner") between renter and lessor.
create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  period_id    uuid references public.periods(id) on delete set null,
  sender       text not null check (sender in ('renter','lessor')),
  body         text not null,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create index if not exists messages_agreement_idx on public.messages(agreement_id);
create index if not exists messages_period_idx    on public.messages(period_id);

-- All reads/writes go through the server (service role) with manual auth
-- checks, so enable RLS and add no public policies (denies anon/auth clients).
alter table public.messages enable row level security;
