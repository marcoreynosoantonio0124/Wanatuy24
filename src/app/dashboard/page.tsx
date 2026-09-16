import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/config";
import { statusChip, type OccStatus } from "@/lib/ui";

// No auth wired yet (build-order step 2). Until Auth.js lands we render the
// portfolio of the first asset owner. Mark dynamic so build never hits the DB.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const owner = await prisma.user.findFirst({ where: { assetsOwned: { some: {} } } });
  if (!owner) {
    return <EmptyState />;
  }

  const now = DateTime.now();
  const weekEnd = now.plus({ days: 7 }).toJSDate();
  const monthStart = now.startOf("month").toJSDate();

  const [dueThisWeek, awaitingReview, overdue, confirmedThisMonth, pendingProofs, assets] =
    await Promise.all([
      prisma.occurrence.count({
        where: {
          status: { in: ["DUE", "UPCOMING"] },
          dueAt: { gte: now.toJSDate(), lte: weekEnd },
          obligation: { agreement: { lessorId: owner.id } },
        },
      }),
      prisma.occurrence.count({
        where: { status: "SUBMITTED", obligation: { agreement: { lessorId: owner.id } } },
      }),
      prisma.occurrence.count({
        where: {
          status: { in: ["OVERDUE", "OVERDUE_ESCALATED"] },
          obligation: { agreement: { lessorId: owner.id } },
        },
      }),
      prisma.occurrence.findMany({
        where: {
          status: "CONFIRMED",
          confirmedAt: { gte: monthStart },
          obligation: { agreement: { lessorId: owner.id }, kind: "PAYMENT" },
        },
        include: { obligation: { include: { agreement: true } } },
      }),
      prisma.occurrence.findMany({
        where: { status: "SUBMITTED", obligation: { agreement: { lessorId: owner.id } } },
        include: {
          obligation: { include: { agreement: { include: { asset: true } } } },
          proofs: { where: { reviewStatus: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { dueAt: "asc" },
      }),
      prisma.asset.findMany({
        where: { ownerId: owner.id, archivedAt: null },
        include: { agreements: { include: { obligations: { include: { occurrences: true } } } } },
      }),
    ]);

  const collected = confirmedThisMonth.reduce((sum, o) => {
    const amt = o.obligation.amount ? Number(o.obligation.amount) : 0;
    return sum + amt;
  }, 0);

  return (
    <div>
      <h1>Dashboard</h1>
      <p className="muted small">Portfolio for {owner.name ?? owner.email}</p>

      <div className="stats">
        <Stat n={dueThisWeek} l="Due this week" />
        <Stat n={awaitingReview} l="Awaiting review" />
        <Stat n={overdue} l="Overdue" />
        <Stat n={formatMoney(collected, "AED") ?? "—"} l="Collected this month" />
      </div>

      <h2>Review queue</h2>
      {pendingProofs.length === 0 && <p className="muted small">Nothing awaiting review. 🎉</p>}
      <ul className="plain">
        {pendingProofs.map((o) => {
          const proof = o.proofs[0];
          const chip = statusChip(o.status as OccStatus);
          return (
            <li className="card" key={o.id}>
              <div className="row">
                <span className="title">{o.obligation.title}</span>
                <span className={`chip ${chip.cls}`}>{chip.label}</span>
              </div>
              <div className="meta">
                {o.obligation.agreement.asset.label} ·{" "}
                {formatMoney(o.obligation.amount ? Number(o.obligation.amount) : null, o.obligation.agreement.currency) ??
                  "task"}
                {proof?.referenceNo ? ` · ref ${proof.referenceNo}` : ""}
              </div>
              <div style={{ marginTop: 10 }}>
                <a className="btn" href={`/occurrences/${o.id}`}>
                  Review
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      <h2>Assets</h2>
      <p className="notice small">
        Portfolio map (Leaflet + OpenStreetMap) is build-order step 6 — pins coloured by worst
        occurrence status. The data below is what it renders from.
      </p>
      <ul className="plain">
        {assets.map((a) => {
          const statuses = a.agreements.flatMap((ag) =>
            ag.obligations.flatMap((ob) => ob.occurrences.map((oc) => oc.status))
          );
          return (
            <li className="card" key={a.id}>
              <div className="row">
                <span className="title">{a.label}</span>
                <span className="meta">{a.type}</span>
              </div>
              <div className="meta">
                {a.city ?? ""} · {a.agreements.length} agreement(s) · {statuses.length} occurrence(s)
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return (
    <div className="stat">
      <div className="n">{n}</div>
      <div className="l">{l}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p className="notice">
        No data yet. Configure <code>DATABASE_URL</code>, run <code>npx prisma migrate dev</code>{" "}
        and <code>npm run seed</code>, then reload.
      </p>
    </div>
  );
}
