import { DateTime } from "luxon";

/**
 * Reminder policy: bounded escalation, not infinite nagging (spec A6, §5.3).
 * A policy's `steps` is an ordered array relative to the occurrence dueAt.
 * This module turns a policy + occurrence into a set of scheduled notification
 * jobs, respecting quiet hours (§5.4). Pure — the queue adapter enqueues the
 * output.
 */

export type Channel = "EMAIL" | "SMS" | "IN_APP";
export type StepRecipient = "RENTER" | "LESSOR";

export interface ReminderStep {
  offsetDays: number; // relative to dueAt
  channels: Channel[];
  template: string;
  to?: StepRecipient; // defaults to the responsible party (renter side)
}

export const MAX_STEPS = 10;
export const MIN_STEP_GAP_DAYS = 1;

/** Default policy (spec §5.3). */
export const DEFAULT_REMINDER_STEPS: ReminderStep[] = [
  { offsetDays: -3, channels: ["EMAIL", "IN_APP"], template: "reminder.upcoming" },
  { offsetDays: 0, channels: ["EMAIL", "IN_APP"], template: "reminder.due" },
  { offsetDays: 2, channels: ["EMAIL", "IN_APP", "SMS"], template: "reminder.overdue" },
  { offsetDays: 5, channels: ["EMAIL", "IN_APP", "SMS"], template: "reminder.overdue" },
  { offsetDays: 7, channels: ["EMAIL", "IN_APP"], template: "escalation.lessor", to: "LESSOR" },
];

export class InvalidPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPolicyError";
  }
}

/**
 * Validate a custom policy: max 10 steps, minimum 1-day gap so nobody builds
 * an hourly spam cannon (spec §5.3).
 */
export function validatePolicy(steps: ReminderStep[]): void {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new InvalidPolicyError("A reminder policy needs at least one step");
  }
  if (steps.length > MAX_STEPS) {
    throw new InvalidPolicyError(`A reminder policy may have at most ${MAX_STEPS} steps`);
  }
  const sorted = [...steps].sort((a, b) => a.offsetDays - b.offsetDays);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].offsetDays - sorted[i - 1].offsetDays < MIN_STEP_GAP_DAYS) {
      throw new InvalidPolicyError(
        `Reminder steps must be at least ${MIN_STEP_GAP_DAYS} day apart`
      );
    }
  }
  for (const step of steps) {
    if (!step.channels || step.channels.length === 0) {
      throw new InvalidPolicyError("Each reminder step needs at least one channel");
    }
    if (!step.template) {
      throw new InvalidPolicyError("Each reminder step needs a template key");
    }
  }
}

export interface QuietHours {
  /** "HH:mm" in the recipient's timezone. Null/absent = no quiet hours. */
  start?: string | null;
  end?: string | null;
  timezone: string;
}

export interface ScheduledReminder {
  runAt: Date; // UTC instant the job should fire
  channels: Channel[];
  template: string;
  to: StepRecipient;
  stepIndex: number;
}

export interface ScheduleParams {
  dueAt: Date;
  timezone: string; // agreement TZ
  dueTimeLocal: string; // "HH:mm"
  steps: ReminderStep[];
  quietHours?: QuietHours;
  /**
   * Only schedule steps at or after this index — used when a proof is rejected
   * and reminders resume "from the current step, not the beginning" (spec 4.3).
   */
  fromStepIndex?: number;
}

function parseHm(hm: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) throw new Error(`Invalid time "${hm}", expected "HH:mm"`);
  return { hour: parseInt(m[1], 10), minute: parseInt(m[2], 10) };
}

/**
 * If `instant` falls inside quiet hours, shift it forward to the next allowed
 * moment (the quiet-hours end). Handles windows that cross midnight
 * (e.g. 22:00 → 07:00).
 */
export function applyQuietHours(instant: Date, quiet?: QuietHours): Date {
  if (!quiet || !quiet.start || !quiet.end) return instant;
  const zone = quiet.timezone;
  const local = DateTime.fromJSDate(instant, { zone });
  const { hour: sh, minute: sm } = parseHm(quiet.start);
  const { hour: eh, minute: em } = parseHm(quiet.end);

  const startToday = local.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
  let endBoundary = local.set({ hour: eh, minute: em, second: 0, millisecond: 0 });

  const crossesMidnight = sh * 60 + sm > eh * 60 + em;

  if (crossesMidnight) {
    // Quiet window is [start today .. end tomorrow] ∪ [start yesterday .. end today].
    const inLateNight = local >= startToday; // after start, before midnight
    const inEarlyMorning = local < endBoundary; // before end, after midnight
    if (inLateNight) {
      return endBoundary.plus({ days: 1 }).toUTC().toJSDate();
    }
    if (inEarlyMorning) {
      return endBoundary.toUTC().toJSDate();
    }
    return instant;
  } else {
    // Simple same-day window [start .. end].
    if (local >= startToday && local < endBoundary) {
      return endBoundary.toUTC().toJSDate();
    }
    return instant;
  }
}

/**
 * Expand a policy into concrete scheduled reminders for one occurrence.
 * runAt = dueAt + offsetDays, at dueTimeLocal in the agreement TZ, then shifted
 * out of quiet hours.
 */
export function scheduleReminders(params: ScheduleParams): ScheduledReminder[] {
  const { dueAt, timezone, dueTimeLocal, steps, quietHours, fromStepIndex = 0 } = params;
  validatePolicy(steps);
  const { hour, minute } = parseHm(dueTimeLocal);

  const dueLocal = DateTime.fromJSDate(dueAt, { zone: timezone });

  const out: ScheduledReminder[] = [];
  steps.forEach((step, index) => {
    if (index < fromStepIndex) return;
    // Anchor to the local calendar date offset, then set the due time so DST
    // shifts keep the reminder at the intended wall-clock time.
    const runLocal = dueLocal
      .plus({ days: step.offsetDays })
      .set({ hour, minute, second: 0, millisecond: 0 });
    const runAt = applyQuietHours(runLocal.toUTC().toJSDate(), quietHours);
    out.push({
      runAt,
      channels: step.channels,
      template: step.template,
      to: step.to ?? "RENTER",
      stepIndex: index,
    });
  });

  return out;
}

/** The offsetDays of the final step; after it the occurrence goes OVERDUE_ESCALATED. */
export function finalStepOffsetDays(steps: ReminderStep[]): number {
  return Math.max(...steps.map((s) => s.offsetDays));
}
