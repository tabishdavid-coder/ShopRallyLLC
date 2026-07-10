import { z } from "zod";

import {
  BOOKING_DAYS,
  BOOKING_DAY_LABELS,
  dateToBookingDayKey,
  type BookingDayAvailability,
  type BookingDayKey,
} from "@/lib/booking-settings";

/** Re-export day keys/labels so appointments settings share Mon–Sun ordering. */
export { BOOKING_DAYS, BOOKING_DAY_LABELS, dateToBookingDayKey };
export type { BookingDayKey, BookingDayAvailability as ApptDayHours };

export type ApptWeeklyHours = Record<BookingDayKey, BookingDayAvailability>;

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const DayHoursSchema = z.object({
  enabled: z.boolean(),
  start: HHMM,
  end: HHMM,
});

export const ApptWeeklyHoursSchema = z.object({
  mon: DayHoursSchema,
  tue: DayHoursSchema,
  wed: DayHoursSchema,
  thu: DayHoursSchema,
  fri: DayHoursSchema,
  sat: DayHoursSchema,
  sun: DayHoursSchema,
});

/** Default: all 7 days open with the given hours (matches legacy flat shop hours). */
export function defaultApptWeeklyHours(
  dayStart = "08:00",
  dayEnd = "17:00",
): ApptWeeklyHours {
  const open = { enabled: true, start: dayStart, end: dayEnd };
  return {
    mon: { ...open },
    tue: { ...open },
    wed: { ...open },
    thu: { ...open },
    fri: { ...open },
    sat: { ...open },
    sun: { ...open },
  };
}

/**
 * Parse `Shop.apptWeeklyHours` JSON. Falls back to a full week derived from
 * the legacy flat `apptDayStart` / `apptDayEnd` columns when unset/invalid.
 */
export function parseApptWeeklyHours(
  raw: unknown,
  fallback?: { dayStart?: string | null; dayEnd?: string | null },
): ApptWeeklyHours {
  const dayStart = fallback?.dayStart ?? "08:00";
  const dayEnd = fallback?.dayEnd ?? "17:00";
  const base = defaultApptWeeklyHours(dayStart, dayEnd);
  if (!raw || typeof raw !== "object") return base;
  const parsed = ApptWeeklyHoursSchema.safeParse(raw);
  if (!parsed.success) return base;
  return { ...base, ...parsed.data };
}

/** Hours for a calendar date (local shop date). Null when closed. */
export function apptHoursForDate(
  weekly: ApptWeeklyHours,
  date: Date,
): BookingDayAvailability | null {
  const day = weekly[dateToBookingDayKey(date)];
  if (!day?.enabled) return null;
  return day;
}

/** Today's hours using the shop IANA timezone (falls back to America/New_York). */
export function apptHoursForToday(
  weekly: ApptWeeklyHours,
  timezone: string,
  now = new Date(),
): BookingDayAvailability | null {
  const tz = timezone.trim() || "America/New_York";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  return apptHoursForDate(weekly, new Date(y, m - 1, d));
}

/**
 * Envelope hours for the week calendar grid: earliest open start → latest open end.
 * Falls back to 08:00–17:00 when every day is closed.
 */
export function apptHoursEnvelope(weekly: ApptWeeklyHours): {
  dayStart: string;
  dayEnd: string;
} {
  let earliest: string | null = null;
  let latest: string | null = null;
  for (const key of BOOKING_DAYS) {
    const day = weekly[key];
    if (!day.enabled) continue;
    if (earliest == null || day.start < earliest) earliest = day.start;
    if (latest == null || day.end > latest) latest = day.end;
  }
  return {
    dayStart: earliest ?? "08:00",
    dayEnd: latest ?? "17:00",
  };
}

/** Validate open days have end > start. Returns an error message or null. */
export function validateApptWeeklyHours(weekly: ApptWeeklyHours): string | null {
  const openDays = BOOKING_DAYS.filter((k) => weekly[k].enabled);
  if (openDays.length === 0) {
    return "At least one day must be open.";
  }
  for (const key of openDays) {
    const day = weekly[key];
    if (day.end <= day.start) {
      return `${BOOKING_DAY_LABELS[key]}: end time must be after start time.`;
    }
  }
  return null;
}
