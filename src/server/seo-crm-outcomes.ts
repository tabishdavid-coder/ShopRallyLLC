import "server-only";

import { prisma } from "@/db/client";
import type { SeoCrmOutcomesView } from "@/lib/seo-crm-outcomes";
import { pctDelta } from "@/lib/seo-analytics";

const WINDOW_DAYS = 28;

function windowStart(daysAgo: number): Date {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
}

const WEB_LEAD_FILTER = {
  OR: [
    { leadSource: { equals: "Website", mode: "insensitive" as const } },
    { leadSource: { startsWith: "Website", mode: "insensitive" as const } },
  ],
};

const WEB_RO_SOURCES = ["Website", "Online Booking", "Google", "Online booking"];

export async function getSeoCrmOutcomes(shopId: string): Promise<SeoCrmOutcomesView> {
  const now = Date.now();
  const currentStart = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const priorStart = new Date(now - WINDOW_DAYS * 2 * 24 * 60 * 60 * 1000);

  const [
    shop,
    onlineAppointments,
    priorOnlineAppointments,
    newWebCustomers,
    priorNewWebCustomers,
    websiteRepairOrders,
    priorWebsiteRepairOrders,
  ] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { onlineBookingEnabled: true },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        source: "WEBSITE",
        status: { not: "CANCELED" },
        createdAt: { gte: currentStart },
      },
    }),
    prisma.appointment.count({
      where: {
        shopId,
        source: "WEBSITE",
        status: { not: "CANCELED" },
        createdAt: { gte: priorStart, lt: currentStart },
      },
    }),
    prisma.customer.count({
      where: {
        shopId,
        createdAt: { gte: currentStart },
        AND: [WEB_LEAD_FILTER],
      },
    }),
    prisma.customer.count({
      where: {
        shopId,
        createdAt: { gte: priorStart, lt: currentStart },
        AND: [WEB_LEAD_FILTER],
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        createdAt: { gte: currentStart },
        marketingSource: { in: WEB_RO_SOURCES },
      },
    }),
    prisma.repairOrder.count({
      where: {
        shopId,
        createdAt: { gte: priorStart, lt: currentStart },
        marketingSource: { in: WEB_RO_SOURCES },
      },
    }),
  ]);

  return {
    days: WINDOW_DAYS,
    onlineAppointments,
    priorOnlineAppointments,
    onlineAppointmentsDeltaPct: pctDelta(onlineAppointments, priorOnlineAppointments),
    newWebCustomers,
    priorNewWebCustomers,
    newWebCustomersDeltaPct: pctDelta(newWebCustomers, priorNewWebCustomers),
    websiteRepairOrders,
    priorWebsiteRepairOrders,
    websiteRepairOrdersDeltaPct: pctDelta(websiteRepairOrders, priorWebsiteRepairOrders),
    onlineBookingEnabled: shop?.onlineBookingEnabled ?? false,
  };
}
