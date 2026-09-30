-- Onboarding role: which experience the user picked on the welcome screen.
-- Nullable so existing/new users without a choice are sent to /welcome once.
alter table public.users
  add column if not exists role text
  check (role in ('lessor', 'tenant'));

-- Backfill current users from their existing data so they skip onboarding:
-- anyone who already owns a unit is a lessor; anyone linked to a rental is a tenant.
update public.users u
  set role = 'lessor'
  where u.role is null
    and exists (select 1 from public.assets a where a.lessor_id = u.id);

update public.users u
  set role = 'tenant'
  where u.role is null
    and exists (
      select 1 from public.agreements ag where ag.renter_user_id = u.id
    );
