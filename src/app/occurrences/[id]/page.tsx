import { DateTime } from "luxon";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/config";
import { statusChip, type OccStatus } from "@/lib/ui";

export const dynamic = "force-dynamic";

/**
 * Occurrence detail (spec §6.4) — the deep-link target for every notification.
 * Shows status, proofs, review notes, audit trail and the action relevant to
 * the viewer. Read-only signed-token access for unregistered renters is
 * build-order step 2 (auth); this page renders the shared record.
 */
export default async function OccurrenceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const occ = await prisma.occurrence.findUnique({
    where: { id },
    include: {
      obligation: { include: { agreement: { include: { asset: true } } } },
      proofs: { orderBy: { createdAt: "desc" }, include: { submittedBy: true, reviewedBy: true } },
    },
  });
  if (!occ) notFound();

  const agreement = occ.obligation.agreement;
  const chip = statusChip(occ.status as OccStatus);
  const due = DateTime.fromJSDate(occ.dueAt, { zone: agreement.timezone });

  const audit = await prisma.auditLog.findMany({
    where: { entityType: "Occurrence", entityId: occ.id },
    orderBy: { createdAt: "asc" },
    include: { actor: true },
  });

  return (
    <div>
      <p className="small">
        <a href={`/agreements/${agreement.id}/timeline`}>← {agreement.title}</a>
      </p>
      <div className="row">
        <h1 style={{ margin: 0 }}>{occ.obligation.title}</h1>
        <span className={`chip ${chip.cls}`}>{chip.label}</span>
      </div>
      <p className="muted small">
        {agreement.asset.label} · due {due.toFormat("ccc d LLL yyyy, HH:mm ZZZZ")}
        {occ.obligation.kind === "PAYMENT"
          ? ` · ${formatMoney(occ.obligation.amount ? Number(occ.obligation.amount) : null, agreement.currency)}`
          : ` · ${occ.obligation.kind.toLowerCase()}`}
      </p>

      <h2>Action</h2>
      <p className="notice small">
        The action button (Upload proof / Acknowledge / Confirm / Reject / Waive) is wired through
        the service layer in <code>src/lib/services/occurrenceService.ts</code>. UI form actions
        land with auth (build-order step 2); the authorization rules and state machine that guard
        them are implemented and tested.
      </p>

      <h2>Proofs</h2>
      {occ.proofs.length === 0 && <p className="muted small">No proof submitted yet.</p>}
      <ul className="plain">
        {occ.proofs.map((p) => (
          <li className="card" key={p.id}>
            <div className="row">
              <span className="title">{p.type}</span>
              <span
                className={`chip ${
                  p.reviewStatus === "ACCEPTED"
                    ? "green"
                    : p.reviewStatus === "REJECTED"
                      ? "red"
                      : "blue"
                }`}
              >
                {p.reviewStatus}
              </span>
            </div>
            <div className="meta">
              by {p.submittedBy.name ?? p.submittedBy.email}
              {p.referenceNo ? ` · ref ${p.referenceNo}` : ""}
              {p.amount ? ` · ${formatMoney(Number(p.amount), agreement.currency)}` : ""}
            </div>
            {p.note && <div className="small" style={{ marginTop: 4 }}>{p.note}</div>}
            {p.reviewNote && (
              <div className="small" style={{ marginTop: 4, color: "var(--red)" }}>
                Review note: {p.reviewNote}
              </div>
            )}
            {p.fileUrl && (
              <div className="small" style={{ marginTop: 4 }}>
                <a href={p.fileUrl}>View file</a> (signed URL)
              </div>
            )}
          </li>
        ))}
      </ul>

      <h2>Audit trail</h2>
      <ul className="plain small">
        {audit.length === 0 && <li className="muted">No events recorded.</li>}
        {audit.map((a) => (
          <li key={a.id} className="muted">
            {DateTime.fromJSDate(a.createdAt).toFormat("d LLL HH:mm")} — {a.action}
            {a.actor ? ` by ${a.actor.name ?? a.actor.email}` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
