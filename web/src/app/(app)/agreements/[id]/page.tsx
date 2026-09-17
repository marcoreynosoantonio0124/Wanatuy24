import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import {
  formatPeso,
  formatDate,
  describeSchedule,
  PAYMENT_METHOD_LABELS,
} from "@/lib/format";
import { PeriodStatusBadge } from "@/components/period-status-badge";
import { CopyButton } from "@/components/copy-button";
import { SendReminderNowButton } from "@/components/send-reminder-now";
import type {
  AgreementRow,
  AssetRow,
  ChargeRow,
  PaymentProofRow,
  PeriodRow,
} from "@/lib/database.types";
import {
  addCharge,
  markPeriodPaid,
  reviewProof,
  waivePeriod,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AgreementDetailPage({
  params,
}: PageProps<"/agreements/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: agreementData } = await supabase
    .from("agreements")
    .select("*, asset:assets(label, type)")
    .eq("id", id)
    .single();

  if (!agreementData) notFound();
  const agreement = agreementData as AgreementRow & {
    asset: Pick<AssetRow, "label" | "type"> | null;
  };

  const { data: periodsData } = await supabase
    .from("periods")
    .select("*")
    .eq("agreement_id", id)
    .order("due_date", { ascending: true });
  const periods = (periodsData ?? []) as PeriodRow[];

  const periodIds = periods.map((p) => p.id);
  const { data: proofsData } = periodIds.length
    ? await supabase
        .from("payment_proofs")
        .select("*")
        .in("period_id", periodIds)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: [] };
  const pendingProofs = (proofsData ?? []) as PaymentProofRow[];
  const periodById = new Map(periods.map((p) => [p.id, p]));

  // Signed URLs for any uploaded receipts (private bucket, server-side only).
  const receiptUrls = new Map<string, string>();
  const withFiles = pendingProofs.filter((p) => p.file_path);
  if (withFiles.length) {
    const admin = createAdminClient();
    await Promise.all(
      withFiles.map(async (p) => {
        const { data } = await admin.storage
          .from("payment-proofs")
          .createSignedUrl(p.file_path as string, 60 * 10);
        if (data?.signedUrl) receiptUrls.set(p.id, data.signedUrl);
      }),
    );
  }

  const { data: chargesData } = await supabase
    .from("charges")
    .select("*")
    .eq("agreement_id", id)
    .order("created_at", { ascending: false });
  const charges = (chargesData ?? []) as ChargeRow[];

  const origin = (await headers()).get("origin") ?? "";
  const renterLink = `${origin}/r/${agreement.renter_access_token}`;

  const collected = periods
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_php, 0);
  const outstanding = periods
    .filter((p) => ["due", "overdue"].includes(p.status))
    .reduce((s, p) => s + p.amount_php, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{agreement.renter_name}</h1>
            <p className="mt-1 text-slate-500">
              {agreement.asset?.label ?? "Unit"} ·{" "}
              {describeSchedule(agreement.frequency, agreement.due_day)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {formatPeso(agreement.amount_php)} · starts{" "}
              {formatDate(agreement.start_date)}
              {agreement.end_date
                ? ` · ends ${formatDate(agreement.end_date)}`
                : " · open-ended"}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
            {agreement.status}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <div className="grow text-sm">
            <p className="text-slate-500">Renter link</p>
            <p className="break-all font-mono text-xs text-slate-700">
              {renterLink}
            </p>
          </div>
          <CopyButton value={renterLink} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MiniStat label="Collected" value={formatPeso(collected)} tone="ok" />
          <MiniStat
            label="Outstanding"
            value={formatPeso(outstanding)}
            tone={outstanding ? "warn" : "ok"}
          />
        </div>
      </div>

      {/* Pending proofs */}
      {pendingProofs.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment proofs to review ({pendingProofs.length})
          </h2>
          <ul className="space-y-3">
            {pendingProofs.map((proof) => {
              const period = periodById.get(proof.period_id);
              return (
                <li
                  key={proof.id}
                  className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {formatPeso(proof.amount_php)} ·{" "}
                        {PAYMENT_METHOD_LABELS[proof.method]}
                      </p>
                      <p className="text-sm text-slate-500">
                        Paid {formatDate(proof.paid_on)}
                        {period ? ` · for ${formatDate(period.due_date)}` : ""}
                        {proof.reference_no ? ` · ref ${proof.reference_no}` : ""}
                      </p>
                      {proof.note && (
                        <p className="mt-1 text-sm text-slate-600">
                          “{proof.note}”
                        </p>
                      )}
                      {receiptUrls.has(proof.id) && (
                        <a
                          href={receiptUrls.get(proof.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-sm font-medium text-blue-700 underline"
                        >
                          View receipt ↗
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <form action={reviewProof}>
                        <input type="hidden" name="proof_id" value={proof.id} />
                        <input type="hidden" name="period_id" value={proof.period_id} />
                        <input type="hidden" name="agreement_id" value={id} />
                        <input type="hidden" name="decision" value="accepted" />
                        <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                          Accept
                        </button>
                      </form>
                      <form action={reviewProof}>
                        <input type="hidden" name="proof_id" value={proof.id} />
                        <input type="hidden" name="period_id" value={proof.period_id} />
                        <input type="hidden" name="agreement_id" value={id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-white">
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Periods */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Due dates ({periods.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-100">
            {periods.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <PeriodStatusBadge status={p.status} />
                  <span className="text-slate-900">{formatDate(p.due_date)}</span>
                  <span className="text-sm text-slate-500">
                    {formatPeso(p.amount_php)}
                  </span>
                </div>
                {["upcoming", "due", "overdue", "proof_submitted"].includes(
                  p.status,
                ) && (
                  <div className="flex flex-wrap gap-2">
                    {["upcoming", "due", "overdue"].includes(p.status) && (
                      <SendReminderNowButton
                        periodId={p.id}
                        agreementId={id}
                      />
                    )}
                    <form action={markPeriodPaid}>
                      <input type="hidden" name="period_id" value={p.id} />
                      <input type="hidden" name="agreement_id" value={id} />
                      <button className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                        Mark paid
                      </button>
                    </form>
                    <form action={waivePeriod}>
                      <input type="hidden" name="period_id" value={p.id} />
                      <input type="hidden" name="agreement_id" value={id} />
                      <button className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50">
                        Waive
                      </button>
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Charges */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Extra charges
        </h2>
        <form
          action={addCharge}
          className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3"
        >
          <input type="hidden" name="agreement_id" value={id} />
          <input
            name="label"
            required
            placeholder="Water bill"
            className="grow rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="₱ amount"
            className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">
            Add
          </button>
        </form>
        {charges.length > 0 && (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {charges.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-2.5 text-sm"
              >
                <span className="text-slate-700">{c.label}</span>
                <span className="font-medium text-slate-900">
                  {formatPeso(c.amount_php)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn";
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p
        className={`text-lg font-semibold ${
          tone === "warn" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
