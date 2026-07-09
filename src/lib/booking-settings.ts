import { z } from "zod";

/** Day keys for per-day booking availability (Mon–Sun). */
export const BOOKING_DAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type BookingDayKey = (typeof BOOKING_DAYS)[number];

export const BOOKING_DAY_LABELS: Record<BookingDayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** JS Date.getDay() → booking day key (0 = Sunday). */
export function dateToBookingDayKey(date: Date): BookingDayKey {
  const map: BookingDayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[date.getDay()] ?? "mon";
}

export type BookingService = {
  id: string;
  name: string;
  description?: string;
  durationMins: number;
  sortOrder: number;
};

export type BookingDayAvailability = {
  enabled: boolean;
  start: string;
  end: string;
};

export type BookingFieldConfig = {
  emailRequired: boolean;
  vehicleRequired: boolean;
  showVehicleDescription: boolean;
  showServiceConcerns: boolean;
  showVin: boolean;
  /** Plate / VIN alternate entry on the vehicle step. */
  showPlateLookup: boolean;
};

export type BookingDropOff = {
  enabled: boolean;
  label: string;
};

export const DEFAULT_BOOKING_DROP_OFF: BookingDropOff = {
  enabled: true,
  label: "I will drop-off my vehicle",
};

export type BookingSettings = {
  services: BookingService[];
  fieldConfig: BookingFieldConfig;
  minNoticeHours: number;
  confirmationMessage?: string;
  notifyEmails?: string[];
  availability: Record<BookingDayKey, BookingDayAvailability>;
  dropOff?: BookingDropOff;
};

export const DEFAULT_BOOKING_FIELD_CONFIG: BookingFieldConfig = {
  emailRequired: false,
  vehicleRequired: false,
  showVehicleDescription: false,
  showServiceConcerns: true,
  showVin: false,
  showPlateLookup: true,
};

export const DEFAULT_BOOKING_SERVICES: BookingService[] = [
  {
    id: "svc-inspection",
    name: "NYS State Inspection",
    description: "Yearly New York State Inspection",
    durationMins: 60,
    sortOrder: 0,
  },
  {
    id: "svc-oil",
    name: "Oil Change",
    description: "Oil and filter change",
    durationMins: 30,
    sortOrder: 1,
  },
  {
    id: "svc-brakes",
    name: "Brakes",
    description: "Brake inspection and repair",
    durationMins: 60,
    sortOrder: 2,
  },
  {
    id: "svc-battery",
    name: "Battery",
    description: "Battery test and replacement",
    durationMins: 60,
    sortOrder: 3,
  },
  {
    id: "svc-ac",
    name: "Heating & AC",
    description: "Climate control service",
    durationMins: 180,
    sortOrder: 4,
  },
];

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const DayAvailability = z.object({
  enabled: z.boolean(),
  start: HHMM,
  end: HHMM,
});

const ServiceSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(200).optional(),
  durationMins: z.number().int().min(15).max(480),
  sortOrder: z.number().int().min(0),
});

export const BookingSettingsSchema = z.object({
  services: z.array(ServiceSchema).max(50),
  fieldConfig: z.object({
    emailRequired: z.boolean(),
    vehicleRequired: z.boolean(),
    showVehicleDescription: z.boolean(),
    showServiceConcerns: z.boolean(),
    showVin: z.boolean(),
    showPlateLookup: z.boolean().default(true),
  }),
  minNoticeHours: z.number().int().min(0).max(168),
  confirmationMessage: z.string().trim().max(500).optional(),
  notifyEmails: z.array(z.string().email()).max(10).optional(),
  availability: z.record(z.enum(BOOKING_DAYS), DayAvailability),
  dropOff: z
    .object({
      enabled: z.boolean(),
      label: z.string().trim().min(1).max(120),
    })
    .optional(),
});

function defaultDayAvailability(start = "08:00", end = "17:00"): BookingDayAvailability {
  return { enabled: true, start, end };
}

/** Default weekly availability — Mon–Sat open, Sunday closed. */
export function defaultBookingAvailability(
  dayStart = "08:00",
  dayEnd = "17:00",
): Record<BookingDayKey, BookingDayAvailability> {
  return {
    mon: defaultDayAvailability(dayStart, dayEnd),
    tue: defaultDayAvailability(dayStart, dayEnd),
    wed: defaultDayAvailability(dayStart, dayEnd),
    thu: defaultDayAvailability(dayStart, dayEnd),
    fri: defaultDayAvailability(dayStart, dayEnd),
    sat: defaultDayAvailability(dayStart, dayEnd),
    sun: { enabled: false, start: dayStart, end: dayEnd },
  };
}

export function defaultBookingSettings(
  dayStart = "08:00",
  dayEnd = "17:00",
): BookingSettings {
  return {
    services: DEFAULT_BOOKING_SERVICES.map((s) => ({ ...s })),
    fieldConfig: { ...DEFAULT_BOOKING_FIELD_CONFIG },
    minNoticeHours: 1,
    availability: defaultBookingAvailability(dayStart, dayEnd),
    dropOff: { ...DEFAULT_BOOKING_DROP_OFF },
  };
}

/** Parse shop.bookingSettings JSON; merge with defaults from shop hours. */
export function parseBookingSettings(
  raw: unknown,
  shopHours?: { dayStart?: string | null; dayEnd?: string | null },
): BookingSettings {
  const dayStart = shopHours?.dayStart ?? "08:00";
  const dayEnd = shopHours?.dayEnd ?? "17:00";
  const base = defaultBookingSettings(dayStart, dayEnd);
  if (!raw || typeof raw !== "object") return base;

  const parsed = BookingSettingsSchema.safeParse(raw);
  if (!parsed.success) return base;

  return {
    ...base,
    ...parsed.data,
    services: parsed.data.services.length ? parsed.data.services : base.services,
    fieldConfig: {
      ...base.fieldConfig,
      ...parsed.data.fieldConfig,
      showVin: parsed.data.fieldConfig.showVin ?? base.fieldConfig.showVin,
      showPlateLookup:
        parsed.data.fieldConfig.showPlateLookup ?? base.fieldConfig.showPlateLookup,
    },
    availability: { ...base.availability, ...parsed.data.availability },
    dropOff: parsed.data.dropOff
      ? { ...base.dropOff!, ...parsed.data.dropOff }
      : base.dropOff,
  };
}

/** Hours for a specific ISO date from booking availability config. */
export function bookingHoursForDate(
  settings: BookingSettings,
  isoDate: string,
): BookingDayAvailability | null {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dayKey = dateToBookingDayKey(new Date(y, (m ?? 1) - 1, d ?? 1));
  const day = settings.availability[dayKey];
  if (!day?.enabled) return null;
  return day;
}
