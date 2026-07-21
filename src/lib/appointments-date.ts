/** Pure date helpers for appointments — safe for server and client (no Prisma imports). */

export type CalendarView = "day" | "week" | "month";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Sunday-start week containing `date` (local calendar; getDay() 0 = Sunday). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getMonthStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's calendar date as `YYYY-MM-DD` (local). Use for date input `min`. */
export function todayDateInputValue(now = new Date()): string {
  return toDateInputValue(now);
}

/** If `dateIso` is before today, return today; otherwise return `dateIso`. */
export function clampDateInputToToday(dateIso: string, now = new Date()): string {
  const today = todayDateInputValue(now);
  return dateIso && dateIso < today ? today : dateIso || today;
}

/** Local Date for a date input + `HH:mm` start time. */
export function buildLocalStartAt(dateIso: string, startTime: string): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = startTime.split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/** True when the local start datetime is before `now`. */
export function isStartInPast(
  dateIso: string,
  startTime: string,
  now = new Date(),
): boolean {
  return buildLocalStartAt(dateIso, startTime).getTime() < now.getTime();
}

/**
 * When booking for today, bump a past `HH:mm` up to the next 15-minute slot
 * at or after `now`. Future dates are left unchanged.
 */
export function clampStartTimeToNow(
  dateIso: string,
  startTime: string,
  now = new Date(),
): string {
  const today = todayDateInputValue(now);
  if (dateIso !== today) return startTime;
  const [hh, mm] = startTime.split(":").map(Number);
  const startMins = (hh ?? 0) * 60 + (mm ?? 0);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (startMins >= nowMins) return startTime;
  const next = Math.ceil((nowMins + 1) / 15) * 15;
  const capped = Math.min(next, 23 * 60 + 45);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** `HH:mm` lower bound for a time input when the selected date is today. */
export function minTimeInputForDate(dateIso: string, now = new Date()): string | undefined {
  if (dateIso !== todayDateInputValue(now)) return undefined;
  const h = now.getHours();
  const m = now.getMinutes();
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Parse `YYYY-MM-DD` as local midnight.
 * Prefer this over `new Date("YYYY-MM-DD")` in UI — ISO date-only strings parse as
 * UTC midnight and shift the local weekday (Sunday → Saturday in US timezones).
 */
export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function parseWeekParam(value: string | undefined): Date {
  if (value && DATE_RE.test(value)) {
    return getWeekStart(parseDateInput(value));
  }
  return getWeekStart(new Date());
}

export function parseCalendarView(value: string | undefined): CalendarView {
  if (value === "day" || value === "month" || value === "week") return value;
  return "week";
}

/** Anchor date from `date` or legacy `week` query; defaults to today. */
export function parseCalendarDateParam(
  dateValue: string | undefined,
  weekValue?: string | undefined,
): Date {
  if (dateValue && DATE_RE.test(dateValue)) {
    const d = parseDateInput(dateValue);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (weekValue && DATE_RE.test(weekValue)) {
    return getWeekStart(parseDateInput(weekValue));
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function weekRangeEnd(weekStart: Date): Date {
  return addDays(weekStart, 7);
}

/** Exclusive end of the calendar month containing `date`. */
export function monthRangeEnd(monthStart: Date): Date {
  return addMonths(getMonthStart(monthStart), 1);
}

/** Inclusive range start/end (end exclusive) for list queries. */
export function resolveCalendarRange(
  view: CalendarView,
  focusDate: Date,
): { rangeStart: Date; rangeEnd: Date; label: string } {
  if (view === "day") {
    const rangeStart = new Date(focusDate);
    rangeStart.setHours(0, 0, 0, 0);
    return {
      rangeStart,
      rangeEnd: addDays(rangeStart, 1),
      label: rangeStart.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };
  }
  if (view === "month") {
    const monthStart = getMonthStart(focusDate);
    const gridStart = getWeekStart(monthStart);
    return {
      rangeStart: gridStart,
      rangeEnd: addDays(gridStart, 42),
      label: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }
  const rangeStart = getWeekStart(focusDate);
  return {
    rangeStart,
    rangeEnd: weekRangeEnd(rangeStart),
    label: formatWeekRange(rangeStart),
  };
}

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const y1 = weekStart.getFullYear();
  const y2 = weekEnd.getFullYear();
  const left = weekStart.toLocaleDateString("en-US", opts);
  const right = weekEnd.toLocaleDateString(
    "en-US",
    y1 === y2 ? opts : { ...opts, year: "numeric" },
  );
  return y1 === y2 ? `${left} – ${right}` : `${left} – ${right}, ${y2}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** 6×7 month matrix starting Sunday (may include adjacent-month days). */
export function getMonthGridDays(focusDate: Date): Date[] {
  const monthStart = getMonthStart(focusDate);
  const gridStart = getWeekStart(monthStart);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}
