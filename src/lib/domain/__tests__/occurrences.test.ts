import { describe, it, expect } from "vitest";
import { DateTime } from "luxon";
import {
  generateOccurrences,
  parseRRule,
  rruleMonthlyOnDay,
  rruleWeekly,
} from "@/lib/domain/occurrences";

/** Build an instant from a local wall-clock date in a zone. */
function local(zone: string, y: number, m: number, d: number, h = 0, min = 0): Date {
  return DateTime.fromObject(
    { year: y, month: m, day: d, hour: h, minute: min },
    { zone }
  ).toJSDate();
}

/** Local calendar representation of an occurrence's dueAt in a zone. */
function dueLocal(date: Date, zone: string) {
  const dt = DateTime.fromJSDate(date, { zone });
  return { y: dt.year, m: dt.month, d: dt.day, h: dt.hour, min: dt.minute };
}

describe("parseRRule", () => {
  it("parses a monthly-by-day rule", () => {
    const p = parseRRule("FREQ=MONTHLY;BYMONTHDAY=1");
    expect(p.freq).toBe("MONTHLY");
    expect(p.interval).toBe(1);
    expect(p.byMonthDay).toEqual([1]);
  });

  it("parses weekly BYDAY and INTERVAL", () => {
    const p = parseRRule("FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH");
    expect(p.interval).toBe(2);
    expect(p.byDay).toEqual([1, 4]);
  });

  it("rejects unsupported FREQ", () => {
    expect(() => parseRRule("FREQ=HOURLY")).toThrow();
  });

  it("parses COUNT and UNTIL", () => {
    const p = parseRRule("FREQ=DAILY;COUNT=3");
    expect(p.count).toBe(3);
    const u = parseRRule("FREQ=MONTHLY;UNTIL=20240630");
    expect(u.until?.toISODate()).toBe("2024-06-30");
  });
});

describe("month-end clamping (spec §8: due on the 31st)", () => {
  it("clamps the 31st to the last day of shorter months, incl. leap February", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: rruleMonthlyOnDay(31),
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 1, 1),
      windowStart: local(zone, 2024, 1, 1),
      windowEnd: local(zone, 2024, 12, 31, 23, 59),
    });

    const byMonth = occ.map((o) => dueLocal(o.dueAt, zone));
    // Jan 31, Feb 29 (leap year!), Mar 31, Apr 30, ...
    expect(byMonth[0]).toMatchObject({ m: 1, d: 31 });
    expect(byMonth[1]).toMatchObject({ m: 2, d: 29 });
    expect(byMonth[2]).toMatchObject({ m: 3, d: 31 });
    expect(byMonth[3]).toMatchObject({ m: 4, d: 30 });
    expect(byMonth).toHaveLength(12);
    // Never skips a month.
    expect(byMonth.map((b) => b.m)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("clamps Feb 31 -> 28 in a non-leap year (2023)", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: rruleMonthlyOnDay(31),
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2023, 2, 1),
      windowStart: local(zone, 2023, 2, 1),
      windowEnd: local(zone, 2023, 2, 28, 23, 59),
    });
    expect(occ).toHaveLength(1);
    expect(dueLocal(occ[0].dueAt, zone)).toMatchObject({ y: 2023, m: 2, d: 28 });
  });
});

describe("DST handling (spec §8)", () => {
  it("keeps 09:00 local across a DST boundary, shifting the UTC offset", () => {
    const zone = "America/New_York"; // EST (-5) winter, EDT (-4) summer
    const occ = generateOccurrences({
      recurrence: rruleMonthlyOnDay(15),
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 1, 1),
      windowStart: local(zone, 2024, 1, 1),
      windowEnd: local(zone, 2024, 12, 31, 23, 59),
    });

    const jan = occ.find((o) => dueLocal(o.dueAt, zone).m === 1)!;
    const jul = occ.find((o) => dueLocal(o.dueAt, zone).m === 7)!;

    // Both are 09:00 local...
    expect(dueLocal(jan.dueAt, zone).h).toBe(9);
    expect(dueLocal(jul.dueAt, zone).h).toBe(9);
    // ...but different UTC instants: 14:00Z in winter (EST), 13:00Z in summer (EDT).
    expect(jan.dueAt.getUTCHours()).toBe(14);
    expect(jul.dueAt.getUTCHours()).toBe(13);
  });
});

