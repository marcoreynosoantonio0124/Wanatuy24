import { DateTime } from "luxon";

/**
 * Occurrence generation from an obligation's recurrence rule (spec §3 rule 1,
 * §10 step 3). Occurrences are MATERIALISED, never computed on the fly in UI.
 *
 * Design notes:
 *  - We parse a documented RFC-5545 subset (FREQ/INTERVAL/BYMONTHDAY/BYDAY/
 *    COUNT/UNTIL) and generate calendar dates ourselves in the agreement's IANA
 *    timezone using luxon. This gives correct behaviour for the edge cases the
 *    spec calls out (§8): month-end clamping (due on the 31st in February),
 *    DST shifts (09:00 local stays 09:00 local, UTC offset moves), and leap
 *    years — none of which the naive "compute in UTC then skip invalid dates"
 *    approach gets right.
 *  - "Due at 09:00" always means 09:00 in the agreement timezone; we store UTC.
 */

export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

const WEEKDAY_MAP: Record<string, number> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 7,
};

export interface ParsedRRule {
  freq: Frequency;
  interval: number;
  byMonthDay?: number[]; // 1..31 or negative (-1 = last day)
  byDay?: number[]; // ISO weekday 1..7
  count?: number;
  until?: DateTime; // inclusive, in UTC
}

/**
 * Parse the documented RRULE subset. Throws on unsupported input so callers
 * fail loudly at obligation-creation time rather than silently generating
 * nothing.
 */
export function parseRRule(rule: string): ParsedRRule {
  const parts = rule
    .replace(/^RRULE:/i, "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  const map: Record<string, string> = {};
  for (const part of parts) {
    const [k, v] = part.split("=");
    if (!k || v === undefined) throw new Error(`Malformed RRULE segment: "${part}"`);
    map[k.toUpperCase()] = v;
  }

  const freq = map.FREQ?.toUpperCase() as Frequency | undefined;
  if (!freq || !["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(freq)) {
    throw new Error(`Unsupported or missing FREQ in RRULE: "${rule}"`);
  }

  const interval = map.INTERVAL ? parseInt(map.INTERVAL, 10) : 1;
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`Invalid INTERVAL in RRULE: "${rule}"`);
  }

  const parsed: ParsedRRule = { freq, interval };

  if (map.BYMONTHDAY) {
    parsed.byMonthDay = map.BYMONTHDAY.split(",").map((d) => {
      const n = parseInt(d, 10);
      if (!Number.isInteger(n) || n === 0 || n < -31 || n > 31) {
        throw new Error(`Invalid BYMONTHDAY "${d}" in RRULE`);
      }
      return n;
    });
  }

  if (map.BYDAY) {
    parsed.byDay = map.BYDAY.split(",").map((d) => {
      const iso = WEEKDAY_MAP[d.toUpperCase()];
      if (!iso) throw new Error(`Invalid BYDAY "${d}" in RRULE`);
      return iso;
    });
  }

  if (map.COUNT) {
    parsed.count = parseInt(map.COUNT, 10);
    if (!Number.isInteger(parsed.count) || parsed.count < 1) {
      throw new Error(`Invalid COUNT in RRULE: "${rule}"`);
    }
  }

  if (map.UNTIL) {
    // RFC 5545: UNTIL is a DATE or DATE-TIME (usually UTC, trailing Z).
    const raw = map.UNTIL;
    const dt =
      raw.length === 8
        ? DateTime.fromFormat(raw, "yyyyMMdd", { zone: "utc" })
        : DateTime.fromFormat(raw.replace(/Z$/, ""), "yyyyMMdd'T'HHmmss", { zone: "utc" });
    if (!dt.isValid) throw new Error(`Invalid UNTIL "${raw}" in RRULE`);
    parsed.until = dt;
  }

  return parsed;
}

export interface GenerateParams {
  /** RRULE string. Empty/undefined means a single one-off occurrence at startDate. */
  recurrence?: string | null;
  /** Agreement/obligation IANA timezone, e.g. "Asia/Dubai". */
  timezone: string;
  /** "HH:mm" local due time. */
  dueTimeLocal: string;
  /** Agreement start — no occurrence is emitted before this instant. */
  startDate: Date;
  /** Agreement end — no occurrence is emitted after this instant. Optional. */
  endDate?: Date | null;
  /** Only emit occurrences with dueAt in [windowStart, windowEnd]. */
  windowStart: Date;
  windowEnd: Date;
  /** Safety cap on generated rows. */
  maxOccurrences?: number;
}

