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
