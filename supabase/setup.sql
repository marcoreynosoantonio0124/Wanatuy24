-- Wanatuy24 — full database setup (all migrations concatenated).
-- Convenience for the Supabase SQL editor: paste this whole file and Run once.
-- (For the Supabase CLI, use `supabase db push` against supabase/migrations instead.)

-- =====================================================================
-- 0001_rental_agreement_schema.sql
-- =====================================================================
-- 0001_rental_agreement_schema.sql
-- Wanatuy24 — rental / lease agreement management (MVP) core schema.
--
-- Target: Postgres 15+ / Supabase.
-- Conventions:
--   * All monetary amounts are INTEGER CENTAVOS in the column `amount_php`
--     (e.g. ₱1,500.00 is stored as 150000). Never store pesos as floats.
--   * Timestamps are `timestamptz` (UTC). `reminder_time_local` is a wall-clock
--     `time` interpreted in Asia/Manila by the application.
--   * `public.users.id` is expected to equal the Supabase auth user id
--     (auth.uid()). Row Level Security in 0003 relies on that mapping.

begin;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;  -- gen_random_uuid(), gen_random_bytes()
create extension if not exists citext;    -- case-insensitive email addresses

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type asset_type as enum
  ('house','room','apartment','car','motorcycle','commercial','other');

create type agreement_frequency as enum
  ('monthly','weekly','biweekly','quarterly');

create type agreement_status as enum
  ('draft','active','ended','cancelled');

create type period_status as enum
  ('upcoming','due','overdue','proof_submitted','paid','waived');

create type payment_method as enum
  ('gcash','maya','bank_transfer','cash','other');

create type proof_submitter as enum
  ('renter','lessor');

create type proof_status as enum
  ('pending','accepted','rejected');

create type notification_recipient as enum
  ('renter','lessor');

create type notification_channel as enum
  ('email','push','viber_manual');

create type notification_status as enum
  ('scheduled','sent','failed','skipped');

-- ---------------------------------------------------------------------------
-- Domains
-- ---------------------------------------------------------------------------
-- E.164 phone number: leading '+', first digit 1-9, 8..15 total digits.
-- Philippine mobile numbers look like +639171234567.
create domain e164 as text
  check (value ~ '^\+[1-9]\d{7,14}$');

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

-- Validates the two jsonb columns on `agreements` (CHECK constraints cannot
-- contain subqueries, so element-level validation lives in a trigger).
create or replace function agreements_validate()
returns trigger language plpgsql as $$
begin
  if jsonb_typeof(new.reminder_schedule) <> 'array' then
    raise exception 'reminder_schedule must be a JSON array of integer day offsets';
  end if;
  if exists (
    select 1 from jsonb_array_elements(new.reminder_schedule) e
    where jsonb_typeof(e.value) <> 'number'
  ) then
    raise exception 'reminder_schedule offsets must be numbers';
  end if;

  if jsonb_typeof(new.accepted_payment_methods) <> 'array' then
    raise exception 'accepted_payment_methods must be a JSON array';
  end if;
  if exists (
    select 1 from jsonb_array_elements_text(new.accepted_payment_methods) m
    where m.value not in ('gcash','maya','bank_transfer','cash','other')
  ) then
    raise exception 'accepted_payment_methods contains an invalid payment method';
  end if;

  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
