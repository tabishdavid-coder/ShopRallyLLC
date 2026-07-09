import "server-only";

import { prisma } from "@/db/client";
import { buildServiceAdvisor, type ServiceAdvisorInfo } from "@/lib/service-advisor";
import { ensureAutoApplyFees } from "@/server/ro-fees";

async function ensureConcernRecords(
  shopId: string,
  ro: { id: string; concerns: string[] },
): Promise<boolean> {
  if (!ro.concerns.length) return false;
  const existing = await prisma.concern.count({
    where: { repairOrderId: ro.id, kind: "CUSTOMER" },
  });
  if (existing > 0) return false;
  await prisma.concern.createMany({
    data: ro.concerns.map((text, i) => ({
      shopId,
      repairOrderId: ro.id,
      kind: "CUSTOMER",
      text,
      sortOrder: i,
    })),
  });
  return true;
}

/** Full repair order for the detail page, with resolved staff names. */
export async function getRepairOrder(opts: { shopId: string; id: string }) {
  const ro = await prisma.repairOrder.findFirst({
    where: { id: opts.id, shopId: opts.shopId },
    include: {
      customer: true,
      vehicle: true,
      jobs: {
        orderBy: { sortOrder: "asc" },
        include: {
          laborLines: { orderBy: { sortOrder: "asc" } },
          partLines: { orderBy: { sortOrder: "asc" } },
        },
      },
      fees: { orderBy: { createdAt: "asc" } },
      discounts: { orderBy: { createdAt: "asc" } },
      vehicleConcerns: { orderBy: { sortOrder: "asc" } },
      inspections: {
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
      activities: { orderBy: { createdAt: "desc" } },
      invoice: { include: { payments: true } },
      shop: {
        select: {
          name: true,
          laborRateCents: true,
          taxRateBps: true,
          taxOnLabor: true,
          taxOnParts: true,
          taxOnFees: true,
          taxCapCents: true,
          gpPerHourGoalCents: true,
          estimateJobsLayout: true,
          partMatrix: { orderBy: { sortOrder: "asc" }, select: { minCents: true, maxCents: true, multiplier: true } },
          laborMatrix: { orderBy: { sortOrder: "asc" }, select: { minHours: true, maxHours: true, multiplier: true } },
        },
      },
    },
  });

  if (!ro) return null;

  await ensureConcernRecords(opts.shopId, { id: ro.id, concerns: ro.concerns });
  if (ro.concerns.length && ro.vehicleConcerns.length === 0) {
    ro.vehicleConcerns = await prisma.concern.findMany({
      where: { repairOrderId: ro.id },
      orderBy: { sortOrder: "asc" },
    });
  }

  if (await ensureAutoApplyFees(opts.shopId, opts.id)) {
    ro.fees = await prisma.fee.findMany({
      where: { shopId: opts.shopId, repairOrderId: opts.id },
      orderBy: { createdAt: "asc" },
    });
  }

  // Resolve service-writer / technician user ids → names.
  const userIds = [ro.serviceWriterId, ro.technicianId].filter(
    (x): x is string => Boolean(x),
  );
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      })
    : [];
  const nameOf = (id: string | null) => {
    if (!id) return null;
    const u = users.find((x) => x.id === id);
    return u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : null;
  };
  const serviceWriter = ro.serviceWriterId
    ? users.find((x) => x.id === ro.serviceWriterId)
    : null;
  const serviceAdvisor: ServiceAdvisorInfo = buildServiceAdvisor(serviceWriter);

  return {
    ...ro,
    serviceWriterName: nameOf(ro.serviceWriterId),
    technicianName: nameOf(ro.technicianId),
    serviceAdvisor,
  };
}

export type RepairOrderDetail = NonNullable<
  Awaited<ReturnType<typeof getRepairOrder>>
>;

/** "RO #428: Sentra Nissan's 2019 Nissan Sentra LE" — falls back to plate when YMM missing. */
export function repairOrderTitle(ro: RepairOrderDetail): string {
  const cust = `${ro.customer.lastName} ${ro.customer.firstName}`.trim();
  const v = ro.vehicle;
  const ymm = v ? [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ") : "";
  const plate =
    v?.plate && !ymm
      ? `${v.plate}${v.plateState ? ` ${v.plateState}` : ""}`
      : "";
  const vehicle = ymm || plate || "vehicle";
  return `RO #${ro.number}: ${cust}'s ${vehicle}`;
}
