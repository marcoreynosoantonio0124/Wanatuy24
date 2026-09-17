# Wanatuy24

Rental / lease agreement management for Philippine lessors — track assets,
recurring rent, due dates, payment proofs, and reminders.

## Database schema (MVP)

The Postgres / Supabase schema is implemented as versioned migrations in
[`supabase/migrations/`](supabase/migrations/):

- `0001_rental_agreement_schema.sql` — enums, `e164` domain, tables, constraints,
  indexes, and triggers.
- `0002_period_generation.sql` — date helpers and `generate_periods(...)`.
- `0003_row_level_security.sql` — RLS policies (Supabase `auth.uid()`).

See [`docs/schema.md`](docs/schema.md) for the data model, conventions
(money in centavos, Asia/Manila reminders), and how to apply the migrations.
