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
import {
  FLUIDS_ENRICH_META_KEY,
  FLUID_ENRICH_SLOT_KEYS,
  acceptFluidEnrichField,
  buildFluidsIdentityKey,
  extractFluidsEnrichMetaFromMaintenanceSpecs,
  fluidsEnrichCacheValid,
  type FluidEnrichSlotKey,
  type FluidsEnrichMeta,
  type FluidsEnrichStatus,
} from "@/lib/vehicle-fluids-enrich";
import { isReleased } from "@/lib/subscription";
import { isAiConfigured } from "@/server/services/ai/client";
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
  const enrichMeta = extractFluidsEnrichMetaFromMaintenanceSpecs(existing.maintenanceSpecs);
  const merged: VehicleMaintenanceOverrides = { ...current };
  const nextAiKeys = new Set(enrichMeta?.aiKeys ?? []);
  const nextFieldMeta = { ...(enrichMeta?.fields ?? {}) };

  for (const [key, value] of Object.entries(specs) as Array<
    [keyof VehicleMaintenanceOverrides, string | null | undefined]
  >) {
    if (value === undefined) continue;
    merged[key] = value?.trim() || null;
    if (value?.trim()) {
      nextAiKeys.delete(key as FluidEnrichSlotKey);
      delete nextFieldMeta[key as FluidEnrichSlotKey];
    }
  }

  const hasAny = Object.values(merged).some((v) => Boolean(v?.trim()));
  const nextMaintenanceSpecs = buildMaintenanceSpecsPayload(
    merged,
    enrichMeta
      ? {
          ...enrichMeta,
          aiKeys: [...nextAiKeys],
          fields: nextFieldMeta,
        }
      : null,
    hasAny,
  );

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      maintenanceSpecs: nextMaintenanceSpecs,
    },
  });

  await revalidateVehiclePaths(vehicleId, shopId);
  return { ok: true };
}

export type FetchVehicleSpecsBundleResult =
  | { ok: true; data: import("@/lib/estimate-lab-vehicle-specs").EstimateLabVehicleSpecsBundle }
  | { ok: false; error: string };

export type VehicleSpecsEngineOption = {
  label: string;
  /** EPA vehicle record id — used to pull transmission/drive/body. */
  epaVehicleId: string;
};

export type OpenVehicleSpecsSessionResult =
  | {
      ok: true;
      data: import("@/lib/estimate-lab-vehicle-specs").EstimateLabVehicleSpecsBundle;
      /** Present when YMM is known but engine is still empty — user picks, no guessing. */
      engineOptions: VehicleSpecsEngineOption[];
      /** What happened during this Specs open (for UI hint). */
      refreshNote: string | null;
      /** Fluids AI enrich outcome for this open. */
      fluidsEnrichStatus: FluidsEnrichStatus;
      fluidsEnrichNote: string | null;
    }
  | { ok: false; error: string };

function buildMaintenanceSpecsPayload(
  overrides: VehicleMaintenanceOverrides,
  enrichMeta: FluidsEnrichMeta | null,
  hasAnyOverride: boolean,
): object | typeof Prisma.DbNull {
  if (!hasAnyOverride && !enrichMeta) return Prisma.DbNull;
  const payload: Record<string, unknown> = { ...overrides };
  if (enrichMeta && (enrichMeta.aiKeys.length > 0 || enrichMeta.identityKey)) {
    payload[FLUIDS_ENRICH_META_KEY] = enrichMeta;
  }
  return payload;
}

function fluidSlotFilled(
  memory: import("@/lib/vehicle-maintenance-specs").VehicleMaintenanceMemoryView,
  key: FluidEnrichSlotKey,
): boolean {
  const rows = [...memory.fluids, ...memory.batteries];
  return rows.some((r) => r.key === key && Boolean(r.value?.trim()));
}

