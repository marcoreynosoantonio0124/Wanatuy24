# Wanatuy24

Rental / lease agreement management for Philippine lessors — track assets,
recurring rent, due dates, payment proofs, and reminders.

## Web app (PWA)

The website and app are one Next.js + Supabase + Tailwind codebase in
[`web/`](web/), shipped as an installable PWA. See [`web/README.md`](web/README.md)
for setup and routes. Core flows: lessor sign-in, units, agreements (with
automatic due-date generation), payment-proof review, an account-less renter
portal, and Web Push reminders driven by a scheduled job.

**Going live:** follow [`DEPLOY.md`](DEPLOY.md) — Supabase + Vercel, ~15 minutes,
no server to manage.

## Database schema

The Postgres / Supabase schema is implemented as versioned migrations in
[`supabase/migrations/`](supabase/migrations/):

- `0001_rental_agreement_schema.sql` — enums, `e164` domain, tables, constraints,
  indexes, and triggers.
- `0002_period_generation.sql` — date helpers and `generate_periods(...)`.
- `0003_row_level_security.sql` — RLS policies (Supabase `auth.uid()`).
- `0004_scheduling.sql` — `refresh_period_statuses()` and `generate_all_periods()`
  for the recurring job.

See [`docs/schema.md`](docs/schema.md) for the data model, conventions
(money in centavos, Asia/Manila reminders), and how to apply the migrations.
