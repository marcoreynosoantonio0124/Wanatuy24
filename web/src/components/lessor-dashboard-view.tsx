import Link from "next/link";
import { formatPeso } from "@/lib/format";
import { PushToggle } from "@/components/push-toggle";
import { LessorHero } from "@/components/lessor-hero";
import type { LessorDashboard, Property } from "@/lib/lessor-dashboard";

/**
 * The lessor "Your Properties" dashboard, as a pure view. The signed-in lessor
 * page and the admin preview/monitor pages all render this from the same data.
 *
 * `preview` hides owner-only actions (make an agreement, push toggle) and turns
 * the property rows into plain cards (no deep links), so an admin can look
 * without touching anything.
 */
export function LessorDashboardView({
  data,
  preview = false,
  greetingName = "there",
  previewHref,
}: {
  data: LessorDashboard;
  preview?: boolean;
  greetingName?: string;
  /** In preview mode, send every unit row to this one sample page. */
  previewHref?: string;
}) {
  const { properties, outstanding, proofsToReview } = data;

  return (
    <div className="space-y-6">
      <LessorHero greetingName={greetingName} flushTop={!preview} />

      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Your Properties
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ang Iyong Mga Paupahan · tap a house to open it
          </p>
        </div>
        {!preview && (
          <Link
            href="/agreements/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
          >
            + Make an agreement
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <EmptyState preview={preview} />
      ) : (
        <div className="space-y-3">
          {properties.map((p) => (
            <PropertyRow
              key={p.id}
              p={p}
              preview={preview}
              previewHref={previewHref}
            />
          ))}
        </div>
      )}

      {!preview && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <PushToggle />
        </div>
      )}

      {/* Portfolio summary */}
      <section>
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Portfolio summary
        </h2>
        <div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3">
          <SummaryCell label="Properties" value={String(properties.length)} />
          <SummaryCell
            label="Outstanding"
            value={formatPeso(outstanding)}
            valueClass={outstanding ? "text-red-600" : "text-slate-900"}
          />
          <SummaryCell
            label="Proofs to review"
            value={String(proofsToReview)}
            valueClass={proofsToReview ? "text-blue-600" : "text-slate-900"}
            last
          />
        </div>
      </section>
    </div>
  );
}

function PropertyRow({
  p,
  preview,
  previewHref,
}: {
  p: Property;
  preview: boolean;
  previewHref?: string;
}) {
  const icon = p.allPaid ? "🏠" : p.overdueCount > 0 ? "🏚️" : "🏡";
  const href = preview ? previewHref : `/dashboard/unit/${p.id}`;
  const inner = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xl">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-slate-900">
          {p.name}
        </span>
        <span className="block truncate text-sm text-slate-500">
          {p.tenant} · {formatPeso(p.monthly)}/mo
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        {p.owed > 0 && (
          <span className="hidden font-bold tabular-nums text-amber-700 sm:inline">
            {formatPeso(p.owed)} owed
          </span>
        )}
        <FolderPill p={p} />
        {href && <span className="text-slate-400">›</span>}
      </span>
    </>
  );

  const cls =
    "flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm";

  if (!href) {
    return <div className={cls}>{inner}</div>;
  }
  return (
    <Link
      href={href}
      className={`${cls} transition hover:border-emerald-300 hover:shadow-md active:scale-[0.99]`}
    >
      {inner}
    </Link>
  );
}

function FolderPill({ p }: { p: Property }) {
  if (p.allPaid) return <Pill tone="ok">All paid up</Pill>;
  if (p.overdueCount > 0) return <Pill tone="bad">{p.overdueCount} overdue</Pill>;
  if (p.proofCount > 0) return <Pill tone="proof">Proof sent</Pill>;
  return <Pill tone="due">Due</Pill>;
}

function Pill({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "bad" | "due" | "proof";
}) {
  const tones: Record<string, string> = {
    ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bad: "bg-red-50 text-red-700 ring-red-200",
    due: "bg-amber-50 text-amber-700 ring-amber-200",
    proof: "bg-sky-50 text-sky-700 ring-sky-200",
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
  valueClass = "text-slate-900",
  last = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 ${last ? "" : "border-b border-slate-100 sm:border-b-0 sm:border-r"}`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ preview }: { preview: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-slate-600">Wala pang naka-set up na paupahan. 🏠</p>
      <p className="mt-1 text-sm text-slate-400">
        {preview
          ? "This landlord hasn't added any properties yet."
          : "Tap “Make an agreement” to add your first property and start tracking rent."}
      </p>
    </div>
  );
}
