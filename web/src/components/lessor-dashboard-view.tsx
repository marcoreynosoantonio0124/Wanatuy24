import Image from "next/image";
import Link from "next/link";
import { formatPeso } from "@/lib/format";
import { PushToggle } from "@/components/push-toggle";
import { LessorHero } from "@/components/lessor-hero";
import { ArchiveUnitButton } from "@/components/archive-unit-button";
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
  pageBackground,
}: {
  data: LessorDashboard;
  preview?: boolean;
  greetingName?: string;
  /** In preview mode, send every unit row to this one sample page. */
  previewHref?: string;
  /** Optional full-page photo wallpaper behind the whole dashboard. */
  pageBackground?: string;
}) {
  const { properties, outstanding, proofsToReview } = data;

  return (
    <div className="space-y-6">
      {pageBackground && (
        <div className="fixed inset-0 -z-10">
          <Image
            src={pageBackground}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/60 to-slate-950/85" />
        </div>
      )}

      <LessorHero greetingName={greetingName} flushTop={!preview} />

      {/* Page heading */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-4xl font-bold leading-none text-white sm:text-5xl [text-shadow:0_3px_10px_rgba(0,0,0,0.9)]"
            style={{
              fontFamily: "'Caveat', ui-rounded, cursive",
              WebkitTextStroke: "1.1px rgba(2,6,23,0.7)",
              paintOrder: "stroke",
            }}
          >
            Your Properties
          </h1>
          <p className="mt-0.5 text-sm font-medium text-white/90 [text-shadow:0_1px_5px_rgba(0,0,0,0.9)]">
            Ang Iyong Mga Paupahan · tap a house to open it
          </p>
        </div>
        {!preview && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            <Link
              href="/assets"
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl sm:flex-none border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-[13px] font-semibold sm:px-3.5 sm:text-sm text-emerald-700 transition hover:bg-emerald-500/20 active:scale-95"
            >
              + Add property
            </Link>
            <Link
              href="/agreements/new"
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl sm:flex-none bg-emerald-600 px-3 py-2 text-[13px] font-semibold sm:px-3.5 sm:text-sm text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
            >
              + Make an agreement
            </Link>
          </div>
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
        <h2 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-white/80 [text-shadow:0_1px_4px_rgba(0,0,0,0.9)]">
          Portfolio summary
        </h2>
        <div
          className="grid grid-cols-1 overflow-hidden rounded-2xl border border-white/12 shadow-sm backdrop-blur-md sm:grid-cols-3"
          style={{ backgroundColor: "rgba(45,58,80,0.5)" }}
        >
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
  const fillStyle = { backgroundColor: "rgba(45,58,80,0.5)" } as const;
  const cardCls =
    "flex flex-wrap items-center gap-3 rounded-2xl border border-white/12 p-4 shadow-sm backdrop-blur-md sm:flex-nowrap";

  // A property with no active agreement — "Open for leasing" (inactive).
  if (p.vacant) {
    return (
      <div className={cardCls} style={fillStyle}>
        <UnitThumb p={p} fallback="🔑" dark />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold text-slate-100">
            {p.name}
          </span>
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Open for leasing · inactive
          </span>
        </span>
        {!preview && (
          <span className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
            <Link
              href="/agreements/new"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 active:scale-95"
            >
              + Lease it
            </Link>
            <ArchiveUnitButton assetId={p.assetId} />
          </span>
        )}
      </div>
    );
  }

  const icon = p.allPaid ? "🏠" : p.overdueCount > 0 ? "🏚️" : "🏡";
  const href = preview ? previewHref : `/dashboard/unit/${p.id}`;
  const inner = (
    <>
      <UnitThumb p={p} fallback={icon} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-bold text-slate-900">
          {p.name}
        </span>
        <span className="block truncate text-sm text-slate-500">
          {p.tenant} · {formatPeso(p.monthly)}/mo
        </span>
        {p.transactionNo && (
          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
              🔖 {p.transactionNo}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </span>
        )}
      </span>
      <span className="flex w-full shrink-0 items-center justify-end gap-2.5 sm:w-auto">
        {p.owed > 0 && (
          <span className="mr-auto font-bold tabular-nums text-amber-700 sm:mr-0">
            {formatPeso(p.owed)} owed
          </span>
        )}
        <FolderPill p={p} />
        {href && <span className="text-slate-400">›</span>}
      </span>
    </>
  );

  // A dark slate fill at 50% opacity (with a soft blur) so the cards stay
  // readable over the photo wallpaper while the building still shows through.
  if (!href) {
    return (
      <div className={cardCls} style={fillStyle}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      href={href}
      style={fillStyle}
      className={`${cardCls} transition hover:border-emerald-300/60 hover:shadow-md active:scale-[0.99]`}
    >
      {inner}
    </Link>
  );
}

/**
 * The little square at the left of a property card: the unit's cover photo when
 * it has one, otherwise the status emoji. `dark` matches the vacant card's
 * translucent styling.
 */
function UnitThumb({
  p,
  fallback,
  dark = false,
}: {
  p: Property;
  fallback: string;
  dark?: boolean;
}) {
  if (p.coverPhoto) {
    return (
      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.coverPhoto}
          alt=""
          className="h-full w-full object-cover"
        />
        {p.photoCount > 1 && (
          <span className="absolute bottom-0 right-0 bg-slate-900/70 px-1 text-[9px] font-semibold text-white">
            {p.photoCount}
          </span>
        )}
      </span>
    );
  }
  return (
    <span
      className={
        dark
          ? "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-xl"
          : "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-xl"
      }
    >
      {fallback}
    </span>
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
      <p className="text-slate-600">Wala pang naka-setup na paupahan? 🏠</p>
      <p className="mt-1 text-sm text-slate-400">
        {preview
          ? "This landlord hasn't added any properties yet."
          : "Add your first unit and make an agreement to start earning without the hassle."}
      </p>
    </div>
  );
}
