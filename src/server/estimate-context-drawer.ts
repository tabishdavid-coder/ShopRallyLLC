import "server-only";

import { prisma } from "@/db/client";
import { getCustomerDetail } from "@/server/customer-detail";
import { getCustomerDeferredJobs } from "@/server/deferred-jobs";
import type { EstimateContextDrawerData } from "@/lib/estimate-context-drawer-types";

/** Load drawer payload for an RO customer — shop-scoped, JSON-safe. */
export async function loadEstimateContextDrawerData(
  shopId: string,
  customerId: string,
): Promise<EstimateContextDrawerData | null> {
  const detail = await getCustomerDetail(shopId, customerId);
  if (!detail) return null;

  const now = new Date();
  const appts = await prisma.appointment.findMany({
    where: {
      shopId,
      customerId,
      startAt: { gte: now },
      status: { not: "CANCELED" },
    },
    orderBy: { startAt: "asc" },
    take: 8,
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      status: true,
      vehicle: { select: { year: true, make: true, model: true } },
    },
  });

  const deferredJobs = await getCustomerDeferredJobs(shopId, customerId);

  return {
    detail: {
      id: detail.id,
      firstName: detail.firstName,
      lastName: detail.lastName,
      company: detail.company,
      email: detail.email,
      phone: detail.phone,
      altPhone: detail.altPhone,
      address: detail.address,
      city: detail.city,
      state: detail.state,
      zip: detail.zip,
      tags: detail.tags,
      notes: detail.notes,
      marketingOptIn: detail.marketingOptIn,
      transactionalSmsConsent: detail.transactionalSmsConsent,
      marketingEmailConsent: detail.marketingEmailConsent,
      deletedAt: detail.deletedAt?.toISOString() ?? null,
      anonymizedAt: detail.anonymizedAt?.toISOString() ?? null,
      leadSource: detail.leadSource,
      createdAt: detail.createdAt.toISOString(),
      vehicles: detail.vehicles,
      repairOrders: detail.repairOrders.map((ro) => ({
        id: ro.id,
        number: ro.number,
        status: ro.status,
        totalCents: ro.totalCents,
        createdAt: ro.createdAt.toISOString(),
        vehicleId: ro.vehicleId,
        vehicleLabel: ro.vehicleLabel,
        balanceCents: ro.balanceCents,
      })),
      lifetimeTotalCents: detail.lifetimeTotalCents,
      openBalanceCents: detail.openBalanceCents,
    },
    appointments: appts.map((a) => ({
      id: a.id,
      title: a.title,
      startAt: a.startAt.toISOString(),
      endAt: a.endAt.toISOString(),
      status: a.status,
      vehicleLabel: a.vehicle
        ? [a.vehicle.year, a.vehicle.make, a.vehicle.model].filter(Boolean).join(" ") || null
        : null,
    })),
    availableCreditCents: 0,
    deferredJobs,
  };
}
