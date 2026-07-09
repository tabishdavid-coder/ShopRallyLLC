import { parseTimeToMinutes } from "@/lib/appointments";
import { bookingHoursForDate, type BookingSettings } from "@/lib/booking-settings";

export type ShopLocalClock = {
  isoDate: string;
  time: string; // HH:mm 24h
  weekday: number;
};

/** Current calendar date + time in the shop IANA timezone. */
export function getShopLocalClock(timezone: string | null, now = new Date()): ShopLocalClock {
  const tz = timezone?.trim() || "America/New_York";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const month = get("month");
  const day = get("day");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const weekdayLabel = get("weekday");
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    isoDate: `${year}-${month}-${day}`,
    time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`,
    weekday: weekdayMap[weekdayLabel] ?? now.getDay(),
  };
}

/** True when the shop is within booking availability for the current local day/time. */
export function isShopOpenNow(input: {
  timezone: string | null;
  bookingSettings: BookingSettings;
  now?: Date;
}): boolean {
  const clock = getShopLocalClock(input.timezone, input.now);
  const dayHours = bookingHoursForDate(input.bookingSettings, clock.isoDate);
  if (!dayHours?.enabled) return false;

  const nowMins = parseTimeToMinutes(clock.time);
  const startMins = parseTimeToMinutes(dayHours.start);
  const endMins = parseTimeToMinutes(dayHours.end);
  return nowMins >= startMins && nowMins < endMins;
}