create table users (
  id          uuid primary key default gen_random_uuid(),
  email       citext not null unique,
  full_name   text,
  phone       e164,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

comment on table  users is 'Application users (lessors and, once claimed, renters). id is expected to equal the Supabase auth user id.';
comment on column users.phone is 'E.164 format, e.g. +639171234567.';

-- ---------------------------------------------------------------------------
-- assets
-- ---------------------------------------------------------------------------
create table assets (
  id            uuid primary key default gen_random_uuid(),
  lessor_id     uuid not null references users(id) on delete cascade,
  type          asset_type not null,
  label         text not null,
  address_text  text,
  notes         text,
  created_at    timestamptz not null default now()
);

comment on column assets.label is 'Human label, e.g. "Unit 2B, Sampaloc".';
create index assets_lessor_id_idx on assets(lessor_id);

-- ---------------------------------------------------------------------------
-- agreements
-- ---------------------------------------------------------------------------
create table agreements (
  id                       uuid primary key default gen_random_uuid(),
  asset_id                 uuid not null references assets(id) on delete cascade,
  lessor_id                uuid not null references users(id) on delete restrict,

  renter_name              text not null,
  renter_email             citext,
  renter_phone             e164,
  renter_user_id           uuid references users(id) on delete set null,

  amount_php               bigint not null check (amount_php >= 0),
  frequency                agreement_frequency not null,
  due_day                  smallint not null,

  start_date               date not null,
  end_date                 date,
  grace_days               integer not null default 0 check (grace_days >= 0),

  reminder_schedule        jsonb not null default '[-7,-3,-1,0,1,3,7]'::jsonb,
  reminder_time_local      time  not null default '09:00',

  accepted_payment_methods jsonb not null default '["gcash","cash"]'::jsonb,
  payment_instructions     text,

  contract_file_path       text,
  status                   agreement_status not null default 'draft',

  renter_access_token      text not null unique
                             default encode(gen_random_bytes(32), 'hex'),

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  -- due_day meaning depends on frequency:
  --   monthly / quarterly -> day of month (1..31, clamped to month length)
  --   weekly  / biweekly  -> day of week  (0=Sunday .. 6=Saturday)
  constraint agreements_due_day_valid check (
    (frequency in ('monthly','quarterly') and due_day between 1 and 31)
    or
    (frequency in ('weekly','biweekly')  and due_day between 0 and 6)
  ),
  constraint agreements_end_after_start check (
    end_date is null or end_date >= start_date
  )
);

comment on column agreements.amount_php is 'Recurring rent, in integer centavos.';
comment on column agreements.reminder_schedule is 'JSON array of day offsets relative to due date, e.g. [-7,-3,-1,0,1,3,7].';
comment on column agreements.reminder_time_local is 'Wall-clock time, interpreted in Asia/Manila by the app.';
comment on column agreements.accepted_payment_methods is 'JSON array, subset of gcash|maya|bank_transfer|cash|other.';
comment on column agreements.renter_access_token is 'Random 32 bytes (hex-encoded) for renter magic links.';

create index agreements_asset_id_idx       on agreements(asset_id);
create index agreements_lessor_id_idx      on agreements(lessor_id);
create index agreements_renter_user_id_idx on agreements(renter_user_id) where renter_user_id is not null;
create index agreements_status_idx         on agreements(status);

create trigger agreements_set_updated_at
  before update on agreements
  for each row execute function set_updated_at();

create trigger agreements_validate_json
  before insert or update on agreements
  for each row execute function agreements_validate();

-- ---------------------------------------------------------------------------
-- periods  (one row per due date; generated ahead of time, see 0002)
-- ---------------------------------------------------------------------------
create table periods (
  id               uuid primary key default gen_random_uuid(),
  agreement_id     uuid not null references agreements(id) on delete cascade,
  due_date         date not null,
  amount_php       bigint not null check (amount_php >= 0),
  status           period_status not null default 'upcoming',
  paid_at          timestamptz,
  acknowledged_by  uuid references users(id) on delete set null,
  acknowledged_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique (agreement_id, due_date)
);

create index periods_agreement_id_idx on periods(agreement_id);
create index periods_status_idx       on periods(status);
create index periods_due_date_idx     on periods(due_date);

-- ---------------------------------------------------------------------------
-- charges  (one-off items: utilities, repairs, late fees)
-- ---------------------------------------------------------------------------
create table charges (
  id            uuid primary key default gen_random_uuid(),
  agreement_id  uuid not null references agreements(id) on delete cascade,
  period_id     uuid references periods(id) on delete set null,
  label         text not null,
  amount_php    bigint not null,
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now()
);

comment on column charges.amount_php is 'Integer centavos; may be negative for a credit/discount.';
create index charges_agreement_id_idx on charges(agreement_id);
create index charges_period_id_idx    on charges(period_id) where period_id is not null;

-- ---------------------------------------------------------------------------
-- payment_proofs
-- ---------------------------------------------------------------------------
create table payment_proofs (
  id                uuid primary key default gen_random_uuid(),
  period_id         uuid not null references periods(id) on delete cascade,
  submitted_by      proof_submitter not null,
  method            payment_method not null,
  reference_no      text,
  amount_php        bigint not null check (amount_php >= 0),
  paid_on           date not null,
  file_path         text,           -- Supabase Storage path (image or pdf)
  note              text,
  status            proof_status not null default 'pending',
  reviewed_at       timestamptz,
  rejection_reason  text,
  created_at        timestamptz not null default now()
);

create index payment_proofs_period_id_idx on payment_proofs(period_id);
create index payment_proofs_status_idx     on payment_proofs(status);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  agreement_id   uuid not null references agreements(id) on delete cascade,
  period_id      uuid references periods(id) on delete cascade,
  recipient      notification_recipient not null,
  channel        notification_channel not null,
  template_key   text not null,
  scheduled_for  timestamptz not null,
  sent_at        timestamptz,
  status         notification_status not null default 'scheduled',
  dedupe_key     text not null unique,   -- e.g. "{period_id}:{offset}:{channel}"
  created_at     timestamptz not null default now()
);

