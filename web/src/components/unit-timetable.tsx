import Link from "next/link";
import { formatPeso, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { ReminderBadge } from "@/components/reminder-badge";
import { MonthPaymentButton } from "@/components/month-payment-button";
import { MonthLessorReply } from "@/components/month-lessor-reply";
import { EndContractButton } from "@/components/end-contract-button";
import { DocViewButton } from "@/components/doc-viewer";
import type { ForecastMonth, ForecastStatus } from "@/components/year-forecast";
import type { PaymentMethod } from "@/lib/database.types";
import type { MonthMessage, UnitDocuments } from "@/lib/renter-rentals";

function fmtMsgDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}

/** A tenant-submitted payment proof, shown on the matching month. */
export type MonthProof = {
  amountCentavos: number;
  method: PaymentMethod | string;
  paidOn: string;
  viewUrl: string | null;
};

const PILL: Record<ForecastStatus, { label: string; cls: string }> = {
  paid: { label: "Full paid", cls: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
  partial: { label: "Partial", cls: "text-amber-700 bg-amber-50 ring-amber-200" },
  due: { label: "Due", cls: "text-amber-700 bg-amber-50 ring-amber-200" },
  overdue: { label: "Overdue", cls: "text-red-700 bg-red-50 ring-red-200" },
  upcoming: { label: "Upcoming", cls: "text-slate-500 bg-slate-50 ring-slate-200" },
  waived: { label: "Waived", cls: "text-slate-500 bg-slate-50 ring-slate-200" },
};

function monthYear(iso: string): string {
  return new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

/**
 * A single unit's whole contract year as a clean, mobile-friendly card list:
 * every month with its status, amounts, and the glowing 📩 reminder badge
 * (tap to see every text sent), plus a summary of the year. Read-only — the
 * "Record payments & manage" link goes to the full operational page.
 */
export function UnitTimetable({
  agreementId,
  unitLabel,
  renterName,
  scheduleLabel,
  months,
  collected,
  outstanding,
  remindersSent,
  backHref = "/dashboard",
  showManage = true,
  interactive = false,
  demo = false,
  proofByPeriod = {},
  messagesByPeriod = {},
  transactionNo = null,
  isActive = false,
  documents = null,
}: {
  agreementId: string;
  unitLabel: string;
  renterName: string;
  scheduleLabel: string;
  months: ForecastMonth[];
  collected: number;
  outstanding: number;
  remindersSent: number;
  backHref?: string;
  showManage?: boolean;
  /** When true, each unpaid month gets a "Payment received" action. */
  interactive?: boolean;
  /** Sample preview: show the actions but don't actually submit. */
  demo?: boolean;
  /** Tenant proofs keyed by period id, shown on the matching month. */
  proofByPeriod?: Record<string, MonthProof>;
  /** Tenant messages keyed by period id, shown on the matching month. */
  messagesByPeriod?: Record<string, MonthMessage[]>;
  /** The unit's transaction number (shown in the header). */
  transactionNo?: string | null;
  /** Whether the agreement is active — transparency docs show only when it is. */
  isActive?: boolean;
  /** Signed links to the contract + both parties' valid IDs (shown while active). */
  documents?: UnitDocuments | null;
}) {
  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 active:scale-95"
      >
        ← Your Properties
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white shadow-lg shadow-emerald-900/20">
        <h1 className="text-2xl font-bold">{unitLabel}</h1>
        <p className="mt-1 text-sm text-white/85">
          {renterName} · {scheduleLabel}
        </p>
        {transactionNo && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 font-mono text-xs font-semibold text-white ring-1 ring-white/25">
              🔖 {transactionNo}
            </span>
            {isActive && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Active
              </span>
            )}
          </div>
        )}
      </div>

      <section>
        <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
          Payment ledger · tap a 📩 to see the record
        </h2>
        <div className="space-y-3">
          {months.map((m) => {
            const pill = PILL[m.status];
            return (
              <div
                key={m.periodId}
                className="rounded-2xl border border-white/15 p-4"
                style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900">
                      {formatDate(m.dueDate)}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Due {formatPeso(m.due)}
                      {m.paid > 0 && (
                        <>
                          {" · "}
                          <span className="font-medium text-emerald-700">
                            Paid {formatPeso(m.paid)}
                          </span>
                        </>
                      )}
                      {m.remaining > 0 && m.status !== "upcoming" && (
                        <>
                          {" · "}
                          <span className="font-semibold text-amber-700">
                            {formatPeso(m.remaining)} left
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${pill.cls}`}
                  >
                    {pill.label}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {m.reminders.length > 0 ? (
                    <ReminderBadge
                      records={m.reminders}
                      monthLabel={monthYear(m.dueDate)}
                      audience="lessor"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">
                      {m.status === "upcoming"
                        ? "Not texted yet."
                        : "No reminder sent yet."}
                    </span>
                  )}
                  {(interactive || demo) &&
                    m.status !== "paid" &&
                    m.status !== "waived" && (
                      <MonthPaymentButton
                        agreementId={agreementId}
                        periodId={m.periodId}
                        defaultAmountCentavos={m.remaining || m.due}
                        demo={demo}
                      />
                    )}
                  {(interactive || demo) && (
                    <MonthLessorReply
                      agreementId={agreementId}
                      periodId={m.periodId}
                      hasThread={
                        (messagesByPeriod[m.periodId]?.length ?? 0) > 0
                      }
                      demo={demo}
                    />
                  )}
                </div>

                {proofByPeriod[m.periodId] && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-sm">
                    <span className="font-semibold text-sky-200">
                      📎 Proof submitted:
                    </span>
                    <span className="text-slate-200">
                      {formatPeso(proofByPeriod[m.periodId].amountCentavos)} ·{" "}
                      {PAYMENT_METHOD_LABELS[
                        proofByPeriod[m.periodId].method as PaymentMethod
                      ] ?? proofByPeriod[m.periodId].method}{" "}
                      · paid {formatDate(proofByPeriod[m.periodId].paidOn)}
                    </span>
                    {proofByPeriod[m.periodId].viewUrl && (
                      <DocViewButton
                        href={proofByPeriod[m.periodId].viewUrl ?? "#"}
                        label="Payment proof"
                        className="ml-auto rounded-md border border-sky-400/40 px-2.5 py-1 text-xs font-semibold text-sky-200 transition hover:bg-sky-500/20 active:scale-95"
                      >
                        View proof
                      </DocViewButton>
                    )}
                  </div>
                )}

                {(messagesByPeriod[m.periodId]?.length ?? 0) > 0 && (
                  <div className="mt-3 space-y-1.5 rounded-xl border border-pink-400/30 bg-pink-500/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-pink-200">
                      💬 Message from {renterName.split(" ")[0] || "renter"}
                    </p>
                    {messagesByPeriod[m.periodId].map((msg, i) => (
                      <div
                        key={i}
                        className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                          msg.sender === "renter"
                            ? "bg-white/10 text-slate-100"
                            : "ml-auto bg-emerald-500/15 text-emerald-100"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {msg.sender === "renter"
                            ? renterName.split(" ")[0] || "Renter"
                            : "You"}{" "}
                          · {fmtMsgDate(msg.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          This unit · summary
        </h2>
        <div
          className="grid grid-cols-3 overflow-hidden rounded-2xl border border-white/15"
          style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
        >
          <SummaryCell label="Collected" value={formatPeso(collected)} tone="emerald" />
          <SummaryCell
            label="Outstanding"
            value={formatPeso(outstanding)}
            tone={outstanding ? "red" : "slate"}
          />
          <SummaryCell label="Reminders sent" value={String(remindersSent)} last />
        </div>
      </section>

      {isActive && documents &&
        (documents.contractUrl || documents.lessorIdUrl || documents.renterIdUrl) && (
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              Documents · nasa loob ng unit
            </h2>
            <div
              className="overflow-hidden rounded-2xl border border-white/15"
              style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
            >
              {documents.contractUrl && (
                <UnitDocRow label="📄 Signed contract" href={documents.contractUrl} />
              )}
              {documents.lessorIdUrl && (
                <UnitDocRow label="🪪 Your valid ID" href={documents.lessorIdUrl} />
              )}
              {documents.renterIdUrl && (
                <UnitDocRow
                  label={`🪪 ${renterName.split(" ")[0] || "Renter"}'s valid ID`}
                  href={documents.renterIdUrl}
                />
              )}
            </div>
            <p className="mt-2 px-1 text-xs text-slate-500">
              Nakikita rin ng umuupa ang parehong mga dokumento para sa
              transparency. Lalabas lang habang aktibo ang kasunduan.
            </p>
          </section>
        )}

      {showManage && (
        <Link
          href={`/agreements/${agreementId}`}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
        >
          ⚙️ Record payments &amp; manage this unit →
        </Link>
      )}

      {interactive && !demo && isActive && (
        <EndContractButton agreementId={agreementId} />
      )}
    </div>
  );
}

/** One document row in the unit's Documents card: a label + a "View" button
 *  that opens the file inside the app (overlay), not a new browser tab. */
function UnitDocRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
      </span>
      <DocViewButton href={href} label={label} />
    </div>
  );
}

function SummaryCell({
  label,
  value,
  tone = "slate",
  last = false,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "red" | "slate";
  last?: boolean;
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "red"
        ? "text-red-600"
        : "text-slate-900";
  return (
    <div className={`px-4 py-4 ${last ? "" : "border-r border-slate-100"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