function fluidsEnrichNoteForStatus(
  status: FluidsEnrichStatus,
  filledCount: number,
): string | null {
  switch (status) {
    case "enriched":
      return `Loaded ${filledCount} fluid spec${filledCount === 1 ? "" : "s"} for this vehicle.`;
    case "partial":
      return `Loaded ${filledCount} fluid spec${filledCount === 1 ? "" : "s"} — others omitted when confidence was too low.`;
    case "skipped_cache":
      return "Fluids loaded from saved vehicle reference.";
    case "skipped_ai_gated":
      return "AI fluid lookup is not available for this shop — add AI Suite or configure GEMINI_API_KEY.";
    case "abstained":
      return "AI could not confirm fluid specs for this configuration — values left blank.";
    case "failed":
      return "Fluid lookup failed — try reopening Specs.";
    default:
      return null;
  }
}

export type EnrichVehicleFluidsResult = {
  status: FluidsEnrichStatus;
  note: string | null;
  ran: boolean;
  filledCount: number;
};

/**
 * On-demand fluids enrich — only from Specs open path.
 * Prefers advisor overrides + shop history; AI fills empty slots above confidence gate.
 */
export async function enrichVehicleFluidsOnSpecsOpen(
  shopId: string,
  vehicleId: string,
  options?: { excludeRoId?: string; forceRefresh?: boolean },
): Promise<EnrichVehicleFluidsResult> {
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
      maintenanceSpecs: true,
    },
  });

  if (!vehicle) {
    return { status: "failed", note: "Vehicle not found.", ran: false, filledCount: 0 };
  }

  const identityKey = buildFluidsIdentityKey(vehicle);
  if (!identityKey) {
    return { status: "skipped_no_ymm", note: null, ran: false, filledCount: 0 };
  }

  const { getVehicleMaintenanceMemory } = await import("@/server/vehicle-maintenance-memory");
  const memory = await getVehicleMaintenanceMemory(shopId, vehicleId, {
    excludeRoId: options?.excludeRoId,
  });

  const emptySlots = FLUID_ENRICH_SLOT_KEYS.filter((key) => !fluidSlotFilled(memory, key));
  if (emptySlots.length === 0) {
    return { status: "skipped_complete", note: null, ran: false, filledCount: 0 };
  }

  const existingMeta = extractFluidsEnrichMetaFromMaintenanceSpecs(vehicle.maintenanceSpecs);
  if (!options?.forceRefresh && fluidsEnrichCacheValid(existingMeta, identityKey)) {
    return {
      status: "skipped_cache",
      note: fluidsEnrichNoteForStatus("skipped_cache", 0),
      ran: false,
      filledCount: 0,
    };
  }

  const aiSuiteReleased = await isReleased(shopId, "aiSuite");
  if (!aiSuiteReleased || !isAiConfigured()) {
    return {
      status: "skipped_ai_gated",
      note: fluidsEnrichNoteForStatus("skipped_ai_gated", 0),
      ran: false,
      filledCount: 0,
    };
  }

  try {
    const { lookupVehicleFluidsWithAi } = await import("@/server/services/vehicle-fluids-enrich");
    const aiResult = await lookupVehicleFluidsWithAi(shopId, vehicle, vehicle.decodedData);

    const overrides = parseMaintenanceOverrides(vehicle.maintenanceSpecs);
    const nextAiKeys = new Set<FluidEnrichSlotKey>(
      existingMeta?.identityKey === identityKey ? existingMeta.aiKeys : [],
    );
    const nextFieldMeta: FluidsEnrichMeta["fields"] =
      existingMeta?.identityKey === identityKey ? { ...existingMeta.fields } : {};

    let filledCount = 0;
    for (const key of emptySlots) {
      const accepted = acceptFluidEnrichField(aiResult[key]);
      if (!accepted) continue;
      overrides[key] = accepted.value;
      nextAiKeys.add(key);
      nextFieldMeta[key] = {
        confidence: accepted.confidence,
        sourceNote: accepted.sourceNote,
      };
      filledCount += 1;
    }

    const enrichMeta: FluidsEnrichMeta = {
      identityKey,
      enrichedAt: new Date().toISOString(),
      aiKeys: [...nextAiKeys],
      fields: nextFieldMeta,
    };

    const hasAnyOverride = Object.values(overrides).some((v) => Boolean(v?.trim()));
    await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        maintenanceSpecs: buildMaintenanceSpecsPayload(overrides, enrichMeta, hasAnyOverride),
      },
    });

    await revalidateVehiclePaths(vehicle.id, shopId);

    if (filledCount === 0) {
      return {
        status: "abstained",
        note: fluidsEnrichNoteForStatus("abstained", 0),
        ran: true,
        filledCount: 0,
      };
    }

    const status: FluidsEnrichStatus =
      filledCount < emptySlots.length ? "partial" : "enriched";

    return {
      status,
      note: fluidsEnrichNoteForStatus(status, filledCount),
      ran: true,
      filledCount,
    };
  } catch {
    return {
      status: "failed",
      note: fluidsEnrichNoteForStatus("failed", 0),
      ran: true,
      filledCount: 0,
    };
  }
}

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

