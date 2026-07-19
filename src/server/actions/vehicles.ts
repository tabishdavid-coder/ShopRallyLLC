"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { Prisma } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import {
  CreateVehicleInputSchema,
  UpdateVehicleInputSchema,
  type CreateVehicleInput,
  type CreateVehicleResult,
  type UpdateVehicleInput,
  type UpdateVehicleResult,
} from "@/lib/vehicle-schemas";
import { isValidVin, type DecodedVin, decodeVinForShop } from "@/server/services/vin";
import { lookupPlateService } from "@/server/services/plate-lookup";
import {
  decodeOverageNotice,
  getDecodeUsageSummary,
  recordDecodeUsage,
} from "@/server/services/decode-usage";
import { gates } from "@/server/permission-gates";
import { canUseFeature } from "@/lib/subscription";

type DecodeVinResult =
  | { ok: true; decoded: DecodedVin; usageNotice?: string }
  | { ok: false; error: string };

type MeteredPlateResult =
  | { ok: true; decoded: DecodedVin; vin: string | null; usageNotice?: string }
  | { ok: false; error: string };

async function afterSuccessfulDecode(
  shopId: string,
  kind: "VIN" | "PLATE",
): Promise<string | undefined> {
  await recordDecodeUsage(shopId, kind);
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { plan: true, planFeatures: true },
  });
  if (!shop) return undefined;
  const summary = await getDecodeUsageSummary({
    shopId,
    plan: shop.plan,
    planFeatures: shop.planFeatures,
  });
  return decodeOverageNotice(summary) ?? undefined;
}

/** Decode a VIN (NHTSA on Core; Auto.dev + NHTSA fallback on Pro+). Counts toward Core meter on success. */
export async function decodeVin(vin: string): Promise<DecodeVinResult> {
  const v = vin.trim().toUpperCase();
  if (!isValidVin(v)) {
    return { ok: false, error: "Enter a valid 17-character VIN." };
  }
  try {
    const shopId = await getShopId();
    const decoded = await decodeVinForShop(shopId, v);
    if (!decoded || (!decoded.make && !decoded.model && !decoded.year)) {
      return { ok: false, error: "Couldn't decode that VIN. Check it and try again." };
    }
    const usageNotice = await afterSuccessfulDecode(shopId, "VIN");
    return { ok: true, decoded, usageNotice };
  } catch {
    return { ok: false, error: "VIN service is unavailable right now." };
  }
}

/** Look up a US license plate → vehicle (Auto.dev when configured). Pro+ only — Core enters plate manually. */
export async function lookupPlate(state: string, plate: string): Promise<MeteredPlateResult> {
  const shopId = await getShopId();
  if (!(await canUseFeature(shopId, "autodevDecoding"))) {
    return {
      ok: false,
      error:
        "Plate lookup is not included on Core. Enter the plate manually, decode a 17-character VIN (NHTSA), or fill in year/make/model.",
    };
  }
  const result = await lookupPlateService(plate, state);
  if (!result.ok) return result;
  const usageNotice = await afterSuccessfulDecode(shopId, "PLATE");
  return { ...result, usageNotice };
}

/** @deprecated Use lookupPlate — kept for existing callers. */
export async function decodePlate(state: string, plate: string): Promise<MeteredPlateResult> {
  return lookupPlate(state, plate);
}

export async function createVehicle(
  raw: CreateVehicleInput,
): Promise<CreateVehicleResult> {
  const parsed = CreateVehicleInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid vehicle details." };
  const d = parsed.data;

  if (!d.make && !d.model && !d.year) {
    return { ok: false, error: "A vehicle needs at least a year, make, or model." };
  }

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;
  // Ensure the customer belongs to this shop (tenant safety).
  const customer = await prisma.customer.findFirst({
    where: { id: d.customerId, shopId },
    select: { id: true },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const vehicle = await prisma.vehicle.create({
    data: {
      shopId,
      customerId: d.customerId,
      vin: d.vin || null,
      year: d.year ?? null,
      make: d.make ?? null,
      model: d.model ?? null,
      trim: d.trim ?? null,
      engine: d.engine ?? null,
      transmission: d.transmission ?? null,
      drivetrain: d.drivetrain ?? null,
      bodyClass: d.bodyClass ?? null,
      plate: d.plate ?? null,
      plateState: d.plateState ?? null,
      color: d.color ?? null,
      unitNumber: d.unitNumber ?? null,
      notes: d.notes ?? null,
      decodedData: d.decodedData ? (d.decodedData as object) : undefined,
    },
    select: { id: true, year: true, make: true, model: true, trim: true },
  });

  if (d.initialMileage != null && d.initialMileage > 0) {
    const miles =
      d.mileageUnits === "km" ? Math.round(d.initialMileage * 0.621371) : d.initialMileage;
    await prisma.mileageRecord.create({
      data: {
        shopId,
        vehicleId: vehicle.id,
        miles,
        source: "intake",
      },
    });
  }

  revalidatePath("/customers");
  const label = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");
  return { ok: true, id: vehicle.id, label };
}

/** Update vehicle fields from the RO sidebar. */
export async function updateVehicle(
  raw: UpdateVehicleInput,
): Promise<UpdateVehicleResult> {
  const parsed = UpdateVehicleInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid vehicle details." };
  const d = parsed.data;

  const shopId = await getShopId();
  const denied = await gates.customersView(shopId);
  if (denied) return denied;
  const existing = await prisma.vehicle.findFirst({
    where: { id: d.id, shopId },
    select: { id: true, customerId: true, year: true, make: true, model: true },
  });
  if (!existing) return { ok: false, error: "Vehicle not found." };

  const ymmeChanged =
    (d.year ?? null) !== existing.year ||
    (d.make ?? null) !== (existing.make ?? null) ||
    (d.model ?? null) !== (existing.model ?? null);

  const vehicle = await prisma.vehicle.update({
    where: { id: d.id },
    data: {
      vin: d.vin || null,
      year: d.year ?? null,
      make: d.make ?? null,
      model: d.model ?? null,
      trim: d.trim ?? null,
      engine: d.engine ?? null,
      transmission: d.transmission ?? null,
      drivetrain: d.drivetrain ?? null,
      bodyClass: d.bodyClass ?? null,
      plate: d.plate ?? null,
      plateState: d.plateState ?? null,
      color: d.color ?? null,
      unitNumber: d.unitNumber ?? null,
      notes: d.notes ?? null,
      tireSizeFront: d.tireSizeFront?.trim() || null,
      tireSizeRear: d.tireSizeRear?.trim() || null,
      decodedData: d.decodedData ? (d.decodedData as object) : undefined,
      ...(ymmeChanged ? { recallsCache: Prisma.DbNull } : {}),
    },
    select: { id: true, year: true, make: true, model: true, trim: true },
  });

  const roIds = await prisma.repairOrder.findMany({
    where: { shopId, vehicleId: d.id },
    select: { id: true },
  });

  revalidatePath("/customers");
  revalidatePath(`/customers/${existing.customerId}`);
  revalidatePath("/repair-orders");
  revalidatePath("/job-board");
  for (const ro of roIds) {
    revalidatePath(`/repair-orders/${ro.id}`);
  }
  const label = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");
  return { ok: true, id: vehicle.id, label };
}
