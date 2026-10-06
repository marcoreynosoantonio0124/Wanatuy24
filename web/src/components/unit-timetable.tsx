import Link from "next/link";
import { formatPeso, formatDate } from "@/lib/format";
import { ReminderBadge } from "@/components/reminder-badge";
import type { ForecastMonth, ForecastStatus } from "@/components/year-forecast";

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
}: {
  agreementId: string;
  unitLabel: string;
  renterName: string;
  scheduleLabel: string;
  months: ForecastMonth[];
  collected: number;
  outstanding: number;
  remindersSent: number;
}) {
  return (
    <div className="space-y-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 active:scale-95"
      >
        ← Your Properties
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-600 p-5 text-white shadow-lg shadow-emerald-900/20">
        <h1 className="text-2xl font-bold">{unitLabel}</h1>
        <p className="mt-1 text-sm text-white/85">
          {renterName} · {scheduleLabel}
        </p>
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
                className="rounded-2xl border border-slate-200 bg-white p-4"
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

                <div className="mt-3">
                  {m.reminders.length > 0 ? (
                    <ReminderBadge
                      records={m.reminders}
                      monthLabel={monthYear(m.dueDate)}
                      audience="lessor"
                    />
                  ) : (
                    <p className="text-xs text-slate-400">
                      {m.status === "upcoming"
                        ? "Not texted yet — a reminder appears here once it goes out."
                        : "No reminder sent yet."}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
          This unit · summary
        </h2>
        <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <SummaryCell label="Collected" value={formatPeso(collected)} tone="emerald" />
          <SummaryCell
            label="Outstanding"
            value={formatPeso(outstanding)}
            tone={outstanding ? "red" : "slate"}
          />
          <SummaryCell label="Reminders sent" value={String(remindersSent)} last />
        </div>
      </section>

      <Link
        href={`/agreements/${agreementId}`}
        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 active:scale-95"
      >
        ⚙️ Record payments &amp; manage this unit →
      </Link>
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
