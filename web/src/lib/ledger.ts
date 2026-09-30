import type { PeriodRow } from "./database.types";

export type LedgerStatus = "paid" | "partial" | "unpaid" | "waived";

export type LedgerRow = {
  period: Pick<PeriodRow, "id" | "due_date" | "amount_php" | "status">;
  due: number; // centavos owed for the month
  allocated: number; // centavos applied to it
  remaining: number; // due - allocated (0 when waived)
  status: LedgerStatus;
  overdue: boolean; // past due + still not fully paid
};

export type Ledger = {
  rows: LedgerRow[];
  outstanding: number; // total still owed for months due up to today
  collected: number; // total payments recorded
  creditLeft: number; // overpayment beyond every generated month
};

/**
 * Applies the recorded payments to the months **oldest first**, so a lump sum
 * clears back rent before the current month (see the "#101" case). Each month
 * becomes paid / partial / unpaid based on how much of it the pool covered.
 */
export function buildLedger(
  periods: Pick<PeriodRow, "id" | "due_date" | "amount_php" | "status">[],
  totalPaidCentavos: number,
  todayIso: string,
): Ledger {
  const sorted = [...periods].sort((a, b) =>
    a.due_date.localeCompare(b.due_date),
  );
  let pool = Math.max(0, totalPaidCentavos);

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
    const allocated = Math.min(pool, p.amount_php);
    pool -= allocated;
    const remaining = p.amount_php - allocated;
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

  return {
    rows,
    outstanding,
    collected: Math.max(0, totalPaidCentavos),
    creditLeft: pool,
  };
}
