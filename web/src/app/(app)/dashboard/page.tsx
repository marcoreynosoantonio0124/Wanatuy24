import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatPeso, formatDate } from "@/lib/format";
import { PeriodStatusBadge } from "@/components/period-status-badge";
import { PushToggle } from "@/components/push-toggle";
import { DuskScene } from "@/components/dusk-scene";
import type { PeriodStatus } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type AttentionPeriod = {
  id: string;
  due_date: string;
  amount_php: number;
  status: PeriodStatus;
  agreement: {
    id: string;
    renter_name: string;
    asset: { label: string } | null;
  } | null;
};

export default async function DashboardPage() {
  const { supabase } = await requireUser();

  const [{ count: agreementCount }, { data: attention }] = await Promise.all([
    supabase
      .from("agreements")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("periods")
      .select(
        "id, due_date, amount_php, status, agreement:agreements(id, renter_name, asset:assets(label))",
      )
      .in("status", ["due", "overdue", "proof_submitted"])
      .order("due_date", { ascending: true })
      .limit(50),
  ]);

  const rows = (attention ?? []) as unknown as AttentionPeriod[];
  const overdue = rows.filter((r) => r.status === "overdue");
  const awaitingReview = rows.filter((r) => r.status === "proof_submitted");
  const outstanding = rows
    .filter((r) => r.status !== "proof_submitted")
    .reduce((sum, r) => sum + r.amount_php, 0);

  return (
    <div className="space-y-8">
      {/* premium hero banner */}
      <section className="relative min-h-[200px] overflow-hidden rounded-2xl ring-1 ring-slate-900/10">
        <DuskScene
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/55 to-slate-950/25" />
        <div className="relative flex flex-col gap-4 p-6 sm:p-8">
          <div>
            <p className="text-sm font-medium text-emerald-300">Welcome back 👋</p>
            <h1 className="mt-1 text-2xl font-bold text-white drop-shadow sm:text-3xl">
              Your rentals at a glance
            </h1>
            <p className="mt-1 max-w-md text-sm text-white/75">
              Track due dates, reminders, and payment proofs — all in one place.
            </p>
          </div>
          <div>
            <Link
              href="/agreements/new"
              className="inline-block rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
            >
              + New agreement
            </Link>
          </div>
        </div>
      </section>

      {/* stat tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon="📄"
          tint="bg-slate-100"
          label="Active agreements"
          value={String(agreementCount ?? 0)}
        />
        <StatCard
          icon="⏳"
          tint={overdue.length ? "bg-red-100" : "bg-amber-100"}
          label="Outstanding (due + overdue)"
          value={formatPeso(outstanding)}
          valueClass={overdue.length ? "text-red-600" : "text-slate-900"}
        />
        <StatCard
          icon="🧾"
          tint={awaitingReview.length ? "bg-blue-100" : "bg-slate-100"}
          label="Proofs to review"
          value={String(awaitingReview.length)}
          valueClass={awaitingReview.length ? "text-blue-600" : "text-slate-900"}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
        <PushToggle />
      </div>

      {/* needs attention */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Needs attention
        </h2>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {rows.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/agreements/${p.agreement?.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {p.agreement?.renter_name ?? "Renter"}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      {p.agreement?.asset?.label ?? "Unit"} · due{" "}
                      {formatDate(p.due_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-900">
                      {formatPeso(p.amount_php)}
                    </span>
                    <PeriodStatusBadge status={p.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  tint,
  label,
  value,
  valueClass = "text-slate-900",
}: {
  icon: string;
  tint: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`grid h-10 w-10 place-items-center rounded-xl ${tint} text-lg`}
      >
        {icon}
      </div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-slate-600">Nothing due right now. 🎉</p>
      <p className="mt-1 text-sm text-slate-400">
        Create an agreement to start tracking rent and due dates.
      </p>
    </div>
  );
}
