"use server";

import { z } from "zod";

import { prisma } from "@/db/client";
import { getShopId } from "@/lib/shop";
import { gates } from "@/server/permission-gates";
import {
  getCarMdForShop,
  type CarMdDtcLookupResult,
  type CarMdMaintenanceItem,
} from "@/server/services/carmd";

export type CarMdActionResult<T> = { ok: true; data: T; mode: "live" | "mock" } | { ok: false; error: string };

const DtcInput = z.object({
  roId: z.string().min(1),
  code: z
    .string()
    .trim()
    .min(4, "Enter a DTC code (e.g. P0420).")
    .max(12)
    .regex(/^[PCBU][0-9A-F]{4,6}$/i, "Use standard OBD-II format (e.g. P0420, C0035)."),
});

const MaintenanceInput = z.object({
  roId: z.string().min(1),
});

async function loadRoVehicle(shopId: string, roId: string) {
  return prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: {
      mileageIn: true,
      vehicle: {
        select: {
          vin: true,
          year: true,
          make: true,
          model: true,
        },
      },
    },
  });
}

/** On-demand DTC lookup — user-initiated only (estimate concerns panel). */
export async function lookupCarMdDtc(raw: unknown): Promise<CarMdActionResult<CarMdDtcLookupResult>> {
  const parsed = DtcInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid DTC code." };
  }

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await loadRoVehicle(shopId, parsed.data.roId);
  if (!ro) return { ok: false, error: "Repair order not found." };

  const provider = await getCarMdForShop(shopId);
  try {
    const data = await provider.lookupDtc({
      code: parsed.data.code,
      vehicle: {
        vin: ro.vehicle.vin,
        year: ro.vehicle.year,
        make: ro.vehicle.make,
        model: ro.vehicle.model,
        mileage: ro.mileageIn,
      },
    });
    return { ok: true, data, mode: data.mode };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "CarMD lookup failed." };
  }
}

/** On-demand maintenance schedule near current mileage. */
export async function getCarMdMaintenance(
  raw: unknown,
): Promise<CarMdActionResult<CarMdMaintenanceItem[]>> {
  const parsed = MaintenanceInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const ro = await loadRoVehicle(shopId, parsed.data.roId);
  if (!ro) return { ok: false, error: "Repair order not found." };

  if (ro.mileageIn == null) {
    return { ok: false, error: "Add mileage on the RO before requesting maintenance from CarMD." };
  }

  const provider = await getCarMdForShop(shopId);
  try {
    const data = await provider.getMaintenance({
      vin: ro.vehicle.vin,
      year: ro.vehicle.year,
      make: ro.vehicle.make,
      model: ro.vehicle.model,
      mileage: ro.mileageIn,
    });
    return { ok: true, data, mode: provider.mode };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "CarMD maintenance lookup failed." };
  }
}
