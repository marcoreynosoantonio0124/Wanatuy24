"use client";

import { useEffect, useState } from "react";

export type ReminderRecord = {
  sentAt: string; // ISO timestamp
  label: string; // e.g. "3 days before"
  body: string; // the exact text that went out
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
  });
}
function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The 📩 "Reminded" badge shown on a month that has already been texted. Tapping
 * it opens the full record of every reminder sent for that month. Fully
 * read-only — DueMeet sends the texts automatically; there is no manual send.
 */
export function ReminderBadge({
  records,
  monthLabel,
  audience = "lessor",
}: {
  records: ReminderRecord[];
  monthLabel: string;
  audience?: "lessor" | "tenant";
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (records.length === 0) return null;

  const count = records.length;
  const last = records[0]; // caller passes most-recent first
  const hot = count >= 3;
  const verb = audience === "tenant" ? "Reminder" : "Reminded";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          audience === "tenant"
            ? "See every reminder DueMeet texted you for this month"
            : "See every reminder texted for this month"
        }
        className={`group relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 py-1 pl-1 pr-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/40 active:translate-y-0 active:scale-95 ${
          hot ? "ring-2 ring-amber-300" : ""
        }`}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[11px]">
          📩
        </span>
        <span>{verb}</span>
        {count > 1 && (
          <span className="rounded-full bg-white px-1.5 text-[10px] font-extrabold text-indigo-600">
            {count}×
          </span>
        )}
        <span className="font-semibold opacity-90">· last {fmtDate(last.sentAt)}</span>
        {hot && <span aria-hidden>✨</span>}
        <span className="opacity-80">›</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Reminder record for ${monthLabel}`}
            className="flex max-h-[82vh] w-full max-w-md flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-slate-900">
                  {monthLabel} — reminder record
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {count} {count === 1 ? "text" : "texts"} sent
                  {audience === "tenant" ? " to you" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 active:scale-95"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              {records.map((r, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700">
                      {r.label}
                    </span>
                    <span className="text-xs tabular-nums text-slate-500">
                      {fmtDateTime(r.sentAt)}
                    </span>
                  </div>
                  <p className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
                    {r.body || "(message not recorded)"}
                  </p>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    ✓ Delivered
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
