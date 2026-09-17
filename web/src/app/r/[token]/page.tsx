import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatPeso,
  formatDate,
  describeSchedule,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";
import { PeriodStatusBadge } from "@/components/period-status-badge";
import { RenterProofForm } from "@/components/renter-proof-form";
import type {
  AgreementRow,
  AssetRow,
  PeriodRow,
} from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function RenterPortalPage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: agreementData } = await admin
    .from("agreements")
    .select("*, asset:assets(label, type)")
    .eq("renter_access_token", token)
    .maybeSingle();

  if (!agreementData) notFound();
  const agreement = agreementData as AgreementRow & {
    asset: Pick<AssetRow, "label" | "type"> | null;
  };

  const { data: periodsData } = await admin
    .from("periods")
    .select("*")
    .eq("agreement_id", agreement.id)
    .order("due_date", { ascending: true });
  const periods = (periodsData ?? []) as PeriodRow[];

  const unpaid = periods.filter((p) =>
    ["upcoming", "due", "overdue"].includes(p.status),
  );
  const nextDue = unpaid[0];

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <p className="text-sm font-semibold text-emerald-700">Wanatuy24</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">
        Hi {agreement.renter_name.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-slate-500">
        {agreement.asset?.label ?? "Your rental"} ·{" "}
        {describeSchedule(agreement.frequency, agreement.due_day)}
      </p>

      {nextDue && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Next payment</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">
            {formatPeso(nextDue.amount_php)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Due {formatDate(nextDue.due_date)}
          </p>
        </div>
      )}

      {agreement.payment_instructions && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">How to pay</p>
          <p className="mt-1 whitespace-pre-wrap">
            {agreement.payment_instructions}
          </p>
          <p className="mt-2 text-emerald-700">
            Accepts:{" "}
            {agreement.accepted_payment_methods
              .map((m) => PAYMENT_METHOD_LABELS[m])
              .join(", ")}
          </p>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Submit a payment
        </h2>
        {unpaid.length > 0 ? (
          <RenterProofForm
            token={token}
            periods={unpaid.map((p) => ({
              id: p.id,
              due_date: p.due_date,
              amount_php: p.amount_php,
            }))}
            methods={agreement.accepted_payment_methods}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-500">
            You&apos;re all paid up. 🎉
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          History
        </h2>
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {periods.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between px-4 py-2.5 text-sm"
            >
              <span className="text-slate-700">{formatDate(p.due_date)}</span>
              <span className="flex items-center gap-3">
                <span className="text-slate-500">
                  {formatPeso(p.amount_php)}
                </span>
                <PeriodStatusBadge status={p.status} />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
