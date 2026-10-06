import { buildLedger } from "./ledger";
import { reminderKindLabel } from "./sms";
import type { PeriodRow } from "./database.types";
import type {
  ForecastMonth,
  ForecastStatus,
} from "@/components/year-forecast";

type SmsRow = {
  period_id: string | null;
  sent_at: string | null;
  template_key: string | null;
  body: string | null;
};

/**
 * Turns a renter's periods + payments + reminder texts into the shape the
 * renter dashboard renders: a month-by-month forecast, the balance, the
 * amount owed right now, and the months they can still pay toward.
 */
export function buildRenterView(opts: {
  periods: PeriodRow[];
  payments: { period_id: string | null; amount_php: number }[];
  sms: SmsRow[];
  today: string;
}) {
  const ledger = buildLedger(opts.periods, opts.payments, opts.today);

  const remindersByPeriod = new Map<
    string,
    { sentAt: string; label: string; body: string }[]
  >();
  for (const n of opts.sms) {
    if (!n.period_id || !n.sent_at) continue;
    const list = remindersByPeriod.get(n.period_id) ?? [];
    list.push({
      sentAt: n.sent_at,
      label: reminderKindLabel(n.template_key ?? ""),
      body: n.body ?? "",
    });
    remindersByPeriod.set(n.period_id, list);
  }

  const nowRow = ledger.rows.find(
    (r) =>
      r.status !== "waived" &&
      r.remaining > 0 &&
      r.period.due_date <= opts.today,
  );

  const months: ForecastMonth[] = ledger.rows.map((r) => {
    let status: ForecastStatus;
    if (r.status === "waived") status = "waived";
    else if (r.status === "paid") status = "paid";
    else if (r.status === "partial") status = "partial";
    else if (r.overdue) status = "overdue";
    else if (r.period.due_date <= opts.today) status = "due";
    else status = "upcoming";
    return {
      periodId: r.period.id,
      dueDate: r.period.due_date,
      due: r.due,
      paid: r.allocated,
      remaining: r.remaining,
      status,
      isNow: nowRow?.period.id === r.period.id,
      reminders: remindersByPeriod.get(r.period.id) ?? [],
    };
  });

  const unpaidForProof = ledger.rows
    .filter((r) => r.status !== "waived" && r.remaining > 0)
    .map((r) => ({
      id: r.period.id,
      due_date: r.period.due_date,
      amount_php: r.remaining,
    }));

  return {
    months,
    outstanding: ledger.outstanding,
    unpaidForProof,
    dueNow: nowRow
      ? {
          remaining: nowRow.remaining,
          dueDate: nowRow.period.due_date,
          paid: nowRow.allocated,
          due: nowRow.due,
        }
      : null,
  };
}