export interface GeneratedOccurrence {
  dueAt: Date; // UTC
  periodStart: Date; // UTC (local 00:00 of the due date)
  periodEnd: Date; // UTC (periodStart + one interval)
}

function parseDueTime(dueTimeLocal: string): { hour: number; minute: number } {
  const m = /^(\d{1,2}):(\d{2})$/.exec(dueTimeLocal.trim());
  if (!m) throw new Error(`Invalid dueTimeLocal "${dueTimeLocal}", expected "HH:mm"`);
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`Out-of-range dueTimeLocal "${dueTimeLocal}"`);
  }
  return { hour, minute };
}

/** Clamp a target day-of-month to the given month's length (spec §8 month-end). */
function clampDay(year: number, month: number, day: number, zone: string): number {
  const daysInMonth = DateTime.fromObject({ year, month, day: 1 }, { zone }).daysInMonth!;
  if (day < 0) {
    // -1 => last day, -2 => second-to-last, etc.
    return Math.max(1, daysInMonth + day + 1);
  }
  return Math.min(day, daysInMonth);
}

function intervalEnd(start: DateTime, freq: Frequency, interval: number): DateTime {
  switch (freq) {
    case "DAILY":
      return start.plus({ days: interval });
    case "WEEKLY":
      return start.plus({ weeks: interval });
    case "MONTHLY":
      return start.plus({ months: interval });
    case "YEARLY":
      return start.plus({ years: interval });
  }
}

/**
 * Generate materialised occurrences for the window. Deterministic and pure —
 * no DB, no clock. The nightly top-up job (spec §5.4) calls this with a rolling
 * window; obligation creation calls it for the next 12 months.
 */
