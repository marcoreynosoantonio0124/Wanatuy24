# Deploy Wanatuy24 (live website + app)

Two accounts get you a public, installable app: **Supabase** (database + auth)
and **Vercel** (hosting). ~15 minutes.

## 1. Create the Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a region close to the
   Philippines (e.g. Singapore). Save the database password.
2. When it's ready, open **SQL Editor** and run each migration in order,
   pasting the file contents and clicking **Run**:
   - `supabase/migrations/0001_rental_agreement_schema.sql`
   - `supabase/migrations/0002_period_generation.sql`
   - `supabase/migrations/0003_row_level_security.sql`
   - `supabase/migrations/0004_scheduling.sql`

   > CLI alternative: `supabase link --project-ref <ref> && supabase db push`

3. **Auth** → **Providers** → make sure **Email** is enabled (magic links are on
   by default). No SMTP setup is needed to start — Supabase sends the emails.

4. **Project Settings** → **API**: copy the **Project URL**, the **anon** key,
   and the **service_role** key (keep this one secret).

## 2. Deploy to Vercel

1. Push this repo to GitHub (already done for the working branch).
2. <https://vercel.com> → **Add New… → Project** → import the repo.
3. **Root Directory: `web`** (important — the app lives in `web/`).
4. Add **Environment Variables** (Production + Preview):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | VAPID public key (below) |
   | `VAPID_PRIVATE_KEY` | VAPID private key (below) |
   | `VAPID_SUBJECT` | `mailto:you@example.com` |
   | `CRON_SECRET` | any long random string |

   Generate the VAPID pair locally:

   ```bash
   cd web && npx web-push generate-vapid-keys
   ```

5. **Deploy.** You'll get a URL like `https://wanatuy24.vercel.app`.

## 3. Point auth back at your domain

In Supabase → **Auth** → **URL Configuration**:

- **Site URL**: `https://<your-app>.vercel.app`
- **Redirect URLs**: add `https://<your-app>.vercel.app/auth/callback`

(For local dev also add `http://localhost:3000/auth/callback`.)

## 4. Reminders run themselves

`vercel.json` already registers an hourly Vercel Cron hit to `/api/cron`.
Because `CRON_SECRET` is set, Vercel sends it automatically as a Bearer token —
nothing else to wire. (A GitHub Action fallback is in
`.github/workflows/cron.yml` if you host elsewhere; set the `APP_BASE_URL` and
`CRON_SECRET` repo secrets.)

## 5. Use it

1. Open the site → **Sign in** → enter your email → click the magic link.
2. Add a **unit**, create an **agreement** — due dates generate automatically.
3. On the agreement page, **copy the renter link** and send it to your renter.
   They open it (no account needed) and submit payment proof.
4. On a phone, use the browser's **Install app** / **Add to Home Screen** to get
   the app icon, and tap **Turn on push reminders** on the dashboard.

That's the whole loop: create → remind → get proof → confirm.
