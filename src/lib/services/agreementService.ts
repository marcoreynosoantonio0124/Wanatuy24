import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { writeAudit } from "./audit";
import { loadAuthContext } from "./membership";
import { assert, canManageAgreement } from "@/lib/domain/authorization";
import { generateOccurrences } from "@/lib/domain/occurrences";
import { scheduleReminders, type ReminderStep } from "@/lib/domain/reminders";

/**
 * Agreement lifecycle services. Activation materialises the next 12 months of
 * occurrences for every active obligation and enqueues the reminder jobs
 * (spec §3 rule 1, §4.1, §5.4). A nightly job re-runs materialisation with a
 * rolling window to top up.
 */

const HORIZON_MONTHS = 12;

export async function materialiseObligation(obligationId: string, windowStart = new Date()) {
  const obligation = await prisma.obligation.findUniqueOrThrow({
    where: { id: obligationId },
    include: { agreement: true, reminderPolicy: true },
  });
  if (!obligation.active) return { created: 0 };

  const { agreement } = obligation;
  const windowEnd = DateTime.fromJSDate(windowStart).plus({ months: HORIZON_MONTHS }).toJSDate();

  const generated = generateOccurrences({
    recurrence: obligation.recurrence,
    timezone: agreement.timezone,
    dueTimeLocal: obligation.dueTimeLocal,
    startDate: agreement.startDate,
    endDate: agreement.endDate,
    windowStart,
    windowEnd,
  });

  const steps = obligation.reminderPolicy.steps as unknown as ReminderStep[];
  let created = 0;

  for (const g of generated) {
    // Idempotent: unique (obligationId, dueAt) — skip if it already exists.
    const existing = await prisma.occurrence.findUnique({
      where: { obligationId_dueAt: { obligationId: obligation.id, dueAt: g.dueAt } },
    });
    if (existing) continue;

    await prisma.$transaction(async (tx) => {
      const occ = await tx.occurrence.create({
        data: {
          obligationId: obligation.id,
          dueAt: g.dueAt,
          periodStart: g.periodStart,
          periodEnd: g.periodEnd,
          status: "UPCOMING",
        },
      });

      const reminders = scheduleReminders({
        dueAt: g.dueAt,
        timezone: agreement.timezone,
        dueTimeLocal: obligation.dueTimeLocal,
        steps,
      });

      for (const r of reminders) {
        for (const channel of r.channels) {
          await tx.notification.create({
            data: {
              occurrenceId: occ.id,
              channel,
              templateKey: r.template,
              scheduledFor: r.runAt,
              status: "SCHEDULED",
            },
          });
        }
      }
      created++;
    });
  }

  return { created };
}

/** Activate an agreement: DRAFT → ACTIVE, materialise occurrences, send invites. */
export async function activateAgreement(agreementId: string, userId: string) {
  const auth = await loadAuthContext(prisma, agreementId, userId);
  assert(canManageAgreement(auth), "activate this agreement");

  const agreement = await prisma.agreement.findUniqueOrThrow({
    where: { id: agreementId },
    include: { obligations: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.agreement.update({ where: { id: agreementId }, data: { status: "ACTIVE" } });
    await writeAudit(tx, {
      actorId: userId,
      entityType: "Agreement",
      entityId: agreementId,
      action: "ACTIVATED",
      diff: { status: "ACTIVE" },
    });
  });

  let total = 0;
  for (const ob of agreement.obligations) {
    const { created } = await materialiseObligation(ob.id);
    total += created;
  }

  // NOTE: renter invite emails (invite.renter template) are enqueued here in
  // production via the notification pipeline; wired once the queue worker lands.
  return { occurrencesCreated: total };
}
