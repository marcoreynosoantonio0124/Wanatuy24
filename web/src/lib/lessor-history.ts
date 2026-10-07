import type { SupabaseClient } from "@supabase/supabase-js";
import { buildLedger } from "@/lib/ledger";
import type { PeriodRow } from "@/lib/database.types";

/** One finished (ended or cancelled) tenancy, with its income/loss accounting. */
export type HistoryRow = {
  id: string;
  unitLabel: string;
  tenant: string;
  transactionNo: string | null;
  status: "ended" | "cancelled";
  startDate: string | null;
  endDate: string | null;
  monthly: number;
  income: number; // total rent collected over the tenancy (centavos)
  loss: number; // total that was due but never collected (centavos)
};

export type LessorHistory = {
  rows: HistoryRow[];
  totalIncome: number;
  totalLoss: number;
};

type AgreementLite = {
  id: string;
  renter_name: string;
  amount_php: number;
  transaction_no: string | null;
  status: "ended" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  asset: { label: string } | null;
};

/**
 * The lessor's History: every tenancy that has ended or been cancelled, with
 * how much rent was collected (income) and how much was left unpaid (loss),
 * plus the tenant's record. Pass the RLS-scoped client for the signed-in
 * lessor, or the admin client with `lessorId` for monitoring.
 */
export async function loadLessorHistory(
  client: SupabaseClient,
  opts: { lessorId?: string } = {},
): Promise<LessorHistory> {
  let agQuery = client
    .from("agreements")
    .select(
      "id, renter_name, amount_php, transaction_no, status, start_date, end_date, asset:assets(label)",
    )
    .in("status", ["ended", "cancelled"]);
  if (opts.lessorId) agQuery = agQuery.eq("lessor_id", opts.lessorId);

  const { data: agData } = await agQuery.order("end_date", {
    ascending: false,
    nullsFirst: false,
  });
  const ags = (agData ?? []) as unknown as AgreementLite[];
  if (ags.length === 0) return { rows: [], totalIncome: 0, totalLoss: 0 };

  const agIds = ags.map((a) => a.id);
  const [periodsRes, paymentsRes] = await Promise.all([
    client
      .from("periods")
      .select("id, agreement_id, due_date, amount_php, status")
      .in("agreement_id", agIds),
    client
      .from("payments")
      .select("agreement_id, period_id, amount_php")
      .in("agreement_id", agIds),
  ]);

  const periodsByAg = new Map<string, (PeriodRow & { agreement_id: string })[]>();
  for (const p of (periodsRes.data ?? []) as (PeriodRow & {
    agreement_id: string;
  })[]) {
    const arr = periodsByAg.get(p.agreement_id) ?? [];
    arr.push(p);
    periodsByAg.set(p.agreement_id, arr);
  }
  const paymentsByAg = new Map<
    string,
    { period_id: string | null; amount_php: number }[]
  >();
  for (const p of (paymentsRes.data ?? []) as {
    agreement_id: string;
    period_id: string | null;
    amount_php: number;
  }[]) {
    const arr = paymentsByAg.get(p.agreement_id) ?? [];
    arr.push({ period_id: p.period_id, amount_php: p.amount_php });
    paymentsByAg.set(p.agreement_id, arr);
  }

  // Everything is in the past for a finished tenancy, so count the whole term.
  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows: HistoryRow[] = ags.map((a) => {
    const ledger = buildLedger(
      periodsByAg.get(a.id) ?? [],
      paymentsByAg.get(a.id) ?? [],
      today,
    );
    return {
      id: a.id,
      unitLabel: a.asset?.label ?? "Unit",
      tenant: a.renter_name,
      transactionNo: a.transaction_no ?? null,
      status: a.status,
      startDate: a.start_date,
      endDate: a.end_date,
      monthly: a.amount_php,
      income: ledger.collected,
      loss: ledger.outstanding,
    };
  });

  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const totalLoss = rows.reduce((s, r) => s + r.loss, 0);
  return { rows, totalIncome, totalLoss };
}
