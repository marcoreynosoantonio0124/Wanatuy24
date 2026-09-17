# Try Wanatuy24 on Replit

You still need a free **Supabase** project for the database + auth (Replit only
runs the app). ~10 minutes.

## 1. Supabase (once)

Same as `DEPLOY.md` Phase 1:

1. <https://supabase.com> → **New project** (region: Singapore). Save the password.
2. **SQL Editor → New query** → paste all of `supabase/setup.sql` → **Run**.
3. **Project Settings → API** → copy **Project URL**, **anon** key, **service_role** key.

## 2. Import into Replit

1. <https://replit.com> → **Create Repl** → **Import from GitHub** →
   `marcoreynosoantonio0124/Wanatuy24` (merge PR #1 first so `main` has the code,
   or pick the feature branch).
2. Replit reads `.replit` and knows to build in `web/`.

## 3. Add Secrets

In the Repl's **Tools → Secrets** (lock icon), add:

```
NEXT_PUBLIC_SUPABASE_URL=<your Project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
SUPABASE_SERVICE_ROLE_KEY=<your service_role key>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMqAOboAkLbOD_GHe2Dak9B7I35rgZ-v3SfDqDK8IOkVft-oxsKCGhBCNVwVYKvKk_6iRGp-rVqmBwbzufbAGSg
VAPID_PRIVATE_KEY=bkPA1mPfQKG8bV6NCDHdbld0Bpo7JMFfe0nO7Xn9DMg
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=change-me-to-a-long-random-string
```

## 4. Run, then set the URL

1. Press **Run**. First boot installs dependencies (~1–2 min), then the web
   preview opens. Copy that URL — it looks like
   `https://<repl>.<user>.replit.dev`.
2. Add one more Secret so magic-link sign-in redirects correctly, then Stop/Run:
   `APP_BASE_URL=https://<your-replit-url>`
3. In **Supabase → Authentication → URL Configuration**:
   - **Site URL**: your Replit URL
   - **Redirect URLs**: add `https://<your-replit-url>/auth/callback`

## 5. Use it

Open the preview → **Sign in** → magic link → add a unit → create an agreement →
copy the renter link. (Web Push needs HTTPS, which the Replit URL provides.)

### Notes

- This runs Next in **dev mode** — fine for trying. For production, deploy to
  Vercel (`DEPLOY.md`).
- **Reminders**: `/api/cron` exists here too, but nothing calls it on a schedule
  in a dev Repl. Hit it manually to test:
  `curl -X POST https://<your-replit-url>/api/cron -H "x-cron-secret: <CRON_SECRET>"`
  For automatic hourly reminders, use the Vercel deploy + GitHub Action.
