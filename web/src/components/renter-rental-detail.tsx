import Link from "next/link";
import { formatPeso, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/format";
import { ReminderBadge } from "@/components/reminder-badge";
import { RenterProofForm } from "@/components/renter-proof-form";
import { RenterIdUpload } from "@/components/renter-id-upload";
import type { ForecastStatus } from "@/components/year-forecast";
import type { RenterRentalDetailData } from "@/lib/renter-rentals";

const PILL: Record<ForecastStatus, { label: string; cls: string }> = {
  paid: { label: "Full paid", cls: "text-emerald-300 bg-emerald-500/15 ring-emerald-400/30" },
  partial: { label: "Partial", cls: "text-amber-300 bg-amber-500/15 ring-amber-400/30" },
  due: { label: "Due", cls: "text-amber-300 bg-amber-500/15 ring-amber-400/30" },
  overdue: { label: "Overdue", cls: "text-red-300 bg-red-500/15 ring-red-400/30" },
  upcoming: { label: "Upcoming", cls: "text-slate-300 bg-white/5 ring-white/15" },
  waived: { label: "Waived", cls: "text-slate-300 bg-white/5 ring-white/15" },
};

function monthYear(iso: string): string {
  return new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  });
}

const FILL = { backgroundColor: "rgba(15,23,42,0.5)" } as const;

/**
 * One rental's full record for the renter: the whole-year payment timetable
 * (same horizontal month-card layout as the lessor's unit view), the amount
 * due now, how to pay, send-a-proof, and documents.
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
    <div className="mx-auto w-full max-w-xl space-y-5 pb-10">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-300 transition hover:text-emerald-200 active:scale-95 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]"
      >
        ← Your Rentals
      </Link>

      {/* Apartment header */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white shadow-lg shadow-emerald-900/30">
        <h1 className="text-2xl font-bold">{data.unitLabel}</h1>
        <div className="mt-1.5 flex items-start gap-2 text-sm text-white/90">
          <span>📍</span>
          <span>
            {data.address ? data.address : "Your rental"} · {data.scheduleLabel}
          </span>
        </div>
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

      {/* Send a payment */}
      {!preview && data.unpaidForProof.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            Send a payment
          </h2>
          <RenterProofForm
            token={data.token}
            periods={data.unpaidForProof}
            methods={data.methods}
          />
        </section>
      )}

      {/* Whole-year timetable — horizontal month cards, like the lessor view */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          This year&apos;s rent
        </h2>
        <p className="mb-2.5 mt-0.5 text-xs text-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          {paidMonths} of {data.months.length} months fully paid ·{" "}
          {formatPeso(collected)} of {formatPeso(yearTotal)}
        </p>
        <div className="space-y-3">
          {data.months.map((m) => {
            const pill = PILL[m.status];
            return (
              <div
                key={m.periodId}
                className="rounded-2xl border border-white/12 p-4 backdrop-blur-md"
                style={FILL}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-100">
                      {formatDate(m.dueDate)}
                    </p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      Due {formatPeso(m.due)}
                      {m.paid > 0 && (
                        <>
                          {" · "}
                          <span className="font-medium text-emerald-300">
                            Paid {formatPeso(m.paid)}
                          </span>
                        </>
                      )}
                      {m.remaining > 0 && m.status !== "upcoming" && (
                        <>
                          {" · "}
                          <span className="font-semibold text-amber-300">
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

                {m.reminders.length > 0 && (
                  <div className="mt-3">
                    <ReminderBadge
                      records={m.reminders}
                      monthLabel={monthYear(m.dueDate)}
                      audience="tenant"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Balance */}
      <div
        className="flex items-center justify-between rounded-xl border border-amber-200 px-4 py-3 backdrop-blur-md"
        style={FILL}
      >
        <span className="text-sm font-medium text-slate-200">
          Balance up to date
        </span>
        <span className="text-lg font-bold tabular-nums text-amber-300">
          {formatPeso(data.outstanding)}
        </span>
      </div>

      {/* How to pay */}
      {(data.paymentInstructions || data.methods.length > 0) && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            How to pay
          </h2>
          <div
            className="rounded-2xl border border-emerald-200 p-4 text-sm text-emerald-100 backdrop-blur-md"
            style={FILL}
          >
            {data.paymentInstructions && (
              <p className="whitespace-pre-wrap">{data.paymentInstructions}</p>
            )}
            {data.methods.length > 0 && (
              <p className="mt-2 text-emerald-300">
                Accepts:{" "}
                {data.methods.map((m) => PAYMENT_METHOD_LABELS[m]).join(", ")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Documents */}
      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          Documents
        </h2>
        <div
          className="overflow-hidden rounded-2xl border border-white/12 backdrop-blur-md"
          style={FILL}
        >
          {data.contract && (data.contract.view || data.contract.download) && (
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                📄 Your signed contract
              </span>
              <span className="flex gap-2">
                {data.contract.view && (
                  <a
                    href={data.contract.view}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 active:scale-95"
                  >
                    View
                  </a>
                )}
                {data.contract.download && (
                  <a
                    href={data.contract.download}
                    className="rounded-md border border-emerald-400/40 px-3 py-1.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/10 active:scale-95"
                  >
                    ⬇️ Download
                  </a>
                )}
              </span>
            </div>
          )}
          {!preview && <RenterIdUpload token={data.token} hasId={data.hasRenterId} />}
        </div>
      </section>
    </div>
  );
}
