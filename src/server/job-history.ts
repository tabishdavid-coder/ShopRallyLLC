import "server-only";

import { prisma } from "@/db/client";
import type { ROStatus } from "@/generated/prisma";

export type HistoryRow = {
  id: string;
  roId: string;
  roNumber: number;
  date: Date;
  jobName: string;
  totalCents: number;
  status: ROStatus;
  authorized: boolean;
};

export type VehicleHistory = { history: HistoryRow[]; declined: HistoryRow[] };

/**
 * Past jobs for a vehicle across its OTHER repair orders, split into completed
 * history (authorized work) and declined jobs (never authorized).
 */
export async function getVehicleHistory(
  shopId: string,
  vehicleId: string,
  excludeRoId: string,
): Promise<VehicleHistory> {
  const ros = await prisma.repairOrder.findMany({
    where: { shopId, vehicleId, id: { not: excludeRoId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      number: true,
      status: true,
      createdAt: true,
      completedAt: true,
      jobs: {
        select: {
          id: true,
          name: true,
          authorized: true,
          laborLines: { select: { totalCents: true } },
          partLines: { select: { totalCents: true } },
        },
      },
    },
  });

  const history: HistoryRow[] = [];
  const declined: HistoryRow[] = [];
  for (const ro of ros) {
    for (const j of ro.jobs) {
      const totalCents =
        j.laborLines.reduce((s, l) => s + l.totalCents, 0) +
        j.partLines.reduce((s, p) => s + p.totalCents, 0);
      const row: HistoryRow = {
        id: j.id,
        roId: ro.id,
        roNumber: ro.number,
        date: ro.completedAt ?? ro.createdAt,
        jobName: j.name,
        totalCents,
        status: ro.status,
        authorized: j.authorized,
      };
      (j.authorized ? history : declined).push(row);
    }
  }
  return { history, declined };
}
