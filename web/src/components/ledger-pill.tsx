import type { LedgerRow } from "@/lib/ledger";

/** Per-month status pill that reflects partial payments (shared by renter views). */
export function LedgerPill({ row }: { row: LedgerRow }) {
  if (row.status === "waived") return <Pill tone="slate">Waived</Pill>;
  if (row.status === "paid") return <Pill tone="emerald">Paid</Pill>;
  if (row.overdue) return <Pill tone="red">Overdue</Pill>;
  if (row.status === "partial") return <Pill tone="amber">Partial</Pill>;
  return <Pill tone="slate">Upcoming</Pill>;
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "emerald" | "amber" | "red" | "slate";
}) {
  const tones: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
    slate: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
