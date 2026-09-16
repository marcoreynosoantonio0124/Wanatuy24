import type { ProofType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAudit } from "./audit";
import { loadAuthContext } from "./membership";
import {
  assert,
  canReviewProof,
  canSubmitProof,
  canWaive,
} from "@/lib/domain/authorization";
import { transition } from "@/lib/domain/stateMachine";

/**
 * Occurrence services (spec §7). All business logic lives here, not in route
 * handlers or components. Each mutation: (1) loads the actor's per-agreement
 * roles, (2) enforces authorization, (3) applies the state machine with
 * optimistic locking, (4) writes an AuditLog row — atomically.
 */

class ConflictError extends Error {
  constructor() {
    super("Occurrence was modified concurrently; retry");
    this.name = "ConflictError";
  }
}

async function loadOccurrenceContext(occurrenceId: string, userId: string) {
  const occurrence = await prisma.occurrence.findUniqueOrThrow({
    where: { id: occurrenceId },
    include: { obligation: { include: { agreement: true } } },
  });
  const agreementId = occurrence.obligation.agreementId;
  const auth = await loadAuthContext(prisma, agreementId, userId);
  return { occurrence, agreementId, auth };
}

export interface SubmitProofInput {
  occurrenceId: string;
  userId: string;
  type: ProofType;
  fileUrl?: string;
  referenceNo?: string;
  amount?: string; // Decimal as string
  paidAt?: Date;
  note?: string;
}

/** Renter (or responsible party) submits proof. Cancels scheduled reminders. */
export async function submitProof(input: SubmitProofInput) {
  const { occurrence, auth } = await loadOccurrenceContext(input.occurrenceId, input.userId);
  const responsibleRole = occurrence.obligation.responsibleRole;
  assert(canSubmitProof(auth, responsibleRole), "submit proof for this occurrence");

  const nextStatus = transition(occurrence.status, { type: "SUBMIT_PROOF" });

  return prisma.$transaction(async (tx) => {
    // Optimistic lock on version (spec §8).
    const updated = await tx.occurrence.updateMany({
      where: { id: occurrence.id, version: occurrence.version },
      data: { status: nextStatus, version: { increment: 1 } },
    });
    if (updated.count === 0) throw new ConflictError();

    const proof = await tx.proof.create({
      data: {
        occurrenceId: occurrence.id,
        submittedById: input.userId,
        type: input.type,
        fileUrl: input.fileUrl,
        referenceNo: input.referenceNo,
        amount: input.amount ?? undefined,
        paidAt: input.paidAt,
        note: input.note,
        reviewStatus: "PENDING",
      },
    });

    // Cancel this occurrence's still-scheduled reminders (spec §4.3).
    await tx.notification.updateMany({
      where: { occurrenceId: occurrence.id, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });

    await writeAudit(tx, {
      actorId: input.userId,
      entityType: "Occurrence",
      entityId: occurrence.id,
      action: "PROOF_SUBMITTED",
      diff: { from: occurrence.status, to: nextStatus, proofId: proof.id },
    });

    return { proof, status: nextStatus };
  });
}

export interface ReviewProofInput {
  proofId: string;
  userId: string;
  decision: "ACCEPT" | "REJECT";
  reviewNote?: string;
  pastGrace?: boolean; // caller computes from the clock for a REJECT
}

/** Lessor (or counter-party) accepts or rejects a submitted proof. */
export async function reviewProof(input: ReviewProofInput) {
  const proof = await prisma.proof.findUniqueOrThrow({
    where: { id: input.proofId },
    include: { occurrence: { include: { obligation: true } } },
  });
  const occurrence = proof.occurrence;
  const responsibleRole = occurrence.obligation.responsibleRole;
  const auth = await loadAuthContext(prisma, occurrence.obligation.agreementId, input.userId);
  assert(canReviewProof(auth, responsibleRole), "review this proof");

  if (input.decision === "REJECT" && !input.reviewNote) {
    throw new Error("A rejection requires a note (spec §4.4)");
  }

  const nextStatus =
    input.decision === "ACCEPT"
      ? transition(occurrence.status, { type: "CONFIRM" })
      : transition(occurrence.status, { type: "REJECT" }, { pastGrace: input.pastGrace });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.occurrence.updateMany({
      where: { id: occurrence.id, version: occurrence.version },
      data: {
        status: nextStatus,
        confirmedAt: input.decision === "ACCEPT" ? new Date() : null,
        confirmedById: input.decision === "ACCEPT" ? input.userId : null,
        version: { increment: 1 },
      },
    });
    if (updated.count === 0) throw new ConflictError();

    await tx.proof.update({
      where: { id: proof.id },
      data: {
        reviewStatus: input.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
        reviewNote: input.reviewNote,
        reviewedById: input.userId,
        reviewedAt: new Date(),
      },
    });

    await writeAudit(tx, {
      actorId: input.userId,
      entityType: "Occurrence",
      entityId: occurrence.id,
      action: input.decision === "ACCEPT" ? "PROOF_ACCEPTED" : "PROOF_REJECTED",
      diff: { from: occurrence.status, to: nextStatus, proofId: proof.id, note: input.reviewNote },
    });

    return { status: nextStatus };
  });
}

export interface WaiveInput {
  occurrenceId: string;
  userId: string;
  reason: string;
}

/** Lessor waives an occurrence (any state except CONFIRMED). */
export async function waiveOccurrence(input: WaiveInput) {
  const { occurrence, auth } = await loadOccurrenceContext(input.occurrenceId, input.userId);
  assert(canWaive(auth), "waive this occurrence");
  const nextStatus = transition(occurrence.status, { type: "WAIVE", reason: input.reason });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.occurrence.updateMany({
      where: { id: occurrence.id, version: occurrence.version },
      data: { status: nextStatus, waivedReason: input.reason, version: { increment: 1 } },
    });
    if (updated.count === 0) throw new ConflictError();

    await tx.notification.updateMany({
      where: { occurrenceId: occurrence.id, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });

    await writeAudit(tx, {
      actorId: input.userId,
      entityType: "Occurrence",
      entityId: occurrence.id,
      action: "WAIVED",
      diff: { from: occurrence.status, to: nextStatus, reason: input.reason },
    });

    return { status: nextStatus };
  });
}
