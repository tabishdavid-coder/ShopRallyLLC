"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { Prisma } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import {
  isRecallsCacheFresh,
  parseRecallsCache,
  type NhtsaRecallItem,
  type VehicleRecallsCache,
} from "@/lib/vehicle-recalls";
import { fetchRecallsByVehicle } from "@/server/services/nhtsa-recalls";
import {
  VehicleMaintenanceOverridesSchema,
  parseMaintenanceOverrides,
  type VehicleMaintenanceOverrides,
} from "@/lib/vehicle-maintenance-specs";
import { gates } from "@/server/permission-gates";

export type VehicleRecallsResult =
  | { ok: true; items: NhtsaRecallItem[]; cached: boolean; fetchedAt: string }
  | { ok: false; error: string };

async function revalidateVehiclePaths(vehicleId: string, shopId: string) {
  const ros = await prisma.repairOrder.findMany({
    where: { shopId, vehicleId },
    select: { id: true },
  });
  revalidatePath("/repair-orders");
  for (const ro of ros) {
    revalidatePath(`/repair-orders/${ro.id}`);
  }
}

/** Load NHTSA recalls for the vehicle (cached ~7 days on Vehicle.recallsCache). */
export async function loadVehicleRecalls(vehicleId: string): Promise<VehicleRecallsResult> {
  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: {
      id: true,
      year: true,
      make: true,
      model: true,
      recallsCache: true,
    },
  });

  if (!vehicle) return { ok: false, error: "Vehicle not found." };
  if (!vehicle.year || !vehicle.make?.trim() || !vehicle.model?.trim()) {
    return {
      ok: false,
      error: "Add year, make, and model on the vehicle to look up NHTSA recalls.",
    };
  }

  const cached = parseRecallsCache(vehicle.recallsCache);
  if (isRecallsCacheFresh(cached)) {
    return {
      ok: true,
      items: cached!.items,
      cached: true,
      fetchedAt: cached!.fetchedAt,
    };
  }

  try {
    const items = await fetchRecallsByVehicle({
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
    });

    const payload: VehicleRecallsCache = {
      fetchedAt: new Date().toISOString(),
      items,
    };

    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: { recallsCache: payload as object },
    });

    await revalidateVehiclePaths(vehicle.id, shopId);

    return { ok: true, items, cached: false, fetchedAt: payload.fetchedAt };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load recalls.";
    return { ok: false, error: message };
  }
}

const UpdateTireSizesInput = z.object({
  vehicleId: z.string().min(1),
  tireSizeFront: z.string().trim().max(40).nullable(),
  tireSizeRear: z.string().trim().max(40).nullable(),
});

export type UpdateTireSizesResult = { ok: true } | { ok: false; error: string };

export async function updateVehicleTireSizes(
  raw: z.infer<typeof UpdateTireSizesInput>,
): Promise<UpdateTireSizesResult> {
  const parsed = UpdateTireSizesInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid tire size." };

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;
  const { vehicleId, tireSizeFront, tireSizeRear } = parsed.data;

  const existing = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Vehicle not found." };

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      tireSizeFront: tireSizeFront?.trim() || null,
      tireSizeRear: tireSizeRear?.trim() || null,
    },
  });

  await revalidateVehiclePaths(vehicleId, shopId);
  return { ok: true };
}

export type LastTireOrderSize = {
  tireSizeFront: string | null;
  tireSizeRear: string | null;
  createdAt: string;
};

/** Latest tire order with a size recorded for this vehicle. */
export async function getLastTireOrderSize(
  shopId: string,
  vehicleId: string,
): Promise<LastTireOrderSize | null> {
  const row = await prisma.tireOrder.findFirst({
    where: {
      shopId,
      vehicleId,
      OR: [{ tireSizeFront: { not: null } }, { tireSizeRear: { not: null } }],
    },
    orderBy: { createdAt: "desc" },
    select: { tireSizeFront: true, tireSizeRear: true, createdAt: true },
  });
  if (!row) return null;
  return {
    tireSizeFront: row.tireSizeFront,
    tireSizeRear: row.tireSizeRear,
    createdAt: row.createdAt.toISOString(),
  };
}

const UpdateMaintenanceSpecsInput = z.object({
  vehicleId: z.string().min(1),
  specs: VehicleMaintenanceOverridesSchema,
});

export type UpdateMaintenanceSpecsResult = { ok: true } | { ok: false; error: string };

/** Save advisor maintenance overrides (fluids, filters, battery) on the vehicle. */
export async function updateVehicleMaintenanceSpecs(
  raw: z.infer<typeof UpdateMaintenanceSpecsInput>,
): Promise<UpdateMaintenanceSpecsResult> {
  const parsed = UpdateMaintenanceSpecsInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid maintenance specs." };

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;
  const { vehicleId, specs } = parsed.data;

  const existing = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { id: true, maintenanceSpecs: true },
  });
  if (!existing) return { ok: false, error: "Vehicle not found." };

  const current = parseMaintenanceOverrides(existing.maintenanceSpecs);
  const merged: VehicleMaintenanceOverrides = { ...current };

  for (const [key, value] of Object.entries(specs) as Array<
    [keyof VehicleMaintenanceOverrides, string | null | undefined]
  >) {
    if (value === undefined) continue;
    merged[key] = value?.trim() || null;
  }

  const hasAny = Object.values(merged).some((v) => Boolean(v?.trim()));
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      maintenanceSpecs: hasAny ? (merged as object) : Prisma.DbNull,
    },
  });

  await revalidateVehiclePaths(vehicleId, shopId);
  return { ok: true };
}

export type FetchVehicleSpecsBundleResult =
  | { ok: true; data: import("@/lib/estimate-lab-vehicle-specs").EstimateLabVehicleSpecsBundle }
  | { ok: false; error: string };

/** Load specs bundle for any shop vehicle (context drawer, non-RO vehicles). */
export async function fetchVehicleSpecsBundle(
  vehicleId: string,
  options?: { excludeRoId?: string },
): Promise<FetchVehicleSpecsBundleResult> {
  if (!vehicleId.trim()) return { ok: false, error: "Vehicle not found." };
  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const { getVehicleSpecsBundle } = await import("@/server/vehicle-specs-bundle");
  const data = await getVehicleSpecsBundle(shopId, vehicleId, options);
  if (!data) return { ok: false, error: "Vehicle not found." };
  return { ok: true, data };
}
