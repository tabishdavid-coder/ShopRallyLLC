import { parseTimeToMinutes } from "@/lib/appointments";

/** Format minutes from midnight as "HH:MM" (24-hour). */
export function formatTimeFromMinutes(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export type SlotSettings = {
  dayStart: string;
  dayEnd: string;
  durationMins: number;
};

/** 30-minute slot starts between shop open and close (display grid). */
export function generateHalfHourSlots(dayStart: string, dayEnd: string): string[] {
  const start = parseTimeToMinutes(dayStart);
  const end = parseTimeToMinutes(dayEnd);
  const slots: string[] = [];
  for (let t = start; t < end; t += 30) {
    slots.push(formatTimeFromMinutes(t));
  }
  return slots;
}

/** All slot start times for a day based on shop hours and appointment duration. */
export function generateDaySlots(settings: SlotSettings): string[] {
  const start = parseTimeToMinutes(settings.dayStart);
  const end = parseTimeToMinutes(settings.dayEnd);
  const step = Math.max(15, settings.durationMins);
  const slots: string[] = [];
  for (let t = start; t + step <= end; t += step) {
    slots.push(formatTimeFromMinutes(t));
  }
  return slots;
}

type BookedRange = { startAt: Date; endAt: Date };

function slotRange(date: string, startTime: string, durationMins: number) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  const startAt = new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationMins * 60_000);
  return { startAt, endAt };
}

function overlaps(a: { startAt: Date; endAt: Date }, b: BookedRange): boolean {
  return a.startAt < b.endAt && a.endAt > b.startAt;
}

/** Filter slots that are in the past or overlap existing appointments. */
export function filterAvailableSlots(input: {
  date: string;
  settings: SlotSettings;
  booked: BookedRange[];
  now?: Date;
  minNoticeMins?: number;
}): string[] {
  const all = generateDaySlots(input.settings);
  return all.filter((startTime) => isSlotAvailable(startTime, input));
}

/** Whether a slot start can fit an appointment of the given duration. */
export function isSlotAvailable(
  startTime: string,
  input: {
    date: string;
    settings: SlotSettings;
    booked: BookedRange[];
    now?: Date;
    minNoticeMins?: number;
  },
): boolean {
  const now = input.now ?? new Date();
  const minNotice = input.minNoticeMins ?? 120;
  const range = slotRange(input.date, startTime, input.settings.durationMins);
  const dayEndMins = parseTimeToMinutes(input.settings.dayEnd);
  const slotEndMins =
    parseTimeToMinutes(startTime) + input.settings.durationMins;
  if (slotEndMins > dayEndMins) return false;
  if (range.startAt.getTime() < now.getTime() + minNotice * 60_000) return false;
  return !input.booked.some((b) => overlaps(range, b));
}

/** ISO date strings for the next N bookable days respecting per-day availability. */
export function upcomingBookableDates(
  count: number,
  now = new Date(),
  isDayEnabled?: (isoDate: string) => boolean,
): string[] {
  const dates: string[] = [];
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let guard = 0;
  while (dates.length < count && guard < count + 60) {
    const y = cursor.getFullYear();
    const m = (cursor.getMonth() + 1).toString().padStart(2, "0");
    const d = cursor.getDate().toString().padStart(2, "0");
    const iso = `${y}-${m}-${d}`;
    const enabled = isDayEnabled ? isDayEnabled(iso) : cursor.getDay() !== 0;
    if (enabled) dates.push(iso);
    cursor.setDate(cursor.getDate() + 1);
    guard++;
  }
  return dates;
}
