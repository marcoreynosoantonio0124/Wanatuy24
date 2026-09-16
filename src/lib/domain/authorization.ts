/**
 * Authorization — the security boundary (spec §7). Pure predicate functions so
 * they can be unit-tested exhaustively; the service layer calls them before any
 * mutation and every route re-checks. Roles are PER AGREEMENT, not per account
 * (spec §2).
 *
 * Rules of thumb (spec §7):
 *  - read an agreement  ⇔ you are an AgreementMember of it
 *  - submit a proof     ⇔ you hold the obligation's responsibleRole
 *  - confirm/reject      ⇔ you are LESSOR/COMANAGER, OR the counter-role when
 *                          responsibleRole = LESSOR (symmetry — spec 4.3)
 *  - waive              ⇔ LESSOR/COMANAGER
 */

export type MemberRole = "LESSOR" | "RENTER" | "COMANAGER";
export type ResponsibleRole = "RENTER" | "LESSOR";

export interface Membership {
  userId: string;
  role: MemberRole;
  acceptedAt: Date | null;
}

export interface AuthContext {
  userId: string;
  /** Memberships the user holds on the agreement in question. A user can hold
   *  more than one role on a self-agreement (spec A5). */
  memberships: Membership[];
}

function roles(ctx: AuthContext): Set<MemberRole> {
  return new Set(ctx.memberships.map((m) => m.role));
}

export function isMember(ctx: AuthContext): boolean {
  return ctx.memberships.length > 0;
}

export function isLessorSide(ctx: AuthContext): boolean {
  const r = roles(ctx);
  return r.has("LESSOR") || r.has("COMANAGER");
}

export function isRenterSide(ctx: AuthContext): boolean {
  return roles(ctx).has("RENTER");
}

/** Read access: any member (accepted or not — pre-acceptance read is allowed
 *  so an invited renter can see what's being asked, spec 4.2/6.4). */
export function canReadAgreement(ctx: AuthContext): boolean {
  return isMember(ctx);
}

/**
 * Submit a proof: the user must hold the side named by the obligation's
 * responsibleRole. For a RENTER obligation, a renter submits; for a LESSOR
 * obligation (e.g. "lessor services the AC"), the lessor submits.
 */
export function canSubmitProof(ctx: AuthContext, responsibleRole: ResponsibleRole): boolean {
  if (!isMember(ctx)) return false;
  return responsibleRole === "RENTER" ? isRenterSide(ctx) : isLessorSide(ctx);
}

/**
 * Review (confirm/reject) a proof: the CONFIRMER is the counter-party of the
 * responsible role. RENTER obligation → lessor confirms. LESSOR obligation →
 * renter confirms (symmetry, spec 4.3).
 */
export function canReviewProof(ctx: AuthContext, responsibleRole: ResponsibleRole): boolean {
  if (!isMember(ctx)) return false;
  return responsibleRole === "RENTER" ? isLessorSide(ctx) : isRenterSide(ctx);
}

/** Waive an occurrence: lessor side only. */
export function canWaive(ctx: AuthContext): boolean {
  return isLessorSide(ctx);
}

/** Manage the agreement (edit obligations, policy, activate): lessor side only. */
export function canManageAgreement(ctx: AuthContext): boolean {
  return isLessorSide(ctx);
}

export class ForbiddenError extends Error {
  constructor(action: string) {
    super(`Forbidden: not permitted to ${action}`);
    this.name = "ForbiddenError";
  }
}

/** Assert helper for the service layer. */
export function assert(condition: boolean, action: string): asserts condition {
  if (!condition) throw new ForbiddenError(action);
}
