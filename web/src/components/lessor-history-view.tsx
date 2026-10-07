import Link from "next/link";
import { formatPeso, formatDate } from "@/lib/format";
import type { LessorHistory, HistoryRow } from "@/lib/lessor-history";

/**
 * The lessor's History: finished tenancies with income vs. loss accounting and
 * each tenant's record. Sits on the plain dark dashboard theme.
 */
export function LessorHistoryView({
  data,
  backHref = "/dashboard",
}: {
  data: LessorHistory;
  backHref?: string;
}) {
  const { rows, totalIncome, totalLoss } = data;

  return (
    <div className="space-y-5">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 active:scale-95"
      >
        ← Your Properties
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]">
          📜 History
        </h1>
        <p className="mt-0.5 text-sm text-white/80">
          Ang mga natapos na kasunduan · income &amp; loss + tenant records
        </p>
      </div>

      {/* Totals */}
      <div
        className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/15"
        style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
      >
        <div className="border-r border-white/10 px-5 py-4">
          <p className="text-xs text-slate-400">Total income collected</p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums text-emerald-300">
            {formatPeso(totalIncome)}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-slate-400">Total loss (unpaid)</p>
          <p
            className={`mt-0.5 text-2xl font-bold tabular-nums ${
              totalLoss ? "text-red-300" : "text-slate-200"
            }`}
          >
            {formatPeso(totalLoss)}
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-2xl border border-white/12 p-8 text-center"
          style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
        >
          <p className="text-slate-200">Wala pang natapos na kasunduan. 📭</p>
          <p className="mt-1 text-sm text-slate-400">
            When a contract ends, it moves here with its full income record.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <HistoryCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ r }: { r: HistoryRow }) {
  return (
    <div
      className="rounded-2xl border border-white/15 p-4"
      style={{ backgroundColor: "rgba(15,23,42,0.6)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-slate-100">
            {r.unitLabel}
          </p>
          <p className="truncate text-sm text-slate-400">{r.tenant}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
            r.status === "ended"
              ? "bg-slate-500/15 text-slate-300 ring-slate-400/30"
              : "bg-amber-500/15 text-amber-300 ring-amber-400/30"
          }`}
        >
          {r.status === "ended" ? "Ended" : "Cancelled"}
        </span>
      </div>

      {r.transactionNo && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-200">
          🔖 {r.transactionNo}
        </span>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400">Income collected</p>
          <p className="font-bold tabular-nums text-emerald-300">
            {formatPeso(r.income)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Loss (unpaid)</p>
          <p
            className={`font-bold tabular-nums ${
              r.loss ? "text-red-300" : "text-slate-300"
            }`}
          >
            {formatPeso(r.loss)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        {r.startDate ? formatDate(r.startDate) : "—"} →{" "}
        {r.endDate ? formatDate(r.endDate) : "—"} · {formatPeso(r.monthly)}/mo
      </p>
    </div>
  );
}
