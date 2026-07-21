import type { AppointmentStatus } from "@/generated/prisma";

export {
  addDays,
  addMonths,
  buildLocalStartAt,
  clampDateInputToToday,
  clampStartTimeToNow,
  formatWeekRange,
  getMonthGridDays,
  getMonthStart,
  getWeekStart,
  isSameDay,
  isSameMonth,
  isStartInPast,
  minTimeInputForDate,
  monthRangeEnd,
  parseCalendarDateParam,
  parseCalendarView,
  parseDateInput,
  parseWeekParam,
  resolveCalendarRange,
  toDateInputValue,
  todayDateInputValue,
  weekRangeEnd,
  type CalendarView,
} from "@/lib/appointments-date";

export function formatDayHeader(date: Date): { dow: string; md: string } {
  return {
    dow: date.toLocaleDateString("en-US", { weekday: "short" }),
    md: date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }),
  };
}

/** Parse "HH:mm" to minutes from midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Format minutes from midnight as "h:mm a". */
export function formatMinutesLabel(totalMins: number): string {
  const h24 = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Format "HH:mm" shop-hours string as 12-hour (e.g. "08:00" → "8:00 AM"). */
export function formatShopHoursLabel(time: string): string {
  return formatMinutesLabel(parseTimeToMinutes(time));
}

/** Format a shop-hours range for toolbar/header display. */
export function formatShopHoursRange(dayStart: string, dayEnd: string): string {
  return `${formatShopHoursLabel(dayStart)} – ${formatShopHoursLabel(dayEnd)}`;
}

/** Format minutes from midnight as "HH:mm" for time inputs. */
export function minutesToTimeInput(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function durationMinsBetween(start: Date, end: Date): number {
  return Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
}

export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  SCHEDULED: {
    label: "Scheduled",
    className: "bg-brand-navy text-white",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "bg-brand-navy text-white ring-2 ring-brand-light/60",
  },
  IN_PROGRESS: {
    label: "Arrived",
    className: "bg-emerald-600 text-white",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-600 text-white",
  },
  CANCELED: {
    label: "Canceled",
    className: "bg-muted text-muted-foreground line-through",
  },
  NO_SHOW: {
    label: "No show",
    className: "bg-brand-red text-white",
  },
};

export function vehicleShortLabel(v: {
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
}): string {
  return [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") || "Vehicle";
}

export function appointmentCardTitle(
  customerName: string,
  vehicle: { year: number | null; make: string | null; model: string | null; trim?: string | null } | null,
): string {
  if (!vehicle) return customerName;
  return `${customerName}'s ${vehicleShortLabel(vehicle)}`;
}
