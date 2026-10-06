import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatPeso, formatDate } from "@/lib/format";
import { buildLedger } from "@/lib/ledger";
import { PushToggle } from "@/components/push-toggle";
import { DuskScene } from "@/components/dusk-scene";
import { RoleCharacter } from "@/components/role-character";
import type { PeriodRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type AgreementLite = {
  id: string;
  renter_name: string;
  amount_php: number;
  asset: { label: string } | null;
};

/** One month that still needs attention within a property. */
type AttentionRow = {
  periodId: string;
  dueDate: string;
  remaining: number;
  tone: "overdue" | "due" | "partial";
  proof: boolean;
  reminderCount: number;
  reminderLast: string | null;
};

type Property = {
  id: string;
  name: string; // unit / property label
  tenant: string;
  monthly: number;
  owed: number;
  overdueCount: number;
  proofCount: number;
  allPaid: boolean;
  attention: AttentionRow[];
  nextDue: string | null;
  lastPaid: string | null;
};

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const { data: agData } = await supabase
    .from("agreements")
    .select("id, renter_name, amount_php, asset:assets(label)")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  const ags = (agData ?? []) as unknown as AgreementLite[];
  const agIds = ags.map((a) => a.id);

  const [periodsRes, paymentsRes, smsRes] = await Promise.all([
    agIds.length
      ? supabase
          .from("periods")
          .select("id, agreement_id, due_date, amount_php, status")
          .in("agreement_id", agIds)
          .order("due_date", { ascending: true })
      : Promise.resolve({ data: [] as unknown[] }),
    agIds.length
      ? supabase
          .from("payments")
          .select("agreement_id, period_id, amount_php")
          .in("agreement_id", agIds)
      : Promise.resolve({ data: [] as unknown[] }),
    agIds.length
      ? supabase
          .from("notifications")
          .select("period_id, sent_at")
          .in("agreement_id", agIds)
          .eq("channel", "sms")
          .eq("status", "sent")
          .order("sent_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const allPeriods = (periodsRes.data ?? []) as (PeriodRow & {
    agreement_id: string;
  })[];
  const allPayments = (paymentsRes.data ?? []) as {
    agreement_id: string;
    period_id: string | null;
    amount_php: number;
  }[];
  const allSms = (smsRes.data ?? []) as {
    period_id: string | null;
    sent_at: string | null;
  }[];

  const today = new Date(new Date().getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const paymentsByAgreement = new Map<
    string,
    { period_id: string | null; amount_php: number }[]
  >();
  for (const p of allPayments) {
    const list = paymentsByAgreement.get(p.agreement_id) ?? [];
    list.push({ period_id: p.period_id, amount_php: p.amount_php });
    paymentsByAgreement.set(p.agreement_id, list);
  }

  // Reminder text count + latest date, per month.
  const smsByPeriod = new Map<string, { count: number; last: string | null }>();
  for (const n of allSms) {
    if (!n.period_id) continue;
    const prev = smsByPeriod.get(n.period_id);
    if (prev) prev.count += 1;
    else smsByPeriod.set(n.period_id, { count: 1, last: n.sent_at });
  }

  const statusByPeriod = new Map<string, string>();
  for (const p of allPeriods) statusByPeriod.set(p.id, p.status);

  const properties: Property[] = ags.map((a) => {
    const ps = allPeriods.filter((p) => p.agreement_id === a.id);
    const ledger = buildLedger(ps, paymentsByAgreement.get(a.id) ?? [], today);

    const attention: AttentionRow[] = [];
    let overdueCount = 0;
    let proofCount = 0;
    let nextDue: string | null = null;
    let lastPaid: string | null = null;

    for (const r of ledger.rows) {
      if (r.status === "waived") continue;
      const periodStatus = statusByPeriod.get(r.period.id) ?? "";
      const proof = periodStatus === "proof_submitted";
      if (proof) proofCount += 1;
      if (r.status === "paid") {
        if (r.period.due_date <= today) lastPaid = r.period.due_date;
        continue;
      }
      if (r.remaining > 0 && r.period.due_date <= today) {
        const tone: AttentionRow["tone"] = r.overdue
          ? "overdue"
          : r.status === "partial"
            ? "partial"
            : "due";
        if (tone === "overdue") overdueCount += 1;
        const sms = smsByPeriod.get(r.period.id);
        attention.push({
          periodId: r.period.id,
          dueDate: r.period.due_date,
          remaining: r.remaining,
          tone,
          proof,
          reminderCount: sms?.count ?? 0,
          reminderLast: sms?.last ?? null,
        });
      } else if (r.remaining > 0 && !nextDue && r.period.due_date > today) {
        nextDue = r.period.due_date;
      }
    }

    return {
      id: a.id,
      name: a.asset?.label ?? "Unit",
      tenant: a.renter_name,
      monthly: a.amount_php,
      owed: ledger.outstanding,
      overdueCount,
      proofCount,
      allPaid: ledger.outstanding === 0,
      attention,
      nextDue,
      lastPaid,
    };
  });

  // Needs-attention properties first (most owed first), paid-up last.
  properties.sort((x, y) => Number(x.allPaid) - Number(y.allPaid) || y.owed - x.owed);

  const outstanding = properties.reduce((s, p) => s + p.owed, 0);
  const proofsToReview = properties.reduce((s, p) => s + p.proofCount, 0);
  const anyOverdue = properties.some((p) => p.overdueCount > 0);
  const lessorMood =
    properties.length > 0 && outstanding === 0
      ? "happy"
      : anyOverdue
        ? "worried"
        : "neutral";

  return (
    <div className="space-y-6">
      {/* Brand strip with the landlord mascot */}
      <section className="relative overflow-hidden rounded-2xl ring-1 ring-white/10">
        <DuskScene preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/30" />
        <div className="relative flex items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-xs font-medium text-emerald-300">Welcome back 👋</p>
            <p className="mt-0.5 text-sm font-semibold text-white">DueMeet · Dashboard</p>
          </div>
          <RoleCharacter role="lessor" mood={lessorMood} className="h-24 w-auto drop-shadow-lg" />
        </div>
      </section>

      {/* Page heading — this is the units page */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Your Properties
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Ang Iyong Mga Paupahan · tap a house to open it
          </p>
        </div>
        <Link
          href="/agreements/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95"
        >
          + Make an agreement
        </Link>
      </div>

      {/* Property folders */}
      {properties.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3.5">
          {properties.map((p) => (
            <PropertyFolder key={p.id} p={p} />
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <PushToggle />
      </div>

      {/* Portfolio summary at the bottom */}
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

function PropertyFolder({ p }: { p: Property }) {
  const icon = p.allPaid ? "🏠" : p.overdueCount > 0 ? "🏚️" : "🏡";
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-indigo-200">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
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
          <span className="text-slate-400 transition group-open:rotate-90">›</span>
        </span>
      </summary>

      <div className="border-t border-slate-100 bg-slate-50/70 px-4 pb-4 pt-1">
        {p.owed > 0 && (
          <span className="mt-2 block font-bold tabular-nums text-amber-700 sm:hidden">
            {formatPeso(p.owed)} owed
          </span>
        )}
        {p.attention.length > 0 ? (
          <ul>
            {p.attention.map((a) => (
              <li
                key={a.periodId}
                className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0"
              >
                <span className="min-w-0 text-sm">
                  <span className="block font-semibold text-slate-800">
                    {formatDate(a.dueDate)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {a.proof
                      ? "Tenant sent proof — needs review"
                      : a.tone === "partial"
                        ? "Partly paid"
                        : a.tone === "overdue"
                          ? "Overdue"
                          : "Due now"}
                  </span>
                </span>
                <span className="flex flex-wrap items-center justify-end gap-2">
                  <span className="text-sm font-bold tabular-nums text-slate-900">
                    {formatPeso(a.remaining)}
                  </span>
                  {a.proof && <Pill tone="proof">Proof sent</Pill>}
                  <Pill tone={a.tone === "overdue" ? "bad" : a.tone === "partial" ? "due" : "due"}>
                    {a.tone === "overdue" ? "Overdue" : a.tone === "partial" ? "Partial" : "Due"}
                  </Pill>
                  {a.reminderCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 px-2 py-0.5 text-[11px] font-bold text-white">
                      📩 {a.reminderLast ? `Last ${formatDate(a.reminderLast.slice(0, 10))} · ` : ""}
                      {a.reminderCount}×
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-3 text-sm text-slate-500">
            All settled 🎉
            {p.nextDue ? ` · next due ${formatDate(p.nextDue)}` : ""}
          </p>
        )}
        <Link
          href={`/agreements/${p.id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-700 transition hover:text-emerald-800 active:scale-95"
        >
          See full details ›
        </Link>
      </div>
    </details>
  );
}

function FolderPill({ p }: { p: Property }) {
  if (p.allPaid) return <Pill tone="ok">All paid up</Pill>;
  if (p.overdueCount > 0)
    return (
      <Pill tone="bad">
        {p.overdueCount} overdue
      </Pill>
    );
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
      <p className={`mt-0.5 text-xl font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-slate-600">Wala pang naka-set up na paupahan. 🏠</p>
      <p className="mt-1 text-sm text-slate-400">
        Tap “Make an agreement” to add your first property and start tracking rent.
      </p>
    </div>
  );
}
