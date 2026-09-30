import type { PeriodRow } from "./database.types";

export type LedgerStatus = "paid" | "partial" | "unpaid" | "waived";

export type LedgerPayment = { period_id: string | null; amount_php: number };

export type LedgerRow = {
  period: Pick<PeriodRow, "id" | "due_date" | "amount_php" | "status">;
  due: number; // centavos owed for the month
  allocated: number; // centavos recorded against this month
  remaining: number; // due - allocated (0 when waived)
  status: LedgerStatus;
  overdue: boolean; // past due + still not fully paid
};

export type Ledger = {
  rows: LedgerRow[];
  outstanding: number; // total still owed for months due up to today
  collected: number; // total payments recorded
  creditLeft: number; // leftover legacy (unassigned) payments
};

/**
 * Each payment is recorded **against a specific month** (`period_id`) and stays
 * there — no spillover to other months. Legacy payments with no `period_id`
 * (from the earlier pool model) are applied oldest-first as a fallback so old
 * data still balances; new payments never go unassigned.
 */
export function buildLedger(
  periods: Pick<PeriodRow, "id" | "due_date" | "amount_php" | "status">[],
  payments: LedgerPayment[],
  todayIso: string,
): Ledger {
  const sorted = [...periods].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );

  const assigned = new Map<string, number>();
  let pool = 0; // legacy unassigned payments
  for (const p of payments) {
    const amt = Math.max(0, p.amount_php || 0);
    if (p.period_id) assigned.set(p.period_id, (assigned.get(p.period_id) ?? 0) + amt);
    else pool += amt;
  }

  const rows: LedgerRow[] = sorted.map((p) => {
    if (p.status === "waived") {
      return {
        period: p,
        due: p.amount_php,
        allocated: 0,
        remaining: 0,
        status: "waived",
        overdue: false,
      };
    }
    let allocated = assigned.get(p.id) ?? 0;
    // Legacy fallback: top up from the unassigned pool, oldest month first.
    if (pool > 0 && allocated < p.amount_php) {
      const add = Math.min(pool, p.amount_php - allocated);
      allocated += add;
      pool -= add;
    }
    const remaining = Math.max(0, p.amount_php - allocated);
    const status: LedgerStatus =
      allocated >= p.amount_php ? "paid" : allocated > 0 ? "partial" : "unpaid";
    const overdue = status !== "paid" && p.due_date < todayIso;
    return { period: p, due: p.amount_php, allocated, remaining, status, overdue };
  });

  const outstanding = rows.reduce(
    (s, r) =>
      s + (r.status !== "waived" && r.period.due_date <= todayIso ? r.remaining : 0),
    0,
  );
  const collected = payments.reduce((s, p) => s + Math.max(0, p.amount_php || 0), 0);

  return { rows, outstanding, collected, creditLeft: pool };
}
