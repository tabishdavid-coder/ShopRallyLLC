import { prisma } from "@/db/client";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";
import { vehicleSpecsView } from "@/lib/vehicle-specs-view";
import { getLastTireOrderSize } from "@/server/actions/vehicle-specs";
import { getVehicleMaintenanceMemory } from "@/server/vehicle-maintenance-memory";

/** Build vehicle specs bundle for estimate lab surfaces (rail, drawer, dialog). */
export async function getVehicleSpecsBundle(
  shopId: string,
  vehicleId: string,
  options?: { excludeRoId?: string },
): Promise<EstimateLabVehicleSpecsBundle | null> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: {
      id: true,
      vin: true,
      year: true,
      make: true,
      model: true,
      trim: true,
      engine: true,
      transmission: true,
      drivetrain: true,
      bodyClass: true,
      decodedData: true,
      tireSizeFront: true,
      tireSizeRear: true,
    },
  });
  if (!vehicle) return null;

  const [lastTireOrder, maintenanceMemory] = await Promise.all([
    getLastTireOrderSize(shopId, vehicleId),
    getVehicleMaintenanceMemory(shopId, vehicleId, { excludeRoId: options?.excludeRoId }),
  ]);

  return {
    vehicleId: vehicle.id,
    specs: vehicleSpecsView(vehicle),
    tireSizeFront: vehicle.tireSizeFront ?? null,
    tireSizeRear: vehicle.tireSizeRear ?? null,
    lastTireOrder,
    maintenanceMemory,
  };
}