/**
 * Specs button open path — always fresh from DB.
 * - If VIN is on the vehicle and identity is thin → NHTSA decode + persist (on Specs open only).
 * - If engine still missing → EPA engine options for user pick (no silent guess).
 */
export async function openVehicleSpecsSession(
  vehicleId: string,
  options?: { excludeRoId?: string },
): Promise<OpenVehicleSpecsSessionResult> {
  if (!vehicleId.trim()) return { ok: false, error: "Vehicle not found." };
  const shopId = await getShopId();
  const denied = await gates.estimateView(shopId);
  if (denied) return { ok: false, error: denied.error };

  const { getVehicleSpecsBundle } = await import("@/server/vehicle-specs-bundle");
  let data = await getVehicleSpecsBundle(shopId, vehicleId, options);
  if (!data) return { ok: false, error: "Vehicle not found." };

  let refreshNote: string | null = null;
  const vin = data.specs.vin?.trim().toUpperCase() ?? "";
  const needsDecode =
    Boolean(vin) &&
    (!data.specs.engine || !data.specs.transmission || !data.specs.drivetrain || !data.specs.bodyClass);

  if (needsDecode) {
    const { isValidVin, decodeVinForShop } = await import("@/server/services/vin");
    if (isValidVin(vin)) {
      try {
        const decoded = await decodeVinForShop(shopId, vin);
        if (decoded && (decoded.make || decoded.model || decoded.year)) {
          const row = await prisma.vehicle.findFirst({
            where: { id: vehicleId, shopId },
            select: {
              year: true,
              make: true,
              model: true,
              trim: true,
              engine: true,
              transmission: true,
              drivetrain: true,
              bodyClass: true,
            },
          });
          if (row) {
            await prisma.vehicle.update({
              where: { id: vehicleId },
              data: {
                year: row.year ?? decoded.year,
                make: row.make?.trim() || decoded.make,
                model: row.model?.trim() || decoded.model,
                trim: row.trim?.trim() || decoded.trim,
                engine: row.engine?.trim() || decoded.engine,
                transmission: row.transmission?.trim() || decoded.transmission,
                drivetrain: row.drivetrain?.trim() || decoded.drivetrain,
                bodyClass: row.bodyClass?.trim() || decoded.bodyClass,
                decodedData: decoded.raw ? (decoded.raw as object) : undefined,
              },
            });
            const { recordDecodeUsage } = await import("@/server/services/decode-usage");
            await recordDecodeUsage(shopId, "VIN").catch(() => undefined);
            data = (await getVehicleSpecsBundle(shopId, vehicleId, options)) ?? data;
            refreshNote = "VIN decoded for this Specs open.";
            await revalidateVehiclePaths(vehicleId, shopId);
          }
        }
      } catch {
        refreshNote = "VIN is saved; decode was unavailable — pick an engine below if listed.";
      }
    }
  }

  let engineOptions: VehicleSpecsEngineOption[] = [];
  const year = data.specs.year;
  const make = data.specs.make?.trim() ?? "";
  const model = data.specs.model?.trim() ?? "";
  const trim = data.specs.trim?.trim() ?? "";

  if (!data.specs.engine?.trim() && year && make && model) {
    const { fetchTrims, fetchEngines } = await import("@/server/services/vehicle-catalog");
    const trims = await fetchTrims(make, year, model);
    const trimCandidates = [
      ...(trim ? [trim] : []),
      ...trims.filter((t) => t.toLowerCase() !== trim.toLowerCase()),
      model,
    ];
    const seen = new Set<string>();
    for (const candidate of trimCandidates) {
      if (!candidate || seen.has(candidate.toLowerCase())) continue;
      seen.add(candidate.toLowerCase());
      const engines = await fetchEngines(make, year, candidate);
      if (engines.length) {
        engineOptions = engines.map((e) => ({
          label: e.label,
          epaVehicleId: e.vehicleId,
        }));
        break;
      }
    }
  }

  let fluidsEnrichStatus: FluidsEnrichStatus = "skipped_complete";
  let fluidsEnrichNote: string | null = null;

  if (vehicleHasYmmForEnrich(data)) {
    const enrich = await enrichVehicleFluidsOnSpecsOpen(shopId, vehicleId, options);
    fluidsEnrichStatus = enrich.status;
    fluidsEnrichNote = enrich.note;
    if (enrich.ran) {
      data = (await getVehicleSpecsBundle(shopId, vehicleId, options)) ?? data;
    }
  } else {
    fluidsEnrichStatus = "skipped_no_ymm";
  }

  return {
    ok: true,
    data,
    engineOptions,
    refreshNote,
    fluidsEnrichStatus,
    fluidsEnrichNote,
  };
}

