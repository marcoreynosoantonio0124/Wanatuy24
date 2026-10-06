"use client";

import { useEffect, useState } from "react";
import { formatPeso } from "@/lib/format";

export type ForecastStatus =
  | "paid"
  | "partial"
  | "due"
  | "overdue"
  | "upcoming"
  | "waived";

export type ForecastMonth = {
  periodId: string;
  dueDate: string; // YYYY-MM-DD
  due: number;
  paid: number;
  remaining: number;
  status: ForecastStatus;
  isNow: boolean;
  reminders: { sentAt: string; label: string; body: string }[];
};

const LABEL: Record<ForecastStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  due: "Due",
  overdue: "Overdue",
  upcoming: "Upcoming",
  waived: "Waived",
};
const DOT: Record<ForecastStatus, string> = {
  paid: "text-emerald-600",
  partial: "text-amber-600",
  due: "text-amber-600",
  overdue: "text-red-600",
  upcoming: "text-slate-400",
  waived: "text-slate-400",
};

function monthLabel(iso: string): string {
  return new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  });
}
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00+08:00`).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}
function textTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The renter's whole year of rent at a glance — tap a month for its details. */
export function YearForecast({ months }: { months: ForecastMonth[] }) {
  const [open, setOpen] = useState<ForecastMonth | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        {months.map((m) => (
          <button
            key={m.periodId}
            type="button"
            onClick={() => setOpen(m)}
            className={`flex flex-col gap-1.5 rounded-xl border bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 active:scale-95 ${
              m.isNow
                ? "border-red-300 ring-2 ring-red-200"
                : "border-slate-200"
            }`}
          >
            <span className="text-[13px] font-extrabold text-slate-900">
              {monthLabel(m.dueDate)}
            </span>
            <span className="text-[11px] tabular-nums text-slate-500">
              {formatPeso(m.due)}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide ${DOT[m.status]}`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {LABEL[m.status]}
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900">
                  {monthLabel(open.dueDate)} — your rent
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {open.status === "upcoming"
                    ? `Due ${dayLabel(open.dueDate)}`
                    : LABEL[open.status]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="Close"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-600">Due {formatPeso(open.due)}</span>
              {open.paid > 0 && (
                <span className="font-semibold text-emerald-600">
                  Paid {formatPeso(open.paid)}
                </span>
              )}
              {open.remaining > 0 && open.status !== "upcoming" && (
                <span className="font-semibold text-amber-700">
                  {formatPeso(open.remaining)} left
                </span>
              )}
              {open.status === "upcoming" && (
                <span className="text-slate-400">Not due yet</span>
              )}
            </div>

            {open.reminders.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Reminders texted to you
                </p>
                {open.reminders.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <span className="self-start rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                      {r.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {textTime(r.sentAt)}
                    </span>
                    <span className="text-sm text-slate-700">{r.body}</span>
                    <span className="text-xs font-semibold text-emerald-600">
                      ✓ Delivered
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {open.status === "upcoming"
                  ? "No reminder yet — DueMeet will text you 3 days before this due date."
                  : "No reminders sent for this month."}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