describe("weekly recurrence", () => {
  it("generates one occurrence per matching weekday", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: rruleWeekly(["MO"]),
      timezone: zone,
      dueTimeLocal: "10:00",
      startDate: local(zone, 2024, 3, 1),
      windowStart: local(zone, 2024, 3, 1),
      windowEnd: local(zone, 2024, 3, 31, 23, 59),
    });
    // Mondays in March 2024: 4, 11, 18, 25
    const days = occ.map((o) => dueLocal(o.dueAt, zone).d);
    expect(days).toEqual([4, 11, 18, 25]);
    occ.forEach((o) => expect(dueLocal(o.dueAt, zone).h).toBe(10));
  });

  it("supports multiple weekdays and INTERVAL", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: "FREQ=WEEKLY;BYDAY=MO,WE,FR",
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 4, 1), // a Monday
      windowStart: local(zone, 2024, 4, 1),
      windowEnd: local(zone, 2024, 4, 7, 23, 59),
    });
    const days = occ.map((o) => dueLocal(o.dueAt, zone).d).sort((a, b) => a - b);
    expect(days).toEqual([1, 3, 5]); // Mon Apr 1, Wed Apr 3, Fri Apr 5
  });
});

describe("COUNT and UNTIL bounds", () => {
  it("stops after COUNT occurrences", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: "FREQ=MONTHLY;BYMONTHDAY=1;COUNT=3",
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 1, 1),
      windowStart: local(zone, 2024, 1, 1),
      windowEnd: local(zone, 2025, 12, 31),
    });
    expect(occ).toHaveLength(3);
  });

  it("stops at UNTIL", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: "FREQ=MONTHLY;BYMONTHDAY=1;UNTIL=20240401",
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 1, 1),
      windowStart: local(zone, 2024, 1, 1),
      windowEnd: local(zone, 2025, 12, 31),
    });
    // Jan 1, Feb 1, Mar 1, Apr 1 (UNTIL inclusive of Apr 1 00:00 < 09:00? Apr 1 09:00 > Apr 1 00:00Z)
    const months = occ.map((o) => dueLocal(o.dueAt, zone).m);
    expect(months).toEqual([1, 2, 3]);
  });
});

describe("one-off obligations (deposit / return vehicle)", () => {
  it("emits exactly one occurrence at startDate", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: "",
      timezone: zone,
      dueTimeLocal: "17:00",
      startDate: local(zone, 2024, 6, 15),
      windowStart: local(zone, 2024, 1, 1),
      windowEnd: local(zone, 2024, 12, 31),
    });
    expect(occ).toHaveLength(1);
    expect(dueLocal(occ[0].dueAt, zone)).toMatchObject({ y: 2024, m: 6, d: 15, h: 17 });
    // Period is the single due day.
    expect(occ[0].periodEnd.getTime()).toBe(occ[0].dueAt.getTime());
  });
});

describe("window filtering (nightly top-up)", () => {
  it("only returns occurrences inside the window", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: rruleMonthlyOnDay(1),
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 1, 1),
      windowStart: local(zone, 2024, 6, 1),
      windowEnd: local(zone, 2024, 8, 31, 23, 59),
    });
    const months = occ.map((o) => dueLocal(o.dueAt, zone).m);
    expect(months).toEqual([6, 7, 8]);
  });

  it("does not emit before the agreement startDate", () => {
    const zone = "Asia/Dubai";
    const occ = generateOccurrences({
      recurrence: rruleMonthlyOnDay(1),
      timezone: zone,
      dueTimeLocal: "09:00",
      startDate: local(zone, 2024, 3, 10),
      windowStart: local(zone, 2024, 1, 1),
      windowEnd: local(zone, 2024, 6, 30),
    });
    const months = occ.map((o) => dueLocal(o.dueAt, zone).m);
    // Mar 1 is before startDate Mar 10, so first is Apr 1.
    expect(months).toEqual([4, 5, 6]);
  });
});
