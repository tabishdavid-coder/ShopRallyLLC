/** Pure date helpers for appointments — safe for server and client (no Prisma imports). */

/** Sunday-start week containing `date`. */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateInput(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function parseWeekParam(value: string | undefined): Date {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return getWeekStart(parseDateInput(value));
  }
  return getWeekStart(new Date());
}

export function weekRangeEnd(weekStart: Date): Date {
  return addDays(weekStart, 7);
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
