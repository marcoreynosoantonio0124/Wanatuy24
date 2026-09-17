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
