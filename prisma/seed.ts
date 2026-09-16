import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { DEFAULT_REMINDER_STEPS } from "../src/lib/domain/reminders";
import { rruleMonthlyOnDay, RRULE_ONE_OFF } from "../src/lib/domain/occurrences";

/**
 * Seed (spec §8): one lessor, three assets (house, car, self-mortgage), two
 * renters, and occurrences spanning past/present/future in mixed statuses so
 * the dashboard, timeline and map look real on first run.
 *
 * Run: npm run seed  (requires DATABASE_URL and an applied migration).
 */

const prisma = new PrismaClient();
const TZ = "Asia/Dubai";
const CUR = "AED";

async function main() {
  // Idempotent-ish: wipe app data (dev only).
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.proof.deleteMany(),
    prisma.occurrence.deleteMany(),
    prisma.obligation.deleteMany(),
    prisma.agreementMember.deleteMany(),
    prisma.agreement.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.reminderPolicy.deleteMany(),
    prisma.userNotificationPrefs.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const lessor = await prisma.user.create({
    data: { email: "owner@duemate.test", name: "Omar (Lessor)", timezone: TZ },
  });
  const renterA = await prisma.user.create({
    data: { email: "sara@duemate.test", name: "Sara", timezone: TZ },
  });
  const renterB = await prisma.user.create({
    data: { email: "khalid@duemate.test", name: "Khalid", timezone: TZ },
  });

  const policy = await prisma.reminderPolicy.create({
    data: {
      ownerId: lessor.id,
      name: "Default escalation",
      isDefault: true,
      steps: DEFAULT_REMINDER_STEPS as unknown as object,
    },
  });

  // ── Assets ────────────────────────────────────────────────────────────────
  const house = await prisma.asset.create({
    data: {
      ownerId: lessor.id,
      type: "UNIT",
      label: "Marina Apartment 1204",
      addressLine: "Marina Gate 1",
      city: "Dubai",
      country: "AE",
      lat: 25.0805,
      lng: 55.1403,
      metadata: { unitNo: "1204" },
    },
  });
  const car = await prisma.asset.create({
    data: {
      ownerId: lessor.id,
      type: "CAR",
      label: "Toyota Corolla — D 12345",
      city: "Dubai",
      country: "AE",
      lat: 25.2048,
      lng: 55.2708,
      metadata: { plate: "D 12345" },
    },
  });
  const mortgage = await prisma.asset.create({
    data: {
      ownerId: lessor.id,
      type: "PERSONAL",
      label: "Home mortgage (self)",
      city: "Dubai",
      country: "AE",
      metadata: { note: "self-agreement, spec A5" },
    },
  });

  // ── Agreements ──────────────────────────────────────────────────────────────
  const rent = await prisma.agreement.create({
    data: {
      assetId: house.id,
      lessorId: lessor.id,
      timezone: TZ,
      title: "Apartment 1204 — 12-month lease",
      startDate: DateTime.now().minus({ months: 3 }).startOf("month").toJSDate(),
      status: "ACTIVE",
      currency: CUR,
      members: {
        create: [
          { invitedEmail: lessor.email, userId: lessor.id, role: "LESSOR", acceptedAt: new Date() },
          { invitedEmail: renterA.email, userId: renterA.id, role: "RENTER", acceptedAt: new Date() },
        ],
      },
    },
  });

  const carRental = await prisma.agreement.create({
    data: {
      assetId: car.id,
      lessorId: lessor.id,
      timezone: TZ,
      title: "Corolla — weekly rental",
      startDate: DateTime.now().minus({ weeks: 5 }).startOf("day").toJSDate(),
      status: "ACTIVE",
      currency: CUR,
      autoConfirmProof: false,
      members: {
        create: [
          { invitedEmail: lessor.email, userId: lessor.id, role: "LESSOR", acceptedAt: new Date() },
          { invitedEmail: renterB.email, userId: renterB.id, role: "RENTER", acceptedAt: new Date() },
        ],
      },
    },
  });

  const selfMortgage = await prisma.agreement.create({
    data: {
      assetId: mortgage.id,
      lessorId: lessor.id,
      timezone: TZ,
      title: "Mortgage — monthly instalment",
      startDate: DateTime.now().minus({ months: 6 }).startOf("month").toJSDate(),
      status: "ACTIVE",
      currency: CUR,
      autoConfirmProof: true, // self-agreement: owner confirms own payment (A5)
      members: {
        create: [
          // Self: lessor holds both roles (spec A5).
          { invitedEmail: lessor.email, userId: lessor.id, role: "LESSOR", acceptedAt: new Date() },
          { invitedEmail: lessor.email + "#self", userId: lessor.id, role: "RENTER", acceptedAt: new Date() },
        ],
      },
    },
  });

  // ── Obligations ─────────────────────────────────────────────────────────────
  const rentObligation = await prisma.obligation.create({
    data: {
      agreementId: rent.id,
      kind: "PAYMENT",
      title: "Monthly rent",
      amount: "5000.00",
      recurrence: rruleMonthlyOnDay(1),
      dueTimeLocal: "09:00",
      graceDays: 3,
      reminderPolicyId: policy.id,
      responsibleRole: "RENTER",
    },
  });

  const depositObligation = await prisma.obligation.create({
    data: {
      agreementId: rent.id,
      kind: "PAYMENT",
      title: "Security deposit",
      amount: "5000.00",
      recurrence: RRULE_ONE_OFF,
      dueTimeLocal: "09:00",
      reminderPolicyId: policy.id,
      responsibleRole: "RENTER",
    },
  });

  const carReturn = await prisma.obligation.create({
    data: {
      agreementId: carRental.id,
      kind: "TASK",
      title: "Return vehicle with full tank",
      recurrence: RRULE_ONE_OFF,
      dueTimeLocal: "18:00",
      reminderPolicyId: policy.id,
      responsibleRole: "RENTER",
    },
  });

  const mortgageObligation = await prisma.obligation.create({
    data: {
      agreementId: selfMortgage.id,
      kind: "PAYMENT",
      title: "Mortgage instalment",
      amount: "8200.00",
      recurrence: rruleMonthlyOnDay(5),
      dueTimeLocal: "09:00",
      graceDays: 0,
      reminderPolicyId: policy.id,
      responsibleRole: "LESSOR",
    },
  });

  // ── Mixed-status occurrences (past / present / future) ───────────────────────
  const now = DateTime.now();
  const mk = (
    obligationId: string,
    monthsFromNow: number,
    day: number,
    status: "CONFIRMED" | "DUE" | "OVERDUE" | "UPCOMING" | "SUBMITTED",
    amount?: string
  ) => {
    const due = now.plus({ months: monthsFromNow }).set({ day, hour: 9, minute: 0, second: 0, millisecond: 0 });
    return prisma.occurrence.create({
      data: {
        obligationId,
        dueAt: due.toUTC().toJSDate(),
        periodStart: due.startOf("day").toUTC().toJSDate(),
        periodEnd: due.plus({ months: 1 }).startOf("day").toUTC().toJSDate(),
        status,
        confirmedAt: status === "CONFIRMED" ? due.plus({ days: 1 }).toJSDate() : null,
        confirmedById: status === "CONFIRMED" ? lessor.id : null,
      },
    });
  };

  await mk(rentObligation.id, -3, 1, "CONFIRMED", "5000.00");
  await mk(rentObligation.id, -2, 1, "CONFIRMED", "5000.00");
  await mk(rentObligation.id, -1, 1, "OVERDUE", "5000.00");
  const currentRent = await mk(rentObligation.id, 0, 1, "SUBMITTED", "5000.00");
  await mk(rentObligation.id, 1, 1, "UPCOMING", "5000.00");
  await mk(rentObligation.id, 2, 1, "UPCOMING", "5000.00");

  await prisma.occurrence.create({
    data: {
      obligationId: depositObligation.id,
      dueAt: now.minus({ months: 3 }).set({ day: 1, hour: 9 }).toUTC().toJSDate(),
      periodStart: now.minus({ months: 3 }).set({ day: 1 }).startOf("day").toUTC().toJSDate(),
      periodEnd: now.minus({ months: 3 }).set({ day: 1, hour: 9 }).toUTC().toJSDate(),
      status: "CONFIRMED",
      confirmedById: lessor.id,
      confirmedAt: now.minus({ months: 3 }).toJSDate(),
    },
  });

  await mk(mortgageObligation.id, -6, 5, "CONFIRMED", "8200.00");
  await mk(mortgageObligation.id, 0, 5, "DUE", "8200.00");
  await mk(mortgageObligation.id, 1, 5, "UPCOMING", "8200.00");

  // A submitted proof awaiting review on the current rent.
  const proof = await prisma.proof.create({
    data: {
      occurrenceId: currentRent.id,
      submittedById: renterA.id,
      type: "RECEIPT",
      referenceNo: "TRX-88421",
      amount: "5000.00",
      paidAt: now.toJSDate(),
      note: "Bank transfer receipt attached",
      reviewStatus: "PENDING",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: renterA.id,
      entityType: "Occurrence",
      entityId: currentRent.id,
      action: "PROOF_SUBMITTED",
      diff: { proofId: proof.id, from: "DUE", to: "SUBMITTED" },
    },
  });

  console.log("Seed complete:");
  console.log(`  users: ${lessor.email}, ${renterA.email}, ${renterB.email}`);
  console.log(`  assets: 3 (unit, car, self-mortgage)`);
  console.log(`  agreements: 3, obligations: 4, occurrences with mixed statuses`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
