/**
 * Occurrence state machine (spec §4.3). Pure transition logic — the service
 * layer applies these against Prisma rows with optimistic locking (§8).
 *
 *   UPCOMING → DUE → OVERDUE → OVERDUE_ESCALATED   (time-driven)
 *   any remind-able state → SUBMITTED               (proof submitted)
 *   SUBMITTED → CONFIRMED                            (lessor accepts / auto-confirm)
 *   SUBMITTED → REJECTED → DUE/OVERDUE               (lessor rejects)
 *   any state → WAIVED                               (lessor waives)
 */

export type OccurrenceStatus =
  | "UPCOMING"
  | "DUE"
  | "SUBMITTED"
  | "CONFIRMED"
  | "REJECTED"
  | "OVERDUE"
  | "OVERDUE_ESCALATED"
  | "WAIVED";

export type OccurrenceEvent =
  | { type: "REACH_DUE" }
  | { type: "REACH_OVERDUE" }
  | { type: "EXHAUST_POLICY" }
  | { type: "SUBMIT_PROOF" }
  | { type: "CONFIRM" }
  | { type: "REJECT" }
  | { type: "WAIVE"; reason?: string };

/** States from which a proof may still be submitted. */
export const REMINDABLE_STATES: OccurrenceStatus[] = [
  "UPCOMING",
  "DUE",
  "OVERDUE",
  "OVERDUE_ESCALATED",
  "REJECTED",
];

/** Terminal states — no further automated reminders. */
export const TERMINAL_STATES: OccurrenceStatus[] = ["CONFIRMED", "WAIVED"];

export function isRemindable(status: OccurrenceStatus): boolean {
  return REMINDABLE_STATES.includes(status);
}

export function isTerminal(status: OccurrenceStatus): boolean {
  return TERMINAL_STATES.includes(status);
}

export class InvalidTransitionError extends Error {
  constructor(from: OccurrenceStatus, event: OccurrenceEvent["type"]) {
    super(`Invalid transition: cannot ${event} from ${from}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Compute the next status for an event, or throw InvalidTransitionError.
 * When rejecting, the caller decides DUE vs OVERDUE based on the clock; we
 * default to DUE and let the scheduler re-evaluate (spec 4.3: "re-schedule
 * reminders from the current step, not the beginning").
 */
export function transition(
  from: OccurrenceStatus,
  event: OccurrenceEvent,
  ctx?: { pastGrace?: boolean }
): OccurrenceStatus {
  switch (event.type) {
    case "REACH_DUE":
      if (from === "UPCOMING") return "DUE";
      throw new InvalidTransitionError(from, event.type);

    case "REACH_OVERDUE":
      if (from === "DUE" || from === "REJECTED") return "OVERDUE";
      throw new InvalidTransitionError(from, event.type);

    case "EXHAUST_POLICY":
      if (from === "OVERDUE") return "OVERDUE_ESCALATED";
      throw new InvalidTransitionError(from, event.type);

    case "SUBMIT_PROOF":
      if (isRemindable(from)) return "SUBMITTED";
      throw new InvalidTransitionError(from, event.type);

    case "CONFIRM":
      if (from === "SUBMITTED") return "CONFIRMED";
      throw new InvalidTransitionError(from, event.type);

    case "REJECT":
      if (from === "SUBMITTED") return ctx?.pastGrace ? "OVERDUE" : "DUE";
      throw new InvalidTransitionError(from, event.type);

    case "WAIVE":
      if (from === "CONFIRMED") throw new InvalidTransitionError(from, event.type);
      return "WAIVED";
  }
}

export function canTransition(from: OccurrenceStatus, event: OccurrenceEvent): boolean {
  try {
    transition(from, event);
    return true;
  } catch {
    return false;
  }
}
