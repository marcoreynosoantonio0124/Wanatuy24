import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  scheduleReminders,
  applyQuietHours,
  validatePolicy,
  DEFAULT_REMINDER_STEPS,
  finalStepOffsetDays,
  InvalidPolicyError,
  type ReminderStep,
} from "@/lib/domain/reminders";

const zone = "Asia/Dubai";
function dueAt(y: number, m: number, d: number, h = 9): Date {
  return DateTime.fromObject({ year: y, month: m, day: d, hour: h }, { zone }).toJSDate();
}

describe("policy validation (spec §5.3)", () => {
  it("accepts the default policy", () => {
    expect(() => validatePolicy(DEFAULT_REMINDER_STEPS)).not.toThrow();
  });

  it("rejects > 10 steps", () => {
    const steps: ReminderStep[] = Array.from({ length: 11 }, (_, i) => ({
      offsetDays: i * 2,
      channels: ["EMAIL"],
      template: "reminder.due",
    }));
    expect(() => validatePolicy(steps)).toThrow(InvalidPolicyError);
  });

  it("rejects steps closer than 1 day (no hourly spam cannon)", () => {
    const steps: ReminderStep[] = [
      { offsetDays: 0, channels: ["EMAIL"], template: "a" },
      { offsetDays: 0, channels: ["EMAIL"], template: "b" },
    ];
    expect(() => validatePolicy(steps)).toThrow(InvalidPolicyError);
  });

  it("rejects a step with no channels", () => {
    expect(() =>
      validatePolicy([{ offsetDays: 0, channels: [], template: "a" }])
    ).toThrow(InvalidPolicyError);
  });
});

describe("scheduleReminders (spec §5.4)", () => {
  it("expands the default policy relative to dueAt at the local due time", () => {
    const due = dueAt(2024, 5, 10); // 2024-05-10 09:00 Dubai
    const scheduled = scheduleReminders({
      dueAt: due,
      timezone: zone,
      dueTimeLocal: "09:00",
      steps: DEFAULT_REMINDER_STEPS,
    });
    expect(scheduled).toHaveLength(5);

    const asLocal = scheduled.map((s) => DateTime.fromJSDate(s.runAt, { zone }).toISODate());
    expect(asLocal).toEqual([
      "2024-05-07", // -3
      "2024-05-10", // 0
      "2024-05-12", // +2
      "2024-05-15", // +5
      "2024-05-17", // +7
    ]);
    // Escalation step targets the lessor.
    expect(scheduled[4].to).toBe("LESSOR");
    expect(scheduled[0].to).toBe("RENTER");
  });

  it("resumes from a given step index after a rejection", () => {
    const scheduled = scheduleReminders({
      dueAt: dueAt(2024, 5, 10),
      timezone: zone,
      dueTimeLocal: "09:00",
      steps: DEFAULT_REMINDER_STEPS,
      fromStepIndex: 2,
    });
    expect(scheduled).toHaveLength(3);
    expect(scheduled[0].stepIndex).toBe(2);
  });

  it("final step offset drives OVERDUE_ESCALATED timing", () => {
    expect(finalStepOffsetDays(DEFAULT_REMINDER_STEPS)).toBe(7);
  });
});

describe("quiet hours (spec §5.4)", () => {
  it("shifts a same-day quiet window forward to its end", () => {
    // Quiet 09:00–12:00 Dubai; a 10:00 reminder should move to 12:00.
    const instant = DateTime.fromObject({ year: 2024, month: 5, day: 10, hour: 10 }, { zone }).toJSDate();
    const shifted = applyQuietHours(instant, { start: "09:00", end: "12:00", timezone: zone });
    const local = DateTime.fromJSDate(shifted, { zone });
    expect(local.hour).toBe(12);
    expect(local.minute).toBe(0);
  });

  it("leaves a reminder outside the window untouched", () => {
    const instant = DateTime.fromObject({ year: 2024, month: 5, day: 10, hour: 14 }, { zone }).toJSDate();
    const shifted = applyQuietHours(instant, { start: "09:00", end: "12:00", timezone: zone });
    expect(shifted.getTime()).toBe(instant.getTime());
  });

  it("handles a window crossing midnight (22:00–07:00): late night -> next 07:00", () => {
    const instant = DateTime.fromObject({ year: 2024, month: 5, day: 10, hour: 23 }, { zone }).toJSDate();
    const shifted = applyQuietHours(instant, { start: "22:00", end: "07:00", timezone: zone });
    const local = DateTime.fromJSDate(shifted, { zone });
    expect(local.day).toBe(11);
    expect(local.hour).toBe(7);
  });

  it("handles a window crossing midnight: early morning -> same-day 07:00", () => {
    const instant = DateTime.fromObject({ year: 2024, month: 5, day: 10, hour: 3 }, { zone }).toJSDate();
    const shifted = applyQuietHours(instant, { start: "22:00", end: "07:00", timezone: zone });
    const local = DateTime.fromJSDate(shifted, { zone });
    expect(local.day).toBe(10);
    expect(local.hour).toBe(7);
  });

  it("no-ops when quiet hours are absent", () => {
    const instant = new Date();
    expect(applyQuietHours(instant, undefined).getTime()).toBe(instant.getTime());
    expect(
      applyQuietHours(instant, { start: null, end: null, timezone: zone }).getTime()
    ).toBe(instant.getTime());
  });
});
