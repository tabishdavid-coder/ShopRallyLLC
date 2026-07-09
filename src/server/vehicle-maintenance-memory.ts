import "server-only";

import { ROStatus } from "@/generated/prisma";
import { prisma } from "@/db/client";
import {
  buildHistoryHits,
  buildMaintenanceMemoryView,
  parseMaintenanceOverrides,
  type VehicleMaintenanceMemoryView,
} from "@/lib/vehicle-maintenance-specs";

const HISTORY_STATUSES = [
  ROStatus.APPROVED,
  ROStatus.IN_PROGRESS,
  ROStatus.COMPLETED,
  ROStatus.INVOICED,
] as const;

/** Shop memory: advisor overrides merged with parts from recent ROs on this vehicle. */
export async function getVehicleMaintenanceMemory(
  shopId: string,
  vehicleId: string,
  opts?: { excludeRoId?: string },
): Promise<VehicleMaintenanceMemoryView> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { maintenanceSpecs: true },
  });

  const overrides = parseMaintenanceOverrides(vehicle?.maintenanceSpecs);

  const ros = await prisma.repairOrder.findMany({
    where: {
      shopId,
      vehicleId,
      status: { in: [...HISTORY_STATUSES] },
      ...(opts?.excludeRoId ? { id: { not: opts.excludeRoId } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: {
      number: true,
      updatedAt: true,
      jobs: {
        select: {
          name: true,
          partLines: {
            select: {
              description: true,
              partNumber: true,
              brand: true,
              quantity: true,
            },
          },
        },
      },
    },
  });

  const history = buildHistoryHits(ros);
  return buildMaintenanceMemoryView(overrides, history);
}