export function generateOccurrences(params: GenerateParams): GeneratedOccurrence[] {
  const {
    recurrence,
    timezone,
    dueTimeLocal,
    startDate,
    endDate,
    windowStart,
    windowEnd,
    maxOccurrences = 500,
  } = params;

  const { hour, minute } = parseDueTime(dueTimeLocal);
  const zone = timezone;
  const anchor = DateTime.fromJSDate(startDate, { zone });
  if (!anchor.isValid) throw new Error(`Invalid timezone "${timezone}"`);

  const windowStartMs = windowStart.getTime();
  const windowEndMs = windowEnd.getTime();
  const startMs = startDate.getTime();
  const endMs = endDate ? endDate.getTime() : Infinity;
  const untilMs = undefined as number | undefined;

  // One-off: no recurrence rule. Period is the single due day.
  if (!recurrence || recurrence.trim() === "") {
    const due = anchor.set({ hour, minute, second: 0, millisecond: 0 });
    const ms = due.toMillis();
    if (ms >= Math.max(windowStartMs, startMs) && ms <= windowEndMs && ms <= endMs) {
      return [
        {
          dueAt: due.toUTC().toJSDate(),
          periodStart: due.startOf("day").toUTC().toJSDate(),
          periodEnd: due.toUTC().toJSDate(),
        },
      ];
    }
    return [];
  }

  const rule = parseRRule(recurrence);
  const untilLimitMs = rule.until ? rule.until.toMillis() : Infinity;

  const results: GeneratedOccurrence[] = [];
  let emitted = 0; // counts against COUNT (all valid occurrences from anchor, even before window)

  // localDate builder for a given calendar y/m/d
  const buildDue = (year: number, month: number, day: number): DateTime =>
    DateTime.fromObject(
      { year, month, day, hour, minute, second: 0, millisecond: 0 },
      { zone }
    );

  const withinLimits = (due: DateTime): boolean =>
    due.toMillis() >= startMs &&
    due.toMillis() <= endMs &&
    due.toMillis() <= untilLimitMs;

  const pushIfInWindow = (due: DateTime) => {
    const ms = due.toMillis();
    if (ms >= windowStartMs && ms <= windowEndMs && ms <= endMs && ms <= untilLimitMs) {
      emit(results, due, rule.freq, rule.interval, zone);
    }
  };

  // Iterate step-by-step from the anchor period. We iterate over "periods"
  // (freq × interval) and, within each, expand BYDAY/BYMONTHDAY.
  let guard = 0;
  const hardGuard = 20000;

  if (rule.freq === "MONTHLY" || rule.freq === "YEARLY") {
    const monthsStep = rule.freq === "YEARLY" ? 12 * rule.interval : rule.interval;
    // Start a couple of periods early so a UTC↔local shift of `startDate` can
    // never drop the first in-window occurrence; pre-start dates are filtered.
    let cursor = anchor.startOf("month").minus({ months: 2 * monthsStep });
    // default day-of-month = anchor's day when no BYMONTHDAY
    const days = rule.byMonthDay ?? [anchor.day];

    while (guard++ < hardGuard) {
      const y = cursor.year;
      const m = cursor.month;
      for (const d of days) {
        const clamped = clampDay(y, m, d, zone);
        const due = buildDue(y, m, clamped);
        if (!withinLimits(due)) {
          // still may count toward COUNT only if >= anchor; skip otherwise
        }
        if (due.toMillis() >= startMs && due.toMillis() <= untilLimitMs) {
          if (rule.count && emitted >= rule.count) break;
          emitted++;
          pushIfInWindow(due);
        }
      }
      if (rule.count && emitted >= rule.count) break;
      cursor = cursor.plus({ months: monthsStep });
      if (cursor.toMillis() > windowEndMs + 1000 * 60 * 60 * 24 * 400) break;
      if (results.length >= maxOccurrences) break;
    }
  } else if (rule.freq === "WEEKLY") {
    const isoDays = rule.byDay ?? [anchor.weekday];
    let weekCursor = anchor.startOf("week").minus({ weeks: 1 }); // Monday, one week early
    while (guard++ < hardGuard) {
      for (const iso of isoDays.slice().sort((a, b) => a - b)) {
        const due = weekCursor
          .set({ weekday: iso as 1 | 2 | 3 | 4 | 5 | 6 | 7 })
          .set({ hour, minute, second: 0, millisecond: 0 });
        if (due.toMillis() >= startMs && due.toMillis() <= untilLimitMs) {
          if (rule.count && emitted >= rule.count) break;
          emitted++;
          pushIfInWindow(due);
        }
      }
      if (rule.count && emitted >= rule.count) break;
      weekCursor = weekCursor.plus({ weeks: rule.interval });
      if (weekCursor.toMillis() > windowEndMs + 1000 * 60 * 60 * 24 * 14) break;
      if (results.length >= maxOccurrences) break;
    }
  } else {
    // DAILY
    let dayCursor = anchor.startOf("day");
    while (guard++ < hardGuard) {
      const due = dayCursor.set({ hour, minute, second: 0, millisecond: 0 });
      if (due.toMillis() >= startMs && due.toMillis() <= untilLimitMs) {
        if (rule.count && emitted >= rule.count) break;
        emitted++;
        pushIfInWindow(due);
      }
      dayCursor = dayCursor.plus({ days: rule.interval });
      if (dayCursor.toMillis() > windowEndMs + 1000 * 60 * 60 * 24) break;
      if (results.length >= maxOccurrences) break;
    }
  }

  // Deduplicate + sort by dueAt (BYMONTHDAY lists could overlap after clamping).
  const seen = new Set<number>();
  return results
    .filter((o) => {
      const ms = o.dueAt.getTime();
      if (seen.has(ms)) return false;
      seen.add(ms);
      return true;
    })
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime())
    .slice(0, maxOccurrences);

  void untilMs;
}

function emit(
  out: GeneratedOccurrence[],
  due: DateTime,
  freq: Frequency,
  interval: number,
  zone: string
) {
  const periodStartLocal = due.startOf("day");
  const periodEndLocal = intervalEnd(periodStartLocal, freq, interval);
  out.push({
    dueAt: due.toUTC().toJSDate(),
    periodStart: periodStartLocal.toUTC().toJSDate(),
    periodEnd: periodEndLocal.toUTC().toJSDate(),
  });
}

// ─── Preset builders (spec §4.1) ─────────────────────────────────────────────

export function rruleMonthlyOnDay(day: number): string {
  return `FREQ=MONTHLY;BYMONTHDAY=${day}`;
}

export function rruleWeekly(byDay?: string[]): string {
  return byDay && byDay.length ? `FREQ=WEEKLY;BYDAY=${byDay.join(",")}` : "FREQ=WEEKLY";
}

export function rruleDaily(interval = 1): string {
  return interval > 1 ? `FREQ=DAILY;INTERVAL=${interval}` : "FREQ=DAILY";
}

/** One-off obligation (deposit, "return vehicle by date") — empty recurrence. */
export const RRULE_ONE_OFF = "";
