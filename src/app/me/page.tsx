import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Renter home (spec §6.3) — all agreements across all lessors, next due per
 * agreement, big "Upload proof" buttons. Deliberately dumb. No auth yet, so we
 * render the first RENTER-side member's agreements.
 */
export default async function RenterHome() {
  const member = await prisma.agreementMember.findFirst({
    where: { role: "RENTER", userId: { not: null } },
  });
  if (!member) {
    return (
      <div>
        <h1>My agreements</h1>
        <p className="notice">No renter data yet. Seed the database to see this populated.</p>
      </div>
    );
  }

  const memberships = await prisma.agreementMember.findMany({
    where: { userId: member.userId, role: "RENTER" },
    include: {
      agreement: {
        include: {
          asset: true,
          obligations: {
            include: {
              occurrences: {
                where: { status: { in: ["UPCOMING", "DUE", "OVERDUE", "REJECTED"] } },
                orderBy: { dueAt: "asc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return (
    <div>
      <h1>My agreements</h1>
      <ul className="plain">
        {memberships.map((m) => {
          const ag = m.agreement;
          const next = ag.obligations
            .flatMap((ob) => ob.occurrences.map((oc) => ({ oc, ob })))
            .sort((a, b) => a.oc.dueAt.getTime() - b.oc.dueAt.getTime())[0];
          return (
            <li className="card" key={m.id}>
              <div className="row">
                <span className="title">{ag.asset.label}</span>
                <span className="meta">{ag.title}</span>
              </div>
              {next ? (
                <div className="meta">
                  Next: {next.ob.title} ·{" "}
                  {DateTime.fromJSDate(next.oc.dueAt, { zone: ag.timezone }).toFormat("ccc d LLL")}
                  {next.ob.amount
                    ? ` · ${formatMoney(Number(next.ob.amount), ag.currency)}`
                    : ""}
                </div>
              ) : (
                <div className="meta">Nothing due. ✅</div>
              )}
              <div style={{ marginTop: 10 }}>
                {next ? (
                  <a className="btn" href={`/occurrences/${next.oc.id}`}>
                    Upload proof
                  </a>
                ) : (
                  <a className="btn secondary" href={`/agreements/${ag.id}/timeline`}>
                    View timeline
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
