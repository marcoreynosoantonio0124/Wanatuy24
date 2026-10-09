import Link from "next/link";
import { formatPeso } from "@/lib/format";
import { RenterHero } from "@/components/renter-hero";
import { JoinUnitForm } from "@/components/join-unit-form";
import type { RenterRentalsData, RenterRentalRow } from "@/lib/renter-rentals";

/**
 * The renter's "Your Rentals" records list: one row per apartment they rent,
 * with a balance + status. Mirrors the lessor's property list. Tapping a row
 * opens that rental's full timetable + payment detail.
 */
export function RenterRentalsList({
  data,
  greetingName = "there",
  preview = false,
  previewHref,
}: {
  data: RenterRentalsData;
  greetingName?: string;
  preview?: boolean;
  /** In preview mode, send every rental row to this one sample page. */
  previewHref?: string;
}) {
  const { rentals, totalOutstanding } = data;
  const fillStyle = { backgroundColor: "rgba(45,58,80,0.5)" } as const;

  return (
    <div className="space-y-6">
      <RenterHero greetingName={greetingName} flushTop={!preview} />

      <div className="space-y-6">
        <div>
          <h2
            className="text-4xl font-bold leading-none text-white sm:text-5xl [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]"
            style={{
              fontFamily: "'Caveat', ui-rounded, cursive",
              WebkitTextStroke: "0.8px rgba(2,6,23,0.65)",
              paintOrder: "stroke",
            }}
          >
            Your Rentals
          </h2>
          <p className="mt-0.5 text-sm font-medium text-white/90 [text-shadow:0_1px_5px_rgba(0,0,0,0.9)]">
            Ang iyong mga inuupahan · tap to open the records
          </p>
        </div>

        {!preview && <JoinUnitForm compact={rentals.length > 0} />}

        {rentals.length === 0 ? (
          <div
            className="rounded-2xl border border-white/12 p-8 text-center backdrop-blur-md"
            style={fillStyle}
          >
            <p className="text-slate-100">Let&apos;s find your rental! 🧳</p>
            <p className="mt-1 text-sm text-slate-400">
              Ask your landlord for your{" "}
              <span className="font-semibold text-slate-200">transaction number</span>,
              type it in the box above, and your unit appears here automatically —
              all your rent, dues and receipts in one place.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rentals.map((r) => (
              <RentalRow
                key={r.id}
                r={r}
                preview={preview}
                previewHref={previewHref}
              />
            ))}
          </div>
        )}

        {/* Records summary */}
        <section>
          <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
            Your records
          </h2>
          <div
            className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/12 backdrop-blur-md"
            style={fillStyle}
          >
            <SummaryCell label="Rentals" value={String(rentals.length)} />
            <SummaryCell
              label="You still owe"
              value={formatPeso(totalOutstanding)}
              valueClass={totalOutstanding ? "text-amber-300" : "text-emerald-300"}
              last
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function RentalRow({
  r,
  preview,
  previewHref,
}: {
  r: RenterRentalRow;
  preview: boolean;
  previewHref?: string;
}) {
  const icon = r.allPaid ? "🏠" : r.overdueCount > 0 ? "🏚️" : "🏡";
  const href = preview ? previewHref : `/my-rentals/${r.id}`;
  const fillStyle = { backgroundColor: "rgba(45,58,80,0.5)" } as const;

  const inner = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-xl">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-slate-100">
          {r.unitLabel}
        </span>
        <span className="block truncate text-sm text-slate-400">
          {r.address ? `${r.address} · ` : ""}
          {formatPeso(r.monthly)}/mo
        </span>
        {r.transactionNo && (
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-200">
              🔖 {r.transactionNo}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        {r.outstanding > 0 && (
          <span className="hidden font-bold tabular-nums text-amber-300 sm:inline">
            {formatPeso(r.outstanding)} due
          </span>
        )}
        <StatusPill r={r} />
        {href && <span className="text-slate-400">›</span>}
      </span>
    </>
  );

  const cls =
    "flex items-center gap-3 rounded-2xl border border-white/12 p-4 shadow-sm backdrop-blur-md";

  if (!href) {
    return (
      <div className={cls} style={fillStyle}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      style={fillStyle}
      className={`${cls} transition hover:border-emerald-300/60 hover:shadow-md active:scale-[0.99]`}
    >
      {inner}
    </Link>
  );
}

function StatusPill({ r }: { r: RenterRentalRow }) {
  if (r.allPaid)
    return (
      <Pill tone="ok">Up to date</Pill>
    );
  if (r.overdueCount > 0)
    return <Pill tone="bad">{r.overdueCount} overdue</Pill>;
  return <Pill tone="due">Has balance</Pill>;
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "bad" | "due";
}) {
  const tones: Record<string, string> = {
    ok: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30",
    bad: "bg-red-500/15 text-red-300 ring-red-400/30",
    due: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function SummaryCell({
  label,
  value,
  valueClass = "text-slate-100",
  last = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <div className={`px-5 py-4 ${last ? "" : "border-r border-white/10"}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}
