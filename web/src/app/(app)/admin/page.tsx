import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { formatPeso, formatDate } from "@/lib/format";
import { ActAsButton } from "@/components/act-as-button";

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

  // Estimated Semaphore cost per (1-segment) SMS, in centavos. Override with
  // SEMAPHORE_PESO_PER_SMS if your credit price differs.
  const SMS_COST_CENTAVOS = Math.round(
    Number(process.env.SEMAPHORE_PESO_PER_SMS ?? "0.50") * 100,
  );

  // Time windows. Current time is inherently dynamic; this page is force-dynamic.
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Manila is UTC+8 (no DST) — compute the start of today and this month there.
  const manila = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const startTodayIso = new Date(
    Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate()) -
      8 * 60 * 60 * 1000,
  ).toISOString();
  const startMonthIso = new Date(
    Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), 1) -
      8 * 60 * 60 * 1000,
  ).toISOString();

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
    smsToday,
    smsMonth,
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
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("channel", "sms")
      .eq("status", "sent")
      .gte("sent_at", startTodayIso),
    admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("channel", "sms")
      .eq("status", "sent")
      .gte("sent_at", startMonthIso),
  ]);

  // Lists for the dashboard-preview section: real landlords to view-as, and
  // real renters whose portal we can open.
  const [lessorsListRes, rentersListRes] = await Promise.all([
    admin
      .from("users")
      .select("id, email")
      .eq("role", "lessor")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("agreements")
      .select(
        "id, renter_name, renter_access_token, renter_user_id, asset:assets(label)",
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);
  const lessorList = (lessorsListRes.data ?? []) as {
    id: string;
    email: string;
  }[];
  const renterList = (rentersListRes.data ?? []) as unknown as {
    id: string;
    renter_name: string;
    renter_access_token: string;
    renter_user_id: string | null;
    asset: { label: string } | null;
  }[];

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

  const smsTodayCount = smsToday.count ?? 0;
  const smsMonthCount = smsMonth.count ?? 0;
  const smsCostText = (SMS_COST_CENTAVOS / 100).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
  });

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

      {/* Preview dashboards — the founder's view into both sides of the app */}
      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Preview dashboards
        </h2>
        <p className="mb-3 text-sm text-slate-500">
          See the app exactly the way your users see it — jump into a sample to
          look around, or <strong>Act as</strong> a real landlord or renter to
          do a full end-to-end run-through as them (send messages, add a
          contract, record payments). A yellow bar brings you back here.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <PreviewCard
            href="/admin/sample/lessor"
            icon="🧑‍💼"
            title="Sample lessor view"
            sub="Example landlord dashboard (DUE)"
          />
          <PreviewCard
            href="/admin/sample/tenant"
            icon="🧳"
            title="Sample renter view"
            sub="Example tenant dashboard (MEET)"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-1 text-sm font-semibold text-slate-700">
              🏠 Open a real landlord
            </p>
            {lessorList.length === 0 ? (
              <p className="py-3 text-sm text-slate-400">No landlords yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {lessorList.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-slate-800">
                      {l.email}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`/admin/as/lessor/${l.id}`}
                        className="font-semibold text-emerald-700 transition hover:text-emerald-800"
                      >
                        View
                      </Link>
                      <ActAsButton userId={l.id} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="mb-1 text-sm font-semibold text-slate-700">
              🧾 Open a real renter
            </p>
            {renterList.length === 0 ? (
              <p className="py-3 text-sm text-slate-400">No renters yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {renterList.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <span className="min-w-0 truncate text-slate-800">
                      {r.renter_name}
                      {r.asset?.label ? (
                        <span className="text-slate-400"> · {r.asset.label}</span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <a
                        href={`/r/${r.renter_access_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-emerald-700 transition hover:text-emerald-800"
                      >
                        Portal ↗
                      </a>
                      {r.renter_user_id && (
                        <ActAsButton userId={r.renter_user_id} />
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

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

      {/* SMS cost */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Automatic SMS reminders
        </h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat icon="📩" label="Texts sent today" value={smsTodayCount} />
          <Stat
            icon="💸"
            label="Est. cost today"
            value={formatPeso(smsTodayCount * SMS_COST_CENTAVOS)}
            tone="amber"
          />
          <Stat icon="📅" label="Texts this month" value={smsMonthCount} />
          <Stat
            icon="🧮"
            label="Est. cost this month"
            value={formatPeso(smsMonthCount * SMS_COST_CENTAVOS)}
            tone="amber"
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Estimated at ₱{smsCostText} per text (Semaphore, 1 credit). Counts every
          reminder text sent successfully — automatic daily ones and manual
          “Send reminder” taps.
        </p>
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

function PreviewCard({
  href,
  icon,
  title,
  sub,
}: {
  href: string;
  icon: string;
  title: string;
  sub: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md active:scale-[0.99]"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-2xl">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-slate-900">{title}</span>
        <span className="block text-sm text-slate-500">{sub}</span>
      </span>
      <span className="shrink-0 font-semibold text-emerald-700">Open ›</span>
    </Link>
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