function vehicleHasYmmForEnrich(
  bundle: import("@/lib/estimate-lab-vehicle-specs").EstimateLabVehicleSpecsBundle,
): boolean {
  return Boolean(bundle.specs.year && bundle.specs.make?.trim() && bundle.specs.model?.trim());
}

/** Persist a catalog engine choice from Specs (no guessing — user selected). */
export async function applySpecsEngineChoice(
  vehicleId: string,
  epaVehicleId: string,
): Promise<FetchVehicleSpecsBundleResult> {
  if (!vehicleId.trim() || !epaVehicleId.trim()) {
    return { ok: false, error: "Missing vehicle or engine selection." };
  }
  const shopId = await getShopId();
  const denied = await gates.estimateEdit(shopId);
  if (denied) return { ok: false, error: denied.error };

  const existing = await prisma.vehicle.findFirst({
    where: { id: vehicleId, shopId },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "Vehicle not found." };

  const { fetchVehicleDetails } = await import("@/server/services/vehicle-catalog");
  const details = await fetchVehicleDetails(epaVehicleId);
  if (!details) return { ok: false, error: "Could not load that engine option." };

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      ...(details.trim ? { trim: details.trim } : {}),
      ...(details.engine ? { engine: details.engine } : {}),
      ...(details.transmission ? { transmission: details.transmission } : {}),
      ...(details.drivetrain ? { drivetrain: details.drivetrain } : {}),
      ...(details.bodyClass ? { bodyClass: details.bodyClass } : {}),
    },
  });

  await revalidateVehiclePaths(vehicleId, shopId);
  const { getVehicleSpecsBundle } = await import("@/server/vehicle-specs-bundle");
  const data = await getVehicleSpecsBundle(shopId, vehicleId);
  if (!data) return { ok: false, error: "Vehicle not found." };
  return { ok: true, data };
}