create index notifications_agreement_id_idx  on notifications(agreement_id);
create index notifications_period_id_idx      on notifications(period_id) where period_id is not null;
-- Supports the sender worker: "give me scheduled notifications that are due".
create index notifications_due_idx on notifications(scheduled_for)
  where status = 'scheduled';

-- ---------------------------------------------------------------------------
-- push_subscriptions  (Web Push; renter may have no account)
-- ---------------------------------------------------------------------------
create table push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  agreement_id  uuid references agreements(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  constraint push_subscriptions_subject check (
    user_id is not null or agreement_id is not null
  )
);

create index push_subscriptions_user_id_idx      on push_subscriptions(user_id) where user_id is not null;
create index push_subscriptions_agreement_id_idx on push_subscriptions(agreement_id) where agreement_id is not null;

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------
create table audit_log (
  id             bigint generated always as identity primary key,
  actor_user_id  uuid references users(id) on delete set null,
  actor_role     text not null,
  agreement_id   uuid references agreements(id) on delete set null,
  action         text not null,
  payload        jsonb,
  created_at     timestamptz not null default now()
);

create index audit_log_agreement_id_idx on audit_log(agreement_id, created_at desc);

commit;

-- =====================================================================
-- 0002_period_generation.sql
-- =====================================================================
-- 0002_period_generation.sql
-- Date arithmetic + period generation for agreements.
--
-- `generate_periods(agreement_id, until_date)` fills in `periods` rows up to
-- (and including) `until_date`, respecting the agreement's frequency, due_day,
-- start_date and end_date. It is idempotent — re-running never duplicates a
-- due date thanks to the UNIQUE(agreement_id, due_date) constraint.

begin;

-- Advance from a known due date to the next one.
--   weekly    -> +7 days
--   biweekly  -> +14 days
--   monthly   -> next month,   due_day clamped to that month's length
--   quarterly -> +3 months,    due_day clamped to that month's length
create or replace function rental_next_due_date(
  prev     date,
  freq     agreement_frequency,
  due_day  int
) returns date language plpgsql immutable as $$
declare
  month_start date;
  days_in_month int;
