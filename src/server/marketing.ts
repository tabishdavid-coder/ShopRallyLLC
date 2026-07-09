import "server-only";

import { prisma } from "@/db/client";
import {
  bookingHoursForDate,
  parseBookingSettings,
  type BookingSettings,
} from "@/lib/booking-settings";
import { filterAvailableSlots, upcomingBookableDates } from "@/lib/booking-slots";

export type MarketingDashboardStats = {
  onlineBookings14d: number;
  manualBookings14d: number;
  onlineBookingEnabled: boolean;
};

/** KPI cards for Marketing → Dashboard. */
export async function getMarketingDashboardStats(shopId: string): Promise<MarketingDashboardStats> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [shop, online, manual] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { onlineBookingEnabled: true },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        source: "WEBSITE",
        status: { not: "CANCELED" },
        createdAt: { gte: since },
      },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        OR: [{ source: null }, { source: { not: "WEBSITE" } }],
        status: { not: "CANCELED" },
        createdAt: { gte: since },
      },
    }),
  ]);

  return {
    onlineBookings14d: online,
    manualBookings14d: manual,
    onlineBookingEnabled: shop?.onlineBookingEnabled ?? false,
  };
}

/** Load parsed booking settings for a shop. */
export async function getShopBookingSettings(shopId: string): Promise<BookingSettings> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      bookingSettings: true,
      apptDayStart: true,
      apptDayEnd: true,
    },
  });
  return parseBookingSettings(shop?.bookingSettings, {
    dayStart: shop?.apptDayStart,
    dayEnd: shop?.apptDayEnd,
  });
}

export { bookingHoursForDate, upcomingBookableDates, filterAvailableSlots };
