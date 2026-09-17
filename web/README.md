# Wanatuy24 — web app (PWA)

Next.js (App Router) + Supabase + Tailwind, shipped as an installable PWA — so
it's both the **website** and the **app**. A native iOS/Android wrapper (Expo)
can be added later against the same Supabase backend.

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Supabase** — Postgres, Auth (email magic link), Storage, RLS
- **Tailwind CSS v4**
- **Web Push** via a service worker (`public/sw.js`) + VAPID

## Setup

1. **Apply the database migrations** (from the repo root):

   ```bash
   supabase db push          # or psql -f each file in supabase/migrations
   ```

2. **Configure env** — copy `.env.example` to `.env.local` and fill in:

   ```bash
   cp .env.example .env.local
   npx web-push generate-vapid-keys   # for the VAPID_* values
   ```

   | Var | Where |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
   | `SUPABASE_SERVICE_ROLE_KEY` | same page (server-only, bypasses RLS) |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `web-push generate-vapid-keys` |
   | `CRON_SECRET` | any random string; sent as `x-cron-secret` to `/api/cron` |

3. **Run:**

   ```bash
   npm install
   npm run dev      # http://localhost:3000
   npm run build && npm start
   ```

## Routes

| Route | Who | What |
|-------|-----|------|
| `/` | public | Landing page |
| `/login` | public | Magic-link sign in |
| `/dashboard` | lessor | Outstanding, proofs to review, push toggle |
| `/assets` | lessor | Add & list units |
| `/agreements/new` | lessor | Create an agreement (seeds periods) |
| `/agreements/[id]` | lessor | Periods, proof review, charges, renter link |
| `/r/[token]` | renter | Account-less portal via `renter_access_token`; submit payment proof |
| `POST /api/push/subscribe` | lessor | Save a Web Push subscription |
| `POST /api/cron` | scheduler | Extend periods, advance statuses, send reminders |

## The scheduled job

`POST /api/cron` (header `x-cron-secret: $CRON_SECRET`) drives the recurring
work. Point any scheduler at it — Vercel Cron, a GitHub Action, or Supabase
`pg_cron` + `pg_net`. Each run:

1. `generate_all_periods` — extends the due-date horizon for active agreements.
2. `refresh_period_statuses` — advances `upcoming → due → overdue` (Asia/Manila,
   respecting `grace_days`).
3. Materializes reminder rows from each agreement's `reminder_schedule` into
   `notifications` (deduped by `{period}:{offset}:{channel}`).
4. Delivers due **push** reminders and prunes dead subscriptions.

Example Vercel `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron", "schedule": "0 * * * *" }] }
```

(Vercel Cron can't set custom headers — either allow it by checking Vercel's
cron header instead, or trigger `/api/cron` from a GitHub Action that sends
`x-cron-secret`.)

## What's stubbed for later

- **Email reminders** — the job materializes push reminders; wire an email
  provider (Resend/Postmark) to also send the `email` channel.
- **Proof file uploads** — the renter portal submits reference + amount; add a
  Supabase Storage upload for the screenshot/receipt (`payment_proofs.file_path`).
- **PNG app icons** — a single SVG icon is used; add 192/512 PNGs for the
  broadest install support.
- **Native app** — wrap with Expo/Capacitor reusing this Supabase backend.