begin
  case freq
    when 'weekly'    then return prev + 7;
    when 'biweekly'  then return prev + 14;
    when 'monthly'   then month_start := (date_trunc('month', prev) + interval '1 month')::date;
    when 'quarterly' then month_start := (date_trunc('month', prev) + interval '3 months')::date;
  end case;

  days_in_month := extract(day from (month_start + interval '1 month - 1 day'))::int;
  return month_start + (least(due_day, days_in_month) - 1);
end
$$;

-- First due date on or after start_date.
create or replace function rental_first_due_date(
  start_date  date,
  freq        agreement_frequency,
  due_day     int
) returns date language plpgsql immutable as $$
declare
  month_start date;
  days_in_month int;
  candidate date;
begin
  if freq in ('weekly','biweekly') then
    -- due_day: 0=Sunday .. 6=Saturday, matching extract(dow ...).
    return start_date + ((due_day - extract(dow from start_date)::int + 7) % 7);
  end if;

  month_start   := date_trunc('month', start_date)::date;
  days_in_month := extract(day from (month_start + interval '1 month - 1 day'))::int;
  candidate     := month_start + (least(due_day, days_in_month) - 1);

  if candidate < start_date then
    candidate := rental_next_due_date(candidate, freq, due_day);
  end if;
  return candidate;
end
$$;

-- Generate periods for one agreement up to `p_until`.
-- Returns the number of newly-created periods.
create or replace function generate_periods(
  p_agreement_id uuid,
  p_until        date
) returns int language plpgsql as $$
declare
  a         agreements%rowtype;
  d         date;
  last_due  date;
  created   int := 0;
begin
  select * into a from agreements where id = p_agreement_id;
  if not found then
    raise exception 'agreement % not found', p_agreement_id;
  end if;

  select max(due_date) into last_due from periods where agreement_id = p_agreement_id;

  if last_due is null then
    d := rental_first_due_date(a.start_date, a.frequency, a.due_day);
  else
    d := rental_next_due_date(last_due, a.frequency, a.due_day);
  end if;

  while d <= p_until and (a.end_date is null or d <= a.end_date) loop
    insert into periods (agreement_id, due_date, amount_php, status)
    values (p_agreement_id, d, a.amount_php, 'upcoming')
    on conflict (agreement_id, due_date) do nothing;

    if found then
      created := created + 1;
    end if;

    d := rental_next_due_date(d, a.frequency, a.due_day);
  end loop;

  return created;
end
$$;

comment on function generate_periods(uuid, date) is
  'Idempotently create upcoming periods for an agreement up to the given date.';

commit;

-- =====================================================================
-- 0003_row_level_security.sql
-- =====================================================================
-- 0003_row_level_security.sql
-- Row Level Security policies.
--
-- ASSUMPTIONS
--   * public.users.id == auth.uid() (the Supabase auth user id).
--   * Trusted server code (Edge Functions / cron) uses the service_role key,
--     which BYPASSES RLS. That path handles:
--       - account-less renters (magic-link access via renter_access_token),
--       - period generation, notification scheduling, and audit writes.
--   * These policies scope what an *authenticated end user* can see/do via the
--     anon/authenticated keys.
--
-- If your auth model differs, drop this migration — 0001/0002 stand alone.

begin;

alter table users              enable row level security;
alter table assets             enable row level security;
alter table agreements         enable row level security;
alter table periods            enable row level security;
alter table charges            enable row level security;
alter table payment_proofs     enable row level security;
alter table notifications      enable row level security;
alter table push_subscriptions enable row level security;
alter table audit_log          enable row level security;

-- Helper: is the current user the lessor on this agreement?
create or replace function is_lessor(p_agreement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from agreements a
    where a.id = p_agreement_id and a.lessor_id = auth.uid()
  );
$$;

-- Helper: is the current user a party (lessor or claimed renter) on this agreement?
create or replace function is_party(p_agreement_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from agreements a
    where a.id = p_agreement_id
      and (a.lessor_id = auth.uid() or a.renter_user_id = auth.uid())
  );
