import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { formatPeso, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const { user, supabase } = await requireUser();

  // Only the owner/admin may view the command center.
  const { data: me } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!(me as { is_admin?: boolean } | null)?.is_admin) {
    redirect("/dashboard");
  }

  // Platform-wide numbers (service role bypasses RLS).
  const admin = createAdminClient();
  // Current time is inherently dynamic; this server component is force-dynamic.
  // eslint-disable-next-line react-hooks/purity
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersTotal,
    newThisWeek,
    lessors,
    tenants,
    unitsTotal,
    activeAgreements,
    pendingProofs,
    recentRes,
    paidRes,
    dueRes,
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "lessor"),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "tenant"),
    admin.from("assets").select("id", { count: "exact", head: true }),
    admin
      .from("agreements")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("payment_proofs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("users")
      .select("email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    admin.from("periods").select("amount_php").eq("status", "paid").limit(10000),
    admin
      .from("periods")
      .select("amount_php, status")
      .in("status", ["due", "overdue"])
      .limit(10000),
  ]);

  const paid = (paidRes.data ?? []) as { amount_php: number }[];
  const due = (dueRes.data ?? []) as { amount_php: number; status: string }[];
  const collected = paid.reduce((s, r) => s + (r.amount_php || 0), 0);
  const outstanding = due.reduce((s, r) => s + (r.amount_php || 0), 0);
  const overdueCount = due.filter((r) => r.status === "overdue").length;
  const recent = (recentRes.data ?? []) as {
    email: string;
    role: string | null;
    created_at: string;
  }[];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-2xl bg-slate-900 p-6 text-white">
        <p className="text-sm font-medium text-emerald-300">🎛️ Command Center</p>
        <h1 className="mt-1 text-2xl font-bold">DueMeet at a glance</h1>
        <p className="mt-1 text-sm text-white/70">
          A private overview of everyone using the app. Only you can see this.
        </p>
      </div>

      {/* People */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          People
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat icon="👥" label="Total users" value={usersTotal.count ?? 0} />
          <Stat
            icon="🆕"
            label="New this week"
            value={newThisWeek.count ?? 0}
            tone="emerald"
          />
          <Stat icon="🧑‍💼" label="Lessors" value={lessors.count ?? 0} />
          <Stat icon="🧳" label="Tenants" value={tenants.count ?? 0} />
        </div>
      </section>

      {/* Activity */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Activity
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat icon="🏢" label="Units tracked" value={unitsTotal.count ?? 0} />
          <Stat
            icon="📄"
            label="Active agreements"
            value={activeAgreements.count ?? 0}
          />
          <Stat
            icon="💰"
            label="Collected"
            value={formatPeso(collected)}
            tone="emerald"
          />
          <Stat
            icon="⏳"
            label="Outstanding"
            value={formatPeso(outstanding)}
            tone={outstanding ? "amber" : "slate"}
          />
        </div>
      </section>

      {/* Needs attention */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Needs attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Attention
            icon="🧾"
            label="Payment proofs waiting for review"
            value={pendingProofs.count ?? 0}
            tone={pendingProofs.count ? "blue" : "ok"}
          />
          <Attention
            icon="🚩"
            label="Overdue payments across all renters"
            value={overdueCount}
            tone={overdueCount ? "red" : "ok"}
          />
        </div>
      </section>

      {/* Recent sign-ups */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent sign-ups
        </h2>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
            No sign-ups yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {recent.map((u, i) => (
              <li
                key={`${u.email}-${i}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {u.email}
                  </p>
                  <p className="text-xs text-slate-400">
                    Joined {formatDate(u.created_at)}
                  </p>
                </div>
                <RolePill role={u.role} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "slate",
}: {
  icon: string;
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "amber";
}) {
  const valueColor =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-slate-900";
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-lg">
        {icon}
      </div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

function Attention({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: "ok" | "blue" | "red";
}) {
  const styles =
    tone === "red"
      ? "border-red-200 bg-red-50"
      : tone === "blue"
        ? "border-blue-200 bg-blue-50"
        : "border-slate-200 bg-white";
  const valueColor =
    tone === "red"
      ? "text-red-600"
      : tone === "blue"
        ? "text-blue-600"
        : "text-slate-900";
  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-5 ${styles}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}

function RolePill({ role }: { role: string | null }) {
  if (role === "lessor")
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
        Lessor
      </span>
    );
  if (role === "tenant")
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
        Tenant
      </span>
    );
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
      No role yet
    </span>
  );
}
