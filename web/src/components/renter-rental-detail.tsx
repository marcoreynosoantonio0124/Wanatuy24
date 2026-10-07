import Link from "next/link";
import { formatPeso, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { ReminderBadge } from "@/components/reminder-badge";
import { MonthProofButton } from "@/components/month-proof-button";
import { MonthMessageButton } from "@/components/month-message-button";
import { RenterIdUpload } from "@/components/renter-id-upload";
import type { ForecastStatus } from "@/components/year-forecast";
import type { RenterRentalDetailData } from "@/lib/renter-rentals";

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
 * One rental's full record for the renter: the whole-year payment timetable
 * (same horizontal month-card layout as the lessor's unit view), the amount
 * due now, how to pay, send-a-proof, and documents. Sits on the plain dark
 * dashboard theme — no photo background — like the lessor unit view.
 */
export function RenterRentalDetail({
  data,
  backHref = "/my-rentals",
  preview = false,
}: {
  data: RenterRentalDetailData;
  backHref?: string;
  preview?: boolean;
}) {
  const paidMonths = data.months.filter((m) => m.status === "paid").length;
  const collected = data.months.reduce((s, m) => s + m.paid, 0);
  const yearTotal = data.months.reduce((s, m) => s + m.due, 0);

  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 active:scale-95"
      >
        ← Your Rentals
      </Link>

      {/* Apartment header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white shadow-lg shadow-emerald-900/20">
        <h1 className="text-2xl font-bold">{data.unitLabel}</h1>
        <div className="mt-1.5 flex items-start gap-2 text-sm text-white/90">
          <span>📍</span>
          <span>
            {data.address ? data.address : "Your rental"} · {data.scheduleLabel}
          </span>
        </div>
        {data.transactionNo && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 font-mono text-xs font-semibold text-white ring-1 ring-white/25">
              🔖 {data.transactionNo}
            </span>
            {data.isActive && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Active
              </span>
            )}
          </div>
        )}
      </div>

      {/* Amount due */}
      {data.dueNow ? (
        <div className="rounded-2xl bg-gradient-to-br from-amber-600 to-red-600 p-5 text-white shadow-lg shadow-red-600/20">
          <p className="text-sm font-medium text-white/90">
            You still owe this month ({formatDate(data.dueNow.dueDate)})
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">
            {formatPeso(data.dueNow.remaining)}
          </p>
          {data.dueNow.paid > 0 && (
            <p className="mt-1 text-sm text-white/90">
              of {formatPeso(data.dueNow.due)} · {formatPeso(data.dueNow.paid)}{" "}
              already received
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-500 p-5 text-white shadow-lg shadow-emerald-600/20">
          <p className="text-sm font-medium text-white/90">Your rent</p>
          <p className="mt-1 text-3xl font-extrabold">You&apos;re all paid up 🎉</p>
          <p className="mt-1 text-sm text-white/90">Salamat po!</p>
        </div>
      )}

      {/* Whole-year timetable — horizontal month cards, like the lessor view */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-400">
          This year&apos;s rent
        </h2>
        <p className="mb-2.5 mt-0.5 text-xs text-slate-500">
          {paidMonths} of {data.months.length} months fully paid ·{" "}
          {formatPeso(collected)} of {formatPeso(yearTotal)}
        </p>
        <div className="space-y-3">
          {data.months.map((m) => {
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
                  {m.reminders.length > 0 && (
                    <ReminderBadge
                      records={m.reminders}
                      monthLabel={monthYear(m.dueDate)}
                      audience="tenant"
                    />
                  )}
                  {m.status === "paid" && (
                    <span className="text-sm font-semibold text-emerald-300">
                      ✓ Payment received
                    </span>
                  )}
                  {m.status !== "paid" && m.status !== "waived" && (
                    <MonthProofButton
                      token={data.token}
                      periodId={m.periodId}
                      defaultAmountCentavos={m.remaining || m.due}
                      methods={data.methods}
                      demo={preview}
                    />
                  )}
                  <MonthMessageButton
                    token={data.token}
                    periodId={m.periodId}
                    existing={data.messagesByPeriod[m.periodId] ?? []}
                    demo={preview}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Balance */}
      <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">
          Balance up to date
        </span>
        <span className="text-lg font-bold tabular-nums text-amber-700">
          {formatPeso(data.outstanding)}
        </span>
      </div>

      {/* How to pay */}
      {(data.paymentInstructions || data.methods.length > 0) && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
            How to pay
          </h2>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            {data.paymentInstructions && (
              <p className="whitespace-pre-wrap">{data.paymentInstructions}</p>
            )}
            {data.methods.length > 0 && (
              <p className="mt-2 text-emerald-700">
                Accepts:{" "}
                {data.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(", ")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Documents */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          Documents
        </h2>
        <div
          className="overflow-hidden rounded-2xl border border-white/15"
          style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
        >
          {data.contract && (data.contract.view || data.contract.download) && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                📄 Your signed contract
              </span>
              <span className="flex gap-2">
                {data.contract.view && (
                  <a
                    href={data.contract.view}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
                  >
                    View
                  </a>
                )}
                {data.contract.download && (
                  <a
                    href={data.contract.download}
                    className="rounded-md border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 active:scale-95"
                  >
                    ⬇️ Download
                  </a>
                )}
              </span>
            </div>
          )}
          {data.lessorIdUrl && (
            <IdDocRow label="🪪 Landlord's valid ID" href={data.lessorIdUrl} />
          )}
          {data.renterIdUrl && (
            <IdDocRow label="🪪 Your valid ID" href={data.renterIdUrl} />
          )}
          {!preview && <RenterIdUpload token={data.token} hasId={data.hasRenterId} />}
        </div>
        {data.isActive && (
          <p className="mt-2 px-1 text-xs text-slate-500">
            Para sa transparency — makikita ng inyong landlord ang parehong mga
            dokumento. Lalabas lang habang aktibo ang kasunduan.
          </p>
        )}
      </section>
    </div>
  );
}

/** One ID document row in the Documents card: a label + a "View" link. */
function IdDocRow({ label, href }: { label: string; href: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 last:border-b-0">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
        {label}
      </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 active:scale-95"
      >
        View
      </a>
    </div>
  );
}
