import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatPeso,
  formatDate,
  describeSchedule,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";
import { PeriodStatusBadge } from "@/components/period-status-badge";
import { RenterProofForm } from "@/components/renter-proof-form";
import { DuskScene } from "@/components/dusk-scene";
import type { AgreementRow, PaymentMethod, PeriodRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Agreement = Pick<
  AgreementRow,
  | "id"
  | "renter_name"
  | "amount_php"
  | "frequency"
  | "due_day"
  | "status"
  | "payment_instructions"
  | "accepted_payment_methods"
  | "renter_access_token"
  | "asset_id"
>;

export default async function MyRentalsPage() {
  const { user, supabase } = await requireUser();

  const { data: agData } = await supabase
    .from("agreements")
    .select(
      "id, renter_name, amount_php, frequency, due_day, status, payment_instructions, accepted_payment_methods, renter_access_token, asset_id",
    )
    .eq("renter_user_id", user.id)
    .order("created_at", { ascending: false });
  const agreements = (agData ?? []) as unknown as Agreement[];

  // Renters can't read the assets table via RLS, so fetch labels server-side
  // (already scoped to this renter's own agreements above).
  const labelById = new Map<string, string>();
  const assetIds = [...new Set(agreements.map((a) => a.asset_id))];
  if (assetIds.length) {
    const admin = createAdminClient();
    const { data: assetRows } = await admin
      .from("assets")
      .select("id, label")
      .in("id", assetIds);
    for (const row of (assetRows ?? []) as { id: string; label: string }[]) {
      labelById.set(row.id, row.label);
    }
  }

  const ids = agreements.map((a) => a.id);
  const { data: perData } = ids.length
    ? await supabase
        .from("periods")
        .select("*")
        .in("agreement_id", ids)
        .order("due_date", { ascending: true })
    : { data: [] };
  const periods = (perData ?? []) as PeriodRow[];
  const byAgreement = new Map<string, PeriodRow[]>();
  for (const p of periods) {
    const arr = byAgreement.get(p.agreement_id) ?? [];
    arr.push(p);
    byAgreement.set(p.agreement_id, arr);
  }

  return (
    <div className="space-y-8">
      {/* banner */}
      <section className="relative min-h-[160px] overflow-hidden rounded-2xl ring-1 ring-slate-900/10">
        <DuskScene
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/25" />
        <div className="relative p-6 sm:p-8">
          <p className="text-sm font-medium text-emerald-300">My rentals</p>
          <h1 className="mt-1 text-2xl font-bold text-white drop-shadow sm:text-3xl">
            Your payment records
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/75">
            Read-only view — see every due date, send your proof of payment, and
            keep a record of what you&apos;ve paid.
          </p>
        </div>
      </section>

      {agreements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Wala pang naka-link na rental.</p>
          <p className="mt-1 text-sm text-slate-400">
            Ask your landlord to add your email ({user.email}) to your agreement,
            then sign in again — it will show up here automatically.
          </p>
        </div>
      ) : (
        agreements.map((a) => {
          const ps = byAgreement.get(a.id) ?? [];
          const unpaid = ps.filter((p) =>
            ["upcoming", "due", "overdue"].includes(p.status),
          );
          const paid = ps
            .filter((p) => p.status === "paid")
            .reduce((s, p) => s + p.amount_php, 0);
          return (
            <section
              key={a.id}
              className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {labelById.get(a.asset_id) ?? "Rental"}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {formatPeso(a.amount_php)} ·{" "}
                    {describeSchedule(a.frequency, a.due_day)}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Total paid: {formatPeso(paid)}
                </span>
              </div>

              {a.payment_instructions && (
                <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
                  <p className="font-medium">How to pay</p>
                  <p className="mt-1 whitespace-pre-wrap">
                    {a.payment_instructions}
                  </p>
                  <p className="mt-2 text-emerald-700">
                    Accepts:{" "}
                    {(a.accepted_payment_methods as PaymentMethod[])
                      .map((m) => PAYMENT_METHOD_LABELS[m])
                      .join(", ")}
                  </p>
                </div>
              )}

              {/* payment records */}
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Payment records
                </h3>
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {ps.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <span className="text-slate-700">
                        {formatDate(p.due_date)}
                        {p.paid_at && (
                          <span className="ml-2 text-xs text-emerald-600">
                            paid {formatDate(p.paid_at.slice(0, 10))}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-medium text-slate-900">
                          {formatPeso(p.amount_php)}
                        </span>
                        <PeriodStatusBadge status={p.status} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* submit proof */}
              {unpaid.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Send proof of payment
                  </h3>
                  <RenterProofForm
                    token={a.renter_access_token}
                    periods={unpaid.map((p) => ({
                      id: p.id,
                      due_date: p.due_date,
                      amount_php: p.amount_php,
                    }))}
                    methods={a.accepted_payment_methods as PaymentMethod[]}
                  />
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
