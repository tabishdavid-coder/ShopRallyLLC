"use server";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { getServiceHistory, type VehicleHistory } from "@/server/services/service-history";
import { gates } from "@/server/permission-gates";

export type ServiceHistoryResult =
  | { ok: true; mode: "live" | "mock"; history: VehicleHistory | null }
  | { ok: false; error: string; needsVin?: boolean };

/** Pull a vehicle's prior service history (Carfax live, mock otherwise). */
export async function getVehicleServiceHistory(vehicleId: string): Promise<ServiceHistoryResult> {
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { vin: true },
  });
  if (!vehicle) return { ok: false, error: "Vehicle not found." };
  if (!vehicle.vin) {
    return { ok: false, error: "Add a VIN to this vehicle to pull its Carfax service history.", needsVin: true };
  }

  const provider = getServiceHistory();
  try {
    const history = await provider.lookup(vehicle.vin);
    return { ok: true, mode: provider.mode, history };
  } catch {
    return { ok: false, error: "Service-history lookup is unavailable right now." };
  }
}
