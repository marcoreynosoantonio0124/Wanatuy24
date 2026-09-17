-- 0002_period_generation.sql
-- Date arithmetic + period generation for agreements.
--
-- `generate_periods(agreement_id, until_date)` fills in `periods` rows up to
-- (and including) `until_date`, respecting the agreement's frequency, due_day,
-- start_date and end_date. It is idempotent — re-running never duplicates a
-- due date thanks to the UNIQUE(agreement_id, due_date) constraint.

begin;

-- Advance from a known due date to the next one.
--   weekly    -> +7 days
--   biweekly  -> +14 days
--   monthly   -> next month,   due_day clamped to that month's length
--   quarterly -> +3 months,    due_day clamped to that month's length
create or replace function rental_next_due_date(
  prev     date,
  freq     agreement_frequency,
  due_day  int
) returns date language plpgsql immutable as $$
declare
  month_start date;
  days_in_month int;
begin
  case freq
    when 'weekly'    then return prev + 7;
    when 'biweekly'  then return prev + 14;
    when 'monthly'   then month_start := (date_trunc('month', prev) + interval '1 month')::date;
    when 'quarterly' then month_start := (date_trunc('month', prev) + interval '3 months')::date;
  end case;

  days_in_month := extract(day from (month_start + interval '1 month - 1 day'))::int;
  return month_start + (least(due_day, days_in_month) - 1);
end
$$;

-- First due date on or after start_date.
create or replace function rental_first_due_date(
  start_date  date,
  freq        agreement_frequency,
  due_day     int
) returns date language plpgsql immutable as $$
declare
  month_start date;
  days_in_month int;
  candidate date;
begin
  if freq in ('weekly','biweekly') then
    -- due_day: 0=Sunday .. 6=Saturday, matching extract(dow ...).
    return start_date + ((due_day - extract(dow from start_date)::int + 7) % 7);
  end if;

  month_start   := date_trunc('month', start_date)::date;
  days_in_month := extract(day from (month_start + interval '1 month - 1 day'))::int;
  candidate     := month_start + (least(due_day, days_in_month) - 1);

  if candidate < start_date then
    candidate := rental_next_due_date(candidate, freq, due_day);
  end if;
  return candidate;
end
$$;

-- Generate periods for one agreement up to `p_until`.
-- Returns the number of newly-created periods.
create or replace function generate_periods(
  p_agreement_id uuid,
  p_until        date
) returns int language plpgsql as $$
declare
  a         agreements%rowtype;
  d         date;
  last_due  date;
  created   int := 0;
begin
  select * into a from agreements where id = p_agreement_id;
  if not found then
    raise exception 'agreement % not found', p_agreement_id;
  end if;

  select max(due_date) into last_due from periods where agreement_id = p_agreement_id;

  if last_due is null then
    d := rental_first_due_date(a.start_date, a.frequency, a.due_day);
  else
    d := rental_next_due_date(last_due, a.frequency, a.due_day);
  end if;

  while d <= p_until and (a.end_date is null or d <= a.end_date) loop
    insert into periods (agreement_id, due_date, amount_php, status)
    values (p_agreement_id, d, a.amount_php, 'upcoming')
    on conflict (agreement_id, due_date) do nothing;

    if found then
      created := created + 1;
    end if;

    d := rental_next_due_date(d, a.frequency, a.due_day);
  end loop;

  return created;
end
$$;

comment on function generate_periods(uuid, date) is
  'Idempotently create upcoming periods for an agreement up to the given date.';

commit;
