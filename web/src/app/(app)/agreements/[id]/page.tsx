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
import { buildLedger, type LedgerStatus } from "@/lib/ledger";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { ProofCell } from "@/components/proof-cell";
import { SendReminderNowButton } from "@/components/send-reminder-now";
import type {
  AgreementRow,
  AssetRow,
  ChargeRow,
  PaymentProofRow,
  PaymentRow,
  PeriodRow,
} from "@/lib/database.types";
import { addCharge, recordPayment, deletePayment, waivePeriod } from "./actions";

export const dynamic = "force-dynamic";

const PROOF_BUCKET = "payment-proofs";

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

  const [{ data: periodsData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("periods")
      .select("*")
      .eq("agreement_id", id)
      .order("due_date", { ascending: true }),
    supabase
      .from("payments")
      .select("*")
      .eq("agreement_id", id)
      .order("received_on", { ascending: false }),
  ]);
  const periods = (periodsData ?? []) as PeriodRow[];
  const payments = (paymentsData ?? []) as PaymentRow[];
  const totalPaid = payments.reduce((s, p) => s + p.amount_php, 0);

  // Latest proof per period, plus signed view/download links for its file.
  const periodIds = periods.map((p) => p.id);
  const { data: proofsData } = periodIds.length
    ? await supabase
        .from("payment_proofs")
        .select("*")
        .in("period_id", periodIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const proofs = (proofsData ?? []) as PaymentProofRow[];
  const latestProofByPeriod = new Map<string, PaymentProofRow>();
  for (const pr of proofs) {
    if (!latestProofByPeriod.has(pr.period_id)) latestProofByPeriod.set(pr.period_id, pr);
  }

  const admin = createAdminClient();
  const proofLinks = new Map<string, { view: string | null; download: string | null }>();
  await Promise.all(
    [...latestProofByPeriod.values()].map(async (pr) => {
      if (!pr.file_path) return;
      const [{ data: v }, { data: d }] = await Promise.all([
        admin.storage.from(PROOF_BUCKET).createSignedUrl(pr.file_path, 60 * 60),
        admin.storage
          .from(PROOF_BUCKET)
          .createSignedUrl(pr.file_path, 60 * 60, { download: true }),
      ]);
      proofLinks.set(pr.id, {
        view: v?.signedUrl ?? null,
        download: d?.signedUrl ?? null,
      });
    }),
  );

  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const ledger = buildLedger(periods, totalPaid, today);

  const origin = (await headers()).get("origin") ?? "";
  const renterLink = `${origin}/r/${agreement.renter_access_token}`;

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
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600">
              {agreement.status}
            </span>
            <a
              href={`/agreements/${id}/edit`}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
            >
              ✏️ Edit
            </a>
          </div>
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
          <MiniStat
            label="Total still owed"
            value={formatPeso(ledger.outstanding)}
            tone={ledger.outstanding ? "warn" : "ok"}
          />
          <MiniStat label="Collected" value={formatPeso(ledger.collected)} tone="ok" />
        </div>
        {ledger.creditLeft > 0 && (
          <p className="mt-2 text-sm text-emerald-700">
            Advance credit on file: {formatPeso(ledger.creditLeft)} (applied to
            future months automatically).
          </p>
        )}
      </div>

      {/* Payment ledger */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Payment ledger
        </h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Proof from tenant</th>
                <th className="px-4 py-3 font-medium">Record received</th>
                <th className="px-4 py-3 font-medium">Remaining</th>
                <th className="px-4 py-3 font-medium">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ledger.rows.map((row) => {
                const proof = latestProofByPeriod.get(row.period.id);
                const links = proof ? proofLinks.get(proof.id) : undefined;
                const open = row.status !== "paid" && row.status !== "waived";
                return (
                  <tr key={row.period.id} className="align-top">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatDate(row.period.due_date)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {formatPeso(row.due)}
                    </td>
                    <td className="px-4 py-3">
                      {proof ? (
                        <ProofCell
                          proofId={proof.id}
                          agreementId={id}
                          viewUrl={links?.view ?? null}
                          downloadUrl={links?.download ?? null}
                          seen={proof.seen_at != null}
                          caption={`claims ${formatPeso(proof.amount_php)} · ${PAYMENT_METHOD_LABELS[proof.method]}`}
                        />
                      ) : (
                        <span className="text-xs text-slate-400">— none yet —</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {open ? (
                        <div className="flex flex-col gap-1.5">
                          <form
                            action={recordPayment}
                            className="flex items-center gap-1"
                          >
                            <input type="hidden" name="agreement_id" value={id} />
                            <input
                              name="amount"
                              inputMode="decimal"
                              placeholder="₱ amount"
                              className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                            <SubmitButton
                              pendingText="…"
                              className="rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 active:scale-95"
                            >
                              Save
                            </SubmitButton>
                          </form>
                          <form action={recordPayment}>
                            <input type="hidden" name="agreement_id" value={id} />
                            <input
                              type="hidden"
                              name="amount"
                              value={(row.remaining / 100).toString()}
                            />
                            <SubmitButton
                              pendingText="…"
                              className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 active:scale-95"
                            >
                              Received in full
                            </SubmitButton>
                          </form>
                        </div>
                      ) : row.status === "paid" ? (
                        <span className="text-xs text-emerald-600">
                          {formatPeso(row.allocated)} received
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums">
                      <span
                        className={row.remaining ? "text-amber-700" : "text-emerald-600"}
                      >
                        {formatPeso(row.remaining)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <RemarkPill status={row.status} overdue={row.overdue} />
                      {open && (
                        <div className="mt-1.5">
                          <SendReminderNowButton periodId={row.period.id} agreementId={id} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {ledger.rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No due dates yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Enter what you actually received — partial payments are fine. Amounts
          settle the oldest unpaid month first, and the remaining balance updates
          automatically.
        </p>
      </section>

      {/* Payment history */}
      {payments.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Payment history
          </h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-900">
                    {formatPeso(p.amount_php)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Received {formatDate(p.received_on)}
                  </p>
                </div>
                <form action={deletePayment}>
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="agreement_id" value={id} />
                  <SubmitButton
                    pendingText="Removing…"
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 active:scale-95"
                  >
                    Delete
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Waive a month */}
      <WaiveSection id={id} ledgerRows={ledger.rows} />

      {/* Extra charges */}
      <ChargesSection id={id} agreementId={id} />
    </div>
  );
}

function RemarkPill({
  status,
  overdue,
}: {
  status: LedgerStatus;
  overdue: boolean;
}) {
  if (status === "paid")
    return <Pill tone="ok">Full paid</Pill>;
  if (status === "waived") return <Pill tone="slate">Waived</Pill>;
  if (status === "partial") return <Pill tone="warn">Partial</Pill>;
  if (overdue) return <Pill tone="bad">Overdue</Pill>;
  return <Pill tone="slate">Not paid</Pill>;
}

function Pill({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "slate";
  children: React.ReactNode;
}) {
  const styles =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800"
        : tone === "bad"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-500";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

async function WaiveSection({
  id,
  ledgerRows,
}: {
  id: string;
  ledgerRows: { period: { id: string; due_date: string }; status: LedgerStatus }[];
}) {
  const waivable = ledgerRows.filter(
    (r) => r.status !== "paid" && r.status !== "waived",
  );
  if (waivable.length === 0) return null;
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-600">
        Waive a month (skip charging it)
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {waivable.map((r) => (
          <form key={r.period.id} action={waivePeriod}>
            <input type="hidden" name="period_id" value={r.period.id} />
            <input type="hidden" name="agreement_id" value={id} />
            <SubmitButton
              pendingText="…"
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-50 active:scale-95"
            >
              Waive {formatDate(r.period.due_date)}
            </SubmitButton>
          </form>
        ))}
      </div>
    </details>
  );
}

async function ChargesSection({
  id,
  agreementId,
}: {
  id: string;
  agreementId: string;
}) {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("charges")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("created_at", { ascending: false });
  const charges = (data ?? []) as ChargeRow[];

  return (
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
        <SubmitButton
          pendingText="Adding…"
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 active:scale-95"
        >
          Add
        </SubmitButton>
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
