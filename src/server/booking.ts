import "server-only";

import { prisma } from "@/db/client";
import {
  bookingHoursForDate,
  parseBookingSettings,
  type BookingFieldConfig,
  type BookingService,
  type BookingSettings,
} from "@/lib/booking-settings";
import {
  filterAvailableSlots,
  generateHalfHourSlots,
  isSlotAvailable,
  upcomingBookableDates,
} from "@/lib/booking-slots";
import { canUseFeature } from "@/lib/subscription";

export type PublicBookingShop = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  logoUrl: string | null;
  apptDefaultDurationMins: number;
  bookingSettings: BookingSettings;
  services: BookingService[];
  fieldConfig: BookingFieldConfig;
  confirmationMessage?: string;
  notifyEmails: string[];
  /** Pro+ Auto.dev plate→VIN decode on public booking. */
  plateLookupEnabled: boolean;
};

/** Resolve a shop by public booking slug or short code. */
export async function getShopByBookingSlug(
  slug: string,
): Promise<PublicBookingShop | null> {
  const normalized = slug.trim().toLowerCase();
  const shop = await prisma.shop.findFirst({
    where: {
      onlineBookingEnabled: true,
      status: "ACTIVE",
      OR: [
        { bookingSlug: { equals: normalized, mode: "insensitive" } },
        { code: { equals: slug.trim(), mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      bookingSlug: true,
      code: true,
      phone: true,
      email: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      logoUrl: true,
      apptDefaultDurationMins: true,
      apptDayStart: true,
      apptDayEnd: true,
      bookingSettings: true,
    },
  });
  if (!shop) return null;

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });
  const plateLookupEnabled = await canUseFeature(shop.id, "autodevDecoding");

  return {
    id: shop.id,
    name: shop.name,
    slug: shop.bookingSlug ?? shop.code.toLowerCase(),
    phone: shop.phone,
    email: shop.email,
    address: shop.address,
    city: shop.city,
    state: shop.state,
    zip: shop.zip,
    logoUrl: shop.logoUrl,
    apptDefaultDurationMins: shop.apptDefaultDurationMins,
    bookingSettings,
    services: bookingSettings.services,
    fieldConfig: bookingSettings.fieldConfig,
    confirmationMessage: bookingSettings.confirmationMessage,
    notifyEmails: bookingSettings.notifyEmails ?? [],
    plateLookupEnabled,
  };
}

/** Available time slots for a given date on the public booking page. */
export async function getAvailableTimeSlots(
  shopId: string,
  date: string,
  durationMins?: number,
): Promise<string[]> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
      apptDefaultDurationMins: true,
    },
  });
  if (!shop) return [];

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });
  const dayHours = bookingHoursForDate(bookingSettings, date);
  if (!dayHours) return [];

  const slotDuration = durationMins ?? shop.apptDefaultDurationMins;
  const minNoticeMins = bookingSettings.minNoticeHours * 60;

  const [y, m, d] = date.split("-").map(Number);
  const dayStart = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const dayEnd = new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0, 0);

  const booked = await prisma.appointment.findMany({
    where: {
      shopId,
      status: { not: "CANCELED" },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    select: { startAt: true, endAt: true },
  });

  return filterAvailableSlots({
    date,
    settings: {
      dayStart: dayHours.start,
      dayEnd: dayHours.end,
      durationMins: slotDuration,
    },
    booked,
    minNoticeMins,
  });
}

export type BookingDaySchedule = {
  allSlots: string[];
  availableSlots: string[];
  dayEnabled: boolean;
};

/** Full 30-min grid + availability for the public schedule picker. */
export async function getBookingDaySchedule(
  shopId: string,
  date: string,
  durationMins?: number,
): Promise<BookingDaySchedule> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { allSlots: [], availableSlots: [], dayEnabled: false };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
      apptDefaultDurationMins: true,
    },
  });
  if (!shop) return { allSlots: [], availableSlots: [], dayEnabled: false };

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });
  const dayHours = bookingHoursForDate(bookingSettings, date);
  if (!dayHours) return { allSlots: [], availableSlots: [], dayEnabled: false };

  const slotDuration = durationMins ?? shop.apptDefaultDurationMins;
  const minNoticeMins = bookingSettings.minNoticeHours * 60;
  const settings = {
    dayStart: dayHours.start,
    dayEnd: dayHours.end,
    durationMins: slotDuration,
  };

  const [y, m, d] = date.split("-").map(Number);
  const dayStart = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const dayEnd = new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0, 0);

  const booked = await prisma.appointment.findMany({
    where: {
      shopId,
      status: { not: "CANCELED" },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    select: { startAt: true, endAt: true },
  });

  const allSlots = generateHalfHourSlots(dayHours.start, dayHours.end);
  const slotInput = { date, settings, booked, minNoticeMins };
  const availableSlots = allSlots.filter((t) => isSlotAvailable(t, slotInput));

  return { allSlots, availableSlots, dayEnabled: true };
}

/** Bookable dates for the public form (respects per-day availability). */
export async function getBookableDates(shopId: string, count = 14): Promise<string[]> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { bookingSettings: true, apptDayStart: true, apptDayEnd: true },
  });
  if (!shop) return upcomingBookableDates(count);

  const bookingSettings = parseBookingSettings(shop.bookingSettings, {
    dayStart: shop.apptDayStart,
    dayEnd: shop.apptDayEnd,
  });

  return upcomingBookableDates(count, new Date(), (iso) => {
    const hours = bookingHoursForDate(bookingSettings, iso);
    return hours?.enabled ?? false;
  });
}

export { upcomingBookableDates };
