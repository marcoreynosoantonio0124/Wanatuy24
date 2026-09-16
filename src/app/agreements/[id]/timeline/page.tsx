import { DateTime } from "luxon";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/config";
import { statusChip, type OccStatus } from "@/lib/ui";

export const dynamic = "force-dynamic";

/**
 * Shared timeline (spec §6.2) — both roles see the same occurrences, grouped by
 * month, with a today marker and status chips. The agreement-details panel
 * (parties, policy, audit log) is deliberately visible to the renter too — this
 * is the transparency requirement.
 */
export default async function Timeline({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const agreement = await prisma.agreement.findUnique({
    where: { id },
    include: {
      asset: true,
      members: { include: { user: true } },
      obligations: {
        include: {
          reminderPolicy: true,
          occurrences: { orderBy: { dueAt: "asc" } },
        },
      },
    },
  });
  if (!agreement) notFound();

  // Flatten occurrences with their obligation, sorted chronologically.
  const items = agreement.obligations
    .flatMap((ob) => ob.occurrences.map((oc) => ({ oc, ob })))
    .sort((a, b) => a.oc.dueAt.getTime() - b.oc.dueAt.getTime());

  // Group by month in the agreement timezone.
  const groups = new Map<string, typeof items>();
  for (const it of items) {
    const key = DateTime.fromJSDate(it.oc.dueAt, { zone: agreement.timezone }).toFormat("LLLL yyyy");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(it);
  }

  const now = Date.now();

  return (
    <div>
      <h1>{agreement.title}</h1>
      <p className="muted small">
        {agreement.asset.label} · {agreement.timezone} · {agreement.currency} ·{" "}
        <span className="chip grey">{agreement.status}</span>
      </p>

      {items.length === 0 && (
        <p className="notice">No occurrences yet. Activate the agreement to materialise them.</p>
      )}

      {[...groups.entries()].map(([month, list]) => (
        <section key={month}>
          <div className="month-header">{month}</div>
          {list.map(({ oc, ob }, i) => {
            const chip = statusChip(oc.status as OccStatus);
            const due = DateTime.fromJSDate(oc.dueAt, { zone: agreement.timezone });
            const isFirstFuture =
              i > 0 && list[i - 1].oc.dueAt.getTime() < now && oc.dueAt.getTime() >= now;
            return (
              <div key={oc.id}>
                {isFirstFuture && (
                  <div className="today-marker">
                    <span>TODAY</span>
                  </div>
                )}
                <a className="card" href={`/occurrences/${oc.id}`} style={{ display: "block" }}>
                  <div className="row">
                    <span className="title">{ob.title}</span>
                    <span className={`chip ${chip.cls}`}>{chip.label}</span>
                  </div>
                  <div className="meta">
                    {due.toFormat("ccc d LLL, HH:mm")} ·{" "}
                    {ob.kind === "PAYMENT"
                      ? (formatMoney(ob.amount ? Number(ob.amount) : null, agreement.currency) ?? "")
                      : ob.kind.toLowerCase()}
                  </div>
                </a>
              </div>
            );
          })}
        </section>
      ))}

      <h2>Agreement details</h2>
      <div className="card">
        <div className="small">
          <strong>Parties</strong>
          <ul className="plain">
            {agreement.members.map((m) => (
              <li key={m.id} className="muted">
                {m.role}: {m.user?.name ?? m.invitedEmail}
                {m.acceptedAt ? "" : " (invited)"}
              </li>
            ))}
          </ul>
        </div>
        <div className="small" style={{ marginTop: 8 }}>
          <strong>Obligations &amp; reminder policy</strong> (visible to both parties —
          transparency, spec §6.2)
          <ul className="plain">
            {agreement.obligations.map((ob) => (
              <li key={ob.id} className="muted">
                {ob.title} · {ob.recurrence || "one-off"} · policy: {ob.reminderPolicy.name}
              </li>
            ))}
          </ul>
        </div>
        {agreement.contractFileUrl && (
          <div className="small" style={{ marginTop: 8 }}>
            <a href={agreement.contractFileUrl}>Contract file</a>
          </div>
        )}
      </div>
    </div>
  );
}
