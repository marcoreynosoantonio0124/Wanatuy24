# Wanatuy24 — data model

Rental / lease agreement management for Philippine lessors: track assets,
recurring rent, due dates, payment proofs, and reminders.

Backend: **Postgres / Supabase**. Migrations live in `supabase/migrations/`.

## Conventions

- **Money** is stored as **integer centavos** in `amount_php` (₱1,500.00 → `150000`).
  Never store pesos as floating point.
- **Timestamps** are `timestamptz` (UTC). `reminder_time_local` is a wall-clock
  `time` the app interprets in **Asia/Manila**.
- **Phones** use the `e164` domain (`+639171234567`).
- `public.users.id` is expected to equal the Supabase auth user id (`auth.uid()`).

## Tables

| Table | Purpose |
|-------|---------|
| `users` | Lessors and (once claimed) renters. |
| `assets` | Things a lessor rents out (house, room, apartment, car, …). |
| `agreements` | The lease terms: amount, frequency, due day, reminders, payment methods, renter access token. |
| `periods` | One row per due date, generated ahead of time from the agreement. |
| `charges` | One-off items (utilities, repairs, late fees), optionally tied to a period. |
| `payment_proofs` | Renter/lessor-submitted proof of payment for a period, reviewed by the lessor. |
| `notifications` | Scheduled reminders (email / push / manual Viber), deduped per period+offset+channel. |
| `push_subscriptions` | Web Push subscriptions; may belong to an account-less renter via `agreement_id`. |
| `audit_log` | Append-only record of significant actions. |

### `agreements.due_day`

The meaning depends on `frequency`, enforced by a CHECK constraint:

- `monthly` / `quarterly` → day of month `1..31` (clamped to the month's length,
  so `31` becomes Feb 28/29).
- `weekly` / `biweekly` → day of week `0..6` (0 = Sunday), matching Postgres `dow`.

### JSON columns on `agreements`

- `reminder_schedule` — array of integer day offsets relative to the due date,
  e.g. `[-7,-3,-1,0,1,3,7]`.
- `accepted_payment_methods` — array, a subset of
  `gcash | maya | bank_transfer | cash | other`.

Both are validated by the `agreements_validate()` trigger (element-level checks
that CHECK constraints can't express).

## Migrations

| File | Contents |
|------|----------|
| `0001_rental_agreement_schema.sql` | Extensions, enums, `e164` domain, all tables, constraints, indexes, `updated_at` + JSON-validation triggers. |
| `0002_period_generation.sql` | `rental_first_due_date`, `rental_next_due_date`, and idempotent `generate_periods(agreement_id, until_date)`. |
| `0003_row_level_security.sql` | RLS enable + owner/party policies. Assumes `users.id = auth.uid()`; trusted server code uses the service role (which bypasses RLS) for account-less renters, period/notification generation, and audit writes. |
| `0004_scheduling.sql` | `refresh_period_statuses()` (advance `upcoming→due→overdue`) and `generate_all_periods(until)` — called by the app's `/api/cron` route or `pg_cron`. |
| `0005_storage.sql` | Private `payment-proofs` Storage bucket (Supabase only) for uploaded receipts. |

## Applying

With the Supabase CLI:

```bash
supabase db reset          # applies migrations to a local stack
# or push to a linked project:
supabase db push
```

Directly against a database:

```bash
psql "$DATABASE_URL" -f supabase/migrations/0001_rental_agreement_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/0002_period_generation.sql
psql "$DATABASE_URL" -f supabase/migrations/0003_row_level_security.sql
```

> `0003` references `auth.uid()`, which exists on Supabase. On a plain Postgres
> instance (e.g. CI), create a stub `auth` schema and `auth.uid()` first, or skip
> `0003` — `0001`/`0002` stand alone.

## Generating periods

```sql
-- Create upcoming periods for an agreement through the end of next year.
select generate_periods('<agreement-uuid>', (current_date + interval '18 months')::date);
```

Re-running is safe: `UNIQUE(agreement_id, due_date)` plus `ON CONFLICT DO NOTHING`
means only missing due dates are inserted. A nightly job typically extends the
horizon and a separate worker transitions period `status`
(`upcoming → due → overdue → paid`) and materializes `notifications`.
