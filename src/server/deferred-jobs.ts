import "server-only";

import { prisma } from "@/db/client";
import type { ROStatus } from "@/generated/prisma";

export type DeferredJobRow = {
  id: string;
  jobName: string;
  totalCents: number;
  roId: string;
  roNumber: number;
  roStatus: ROStatus;
  vehicleLabel: string;
  /** When the customer/shop authorization decision happened (RO authorizedAt). */
  deferredAt: string;
};

/**
 * Customer-scoped declined work (UI: Declined tab): jobs quoted on an estimate
 * but not authorized after an approval decision (partial customer approve, shop
 * uncheck, etc.).
 *
 * Uses existing `Job.authorized` — no separate deferred model. Internal ids/
 * field names stay `deferred*` for deeplinks and API stability.
 */
export async function getCustomerDeferredJobs(
  shopId: string,
  customerId: string,
): Promise<DeferredJobRow[]> {
  const ros = await prisma.repairOrder.findMany({
    where: {
      shopId,
      customerId,
      OR: [{ authorizedAt: { not: null } }, { jobs: { some: { authorized: true } } }],
    },
    orderBy: { authorizedAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      authorizedAt: true,
      createdAt: true,
      vehicle: { select: { year: true, make: true, model: true } },
      jobs: {
        where: { authorized: false },
        select: {
          id: true,
          name: true,
          laborLines: { select: { totalCents: true } },
          partLines: { select: { totalCents: true } },
        },
      },
    },
  });

  const rows: DeferredJobRow[] = [];
  for (const ro of ros) {
    if (ro.jobs.length === 0) continue;
    const vehicleLabel =
      [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model].filter(Boolean).join(" ") ||
      "Vehicle";
    const deferredAt = (ro.authorizedAt ?? ro.createdAt).toISOString();
    for (const j of ro.jobs) {
      const totalCents =
        j.laborLines.reduce((s, l) => s + l.totalCents, 0) +
        j.partLines.reduce((s, p) => s + p.totalCents, 0);
      rows.push({
        id: j.id,
        jobName: j.name,
        totalCents,
        roId: ro.id,
        roNumber: ro.number,
        roStatus: ro.status,
        vehicleLabel,
        deferredAt,
      });
    }
  }

  return rows.sort((a, b) => b.deferredAt.localeCompare(a.deferredAt));
}
