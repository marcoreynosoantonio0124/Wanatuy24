import type { PrismaClient, Prisma } from "@prisma/client";
import type { AuthContext } from "@/lib/domain/authorization";

/**
 * Load the AuthContext for a user on a given agreement. Roles are per-agreement
 * (spec §2), so authorization always starts from the membership rows.
 */
export async function loadAuthContext(
  db: PrismaClient | Prisma.TransactionClient,
  agreementId: string,
  userId: string
): Promise<AuthContext> {
  const memberships = await db.agreementMember.findMany({
    where: { agreementId, userId },
    select: { userId: true, role: true, acceptedAt: true },
  });
  return {
    userId,
    memberships: memberships.map((m) => ({
      userId: m.userId!,
      role: m.role,
      acceptedAt: m.acceptedAt,
    })),
  };
}
