import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Every state change writes an AuditLog row — this is the transparency feature
 * (spec §3 rule 4). Both parties can see who did what, when. Always call this
 * inside the same transaction as the mutation.
 */
export async function writeAudit(
  tx: Prisma.TransactionClient | PrismaClient,
  entry: {
    actorId?: string | null;
    entityType: string;
    entityId: string;
    action: string;
    diff?: Prisma.InputJsonValue;
  }
) {
  return tx.auditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      diff: entry.diff ?? {},
    },
  });
}
