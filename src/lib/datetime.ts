/** Coerce RSC-serialized ISO strings (or Date) before formatting on the client. */
export function toDate(d: Date | string | number): Date {
  return d instanceof Date ? d : new Date(d);
}

export function fmtDate(
  d: Date | string | number | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" },
): string {
  if (d == null) return "—";
  const dt = toDate(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-US", opts);
}

export function fmtDateTime(
  d: Date | string | number | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  },
): string {
  if (d == null) return "—";
  const dt = toDate(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-US", opts);
}

/** Compact relative time like "7h ago" / "2d ago". */
export function timeAgo(date: Date | string, now: Date = new Date()): string {
  const parsed = toDate(date);
  const seconds = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (minutes >= 1) return `${minutes}m ago`;
  return "just now";
}
