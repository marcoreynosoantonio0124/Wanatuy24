# DueMate

Agreement reminder & compliance tracker. A shared timeline for recurring
obligations (rent, rentals, tasks, your own mortgage): the system generates a
due-date schedule from each agreement, sends bounded escalation reminders, lets
the responsible party submit proof of compliance, and lets the counter-party
confirm it. Confirmation stops the reminders for that period.

Built to the DueMate MVP spec. **Stack:** Next.js (App Router, TypeScript) ·
PostgreSQL · Prisma · Luxon (timezone math) · Vitest.

---

## What's implemented in this pass

This session delivered the spec's build-order steps 1–5 — the schema and the
tested domain core that everything else hangs off — plus a minimal UI and seed
data. Everything below is implemented **and unit-tested** (50 tests, all green):

| Area | Where | Notes |
|------|-------|-------|
| **Domain model** | `prisma/schema.prisma` | All models/enums from spec §3, incl. optimistic-lock `version` and `UserNotificationPrefs`. |
| **Occurrence generation** | `src/lib/domain/occurrences.ts` | RRULE subset → materialised occurrences. Month-end clamping (31st → Feb 28/29), leap years, DST offset shifts, COUNT/UNTIL. UTC in DB, agreement TZ for "due at 09:00". |
| **State machine** | `src/lib/domain/stateMachine.ts` | Full occurrence lifecycle (spec §4.3) with illegal-transition guards. |
| **Reminder policy** | `src/lib/domain/reminders.ts` | Bounded escalation, default policy, max-10-steps / min-1-day validation, quiet-hours shifting (incl. windows crossing midnight), resume-from-step after rejection. |
| **Authorization** | `src/lib/domain/authorization.ts` | The security boundary (spec §7): read / submit / review / waive / manage, per-agreement roles, self-agreement symmetry. |
| **Notifications** | `src/lib/notifications/*` | `NotificationChannel` abstraction; Email (Resend/SMTP with dev-log fallback), In-App, SMS **stub** (spec A2). Keyed templates with ≤160-char SMS variants. |
| **Service layer** | `src/lib/services/*` | `submitProof`, `reviewProof`, `waiveOccurrence`, `activateAgreement`, occurrence materialisation. Every mutation enforces authz, applies the state machine under optimistic locking, and writes an `AuditLog` row atomically. |
| **UI (minimal)** | `src/app/*` | Home, lessor dashboard (stats + review queue), shared timeline, occurrence detail, renter home. Mobile-first, high-contrast. |
| **Seed** | `prisma/seed.ts` | One lessor, three assets (unit, car, self-mortgage), two renters, mixed-status occurrences past/present/future. |

### Remaining build-order work (hooks left, not built)

These were explicitly deferred this pass; the domain core is designed so they
bolt on without rework:

- **Auth.js** wiring (build-order step 2) — session, magic-link/password,
  signed read-only occurrence links for unregistered renters. The
  authorization *rules* are done and tested; what's missing is the session that
  supplies `userId`.
- **Job queue runtime** — BullMQ + Redis (or pg-boss) worker that drains the
  `Notification` rows this app schedules, plus the nightly top-up / OVERDUE
  transition / FAILED-retry job (spec §5.4). Scheduling logic is pure and
  tested; only the worker process is absent.
- **Object storage** — S3-compatible signed-URL upload for proofs
  (`proofs/{agreementId}/{occurrenceId}/{uuid}`). `Proof.fileUrl` is wired.
- **Leaflet portfolio map** (spec §6.1) — the dashboard renders the data it
  needs; the client map component is pending.
- **Reminder-policy editor UI** (build-order step 7) — validation is done.
- **Playwright golden-path E2E** (build-order step 8).
- **CSV export** of confirmed occurrences (spec §9, "if time allows").

---

## Getting started

```bash
npm install
cp .env.example .env          # then fill in DATABASE_URL at minimum
npx prisma generate
npx prisma migrate dev        # creates the schema in your Postgres
npm run seed                  # loads demo lessor/renters/assets/occurrences
npm run dev                   # http://localhost:3000
```

Run the tests (no database required — the domain core is pure):

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
```

## Environment variables

See `.env.example` for the full annotated list. The essentials:

- `DATABASE_URL` — PostgreSQL connection string (required).
- `APP_URL` — base URL for deep links inside notifications.
- `DEFAULT_TIMEZONE` / `DEFAULT_CURRENCY` — locale defaults (spec A11:
  `Asia/Dubai` / `AED`). Per-agreement values override these.
- `PUBLIC_SIGNUP` — leave `false` for the single-operator launch (spec A4).
- Email: `EMAIL_FROM` plus either `RESEND_API_KEY` **or** `SMTP_*`. With
  neither set, `EmailChannel` logs to stdout so local/CI runs need no provider.

## Enabling SMS (currently stubbed — spec A2)

`SmsChannel` (`src/lib/notifications/channels.ts`) logs and returns `ok`. To go
live:

1. Add the Twilio SDK and implement a `TwilioSmsChannel` using
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
2. Register it in the `ChannelRegistry` in place of the stub.
3. Set `SMS_ENABLED=true`.

No business logic changes — reminder policies already list `SMS` as a channel
and templates already carry a ≤160-char SMS variant.

## Email deliverability

Configure **SPF** and **DKIM** for the `EMAIL_FROM` domain (Resend and most
SMTP providers give you the exact DNS records). Reminders are transactional and
not unsubscribable per se, but a user may turn off email if SMS or in-app is on;
never let a user disable **every** channel silently — warn them
(`UserNotificationPrefs`). Add `List-Unsubscribe` headers to non-critical mail
at the transport layer.

## Design notes worth knowing

- **Money is `Decimal`, never float** (schema `@db.Decimal(14,2)`).
- **Occurrences are materialised**, not computed on the fly (spec §3 rule 1).
  Editing an obligation regenerates only `UPCOMING` occurrences; `CONFIRMED` /
  `WAIVED` history is never touched.
- **Every state change writes an `AuditLog` row** — this is the transparency
  feature; the renter sees the same policy and audit trail as the lessor
  (spec §6.2).
- **Optimistic locking** on `Occurrence.version` prevents double-confirm races
  (spec §8).
- **Self-agreements** (mortgage, spec A5): the owner holds both LESSOR and
  RENTER roles; authorization symmetry lets them confirm their own payment.

## Out of scope for v1 (hooks retained — spec §9)

Live GPS/telematics (`Asset.metadata`), payment gateway / collecting money
(`Proof.gatewayRef`), native apps, e-signature, multi-currency conversion,
cross-lessor renter history. See spec §1/§9 for the rationale.
