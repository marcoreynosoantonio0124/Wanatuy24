import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatPeso, formatDate } from "@/lib/format";
import { PeriodStatusBadge } from "@/components/period-status-badge";
import { PushToggle } from "@/components/push-toggle";
import { NeighborhoodScene } from "@/components/neighborhood-scene";
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
      <section className="relative min-h-[220px] overflow-hidden rounded-2xl">
        <NeighborhoodScene
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/45 to-transparent" />
        <div className="relative p-6 sm:p-8">
          <p className="text-sm font-medium text-emerald-100">Welcome back 👋</p>
          <h1 className="mt-1 text-2xl font-semibold text-white drop-shadow sm:text-3xl">
            Your rentals at a glance
          </h1>
          <p className="mt-1 max-w-sm text-sm text-emerald-50/90">
            Track due dates, reminders, and payment proofs — all in one place.
          </p>
          <Link
            href="/agreements/new"
            className="mt-4 inline-block rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow hover:bg-emerald-50"
          >
            + New agreement
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active agreements" value={String(agreementCount ?? 0)} />
        <StatCard
          label="Outstanding (due + overdue)"
          value={formatPeso(outstanding)}
          tone={overdue.length ? "danger" : "default"}
        />
        <StatCard
          label="Proofs to review"
          value={String(awaitingReview.length)}
          tone={awaitingReview.length ? "info" : "default"}
        />
      </div>

      <PushToggle />

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Needs attention
        </h2>
        {rows.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/agreements/${p.agreement?.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
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
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "info";
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-600"
      : tone === "info"
        ? "text-blue-600"
        : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <p className="text-slate-600">Nothing due right now. 🎉</p>
      <p className="mt-1 text-sm text-slate-400">
        Create an agreement to start tracking rent and due dates.
      </p>
    </div>
  );
}