$$;

-- users ---------------------------------------------------------------------
create policy users_select_self on users
  for select using (id = auth.uid());
create policy users_update_self on users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- assets --------------------------------------------------------------------
create policy assets_owner_all on assets
  for all using (lessor_id = auth.uid()) with check (lessor_id = auth.uid());

-- agreements ----------------------------------------------------------------
create policy agreements_lessor_all on agreements
  for all using (lessor_id = auth.uid()) with check (lessor_id = auth.uid());
create policy agreements_renter_select on agreements
  for select using (renter_user_id = auth.uid());

-- periods -------------------------------------------------------------------
create policy periods_party_select on periods
  for select using (is_party(agreement_id));
create policy periods_lessor_write on periods
  for all using (is_lessor(agreement_id)) with check (is_lessor(agreement_id));

-- charges -------------------------------------------------------------------
create policy charges_party_select on charges
  for select using (is_party(agreement_id));
create policy charges_lessor_write on charges
  for all using (is_lessor(agreement_id)) with check (is_lessor(agreement_id));

-- payment_proofs ------------------------------------------------------------
-- Either party may view proofs on their agreement's periods.
create policy payment_proofs_party_select on payment_proofs
  for select using (
    is_party((select p.agreement_id from periods p where p.id = period_id))
  );
-- Either party may submit a proof; only the lessor updates review status.
create policy payment_proofs_party_insert on payment_proofs
  for insert with check (
    is_party((select p.agreement_id from periods p where p.id = period_id))
  );
create policy payment_proofs_lessor_update on payment_proofs
  for update using (
    is_lessor((select p.agreement_id from periods p where p.id = period_id))
  );

-- notifications -------------------------------------------------------------
create policy notifications_party_select on notifications
  for select using (is_party(agreement_id));

-- push_subscriptions --------------------------------------------------------
create policy push_subscriptions_owner_all on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log -----------------------------------------------------------------
-- Read-only to the lessor on their agreements; writes go through service_role.
create policy audit_log_lessor_select on audit_log
  for select using (agreement_id is not null and is_lessor(agreement_id));

commit;

-- =====================================================================
-- 0004_scheduling.sql
-- =====================================================================
-- 0004_scheduling.sql
-- Set-based helpers a scheduler (the app's /api/cron route, or pg_cron) calls
-- periodically to keep periods current and extend the horizon.

begin;

-- Advance period statuses based on today's date in Asia/Manila.
--   upcoming -> due      once the due date has arrived
--   .. -> overdue        once past the due date + grace_days
-- Terminal statuses (proof_submitted, paid, waived) are left untouched.
create or replace function refresh_period_statuses()
returns void language plpgsql as $$
declare
  today date := (now() at time zone 'Asia/Manila')::date;
begin
  update periods p
     set status = 'due'
    from agreements a
   where p.agreement_id = a.id
     and p.status = 'upcoming'
     and p.due_date <= today;

  update periods p
     set status = 'overdue'
    from agreements a
   where p.agreement_id = a.id
     and p.status in ('upcoming', 'due')
     and (p.due_date + a.grace_days) < today;
end
$$;

-- Extend periods for every active agreement up to p_until.
-- Returns the total number of newly-created periods.
create or replace function generate_all_periods(p_until date)
returns int language plpgsql as $$
declare
  rec record;
  total int := 0;
begin
  for rec in select id from agreements where status = 'active' loop
    total := total + generate_periods(rec.id, p_until);
  end loop;
  return total;
end
$$;

comment on function refresh_period_statuses() is
  'Advance upcoming->due->overdue using Asia/Manila today and grace_days.';
comment on function generate_all_periods(date) is
  'Run generate_periods for all active agreements up to the given date.';

commit;

-- =====================================================================
-- 0005_storage.sql
-- =====================================================================
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

