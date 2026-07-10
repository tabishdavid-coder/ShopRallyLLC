import "server-only";

import { allowSandboxMotorDbCache, isLicensedMotorCatalog } from "@/lib/labor-catalog-mode";
import {
  motorVinLookupAttempts,
  normalizeVin,
} from "@/lib/labor-vehicle-key";
import type { Vehicle } from "@/server/services/labor-guide";
import { motorGet } from "@/server/services/motor/motor-client";

/** MOTOR sandbox fixtures with locally synced catalog data (no live API required). */
const SANDBOX_VIN_BASE_VEHICLE_ID: Record<string, number> = {
  [normalizeVin("19XFA1F51AE028415")]: 22124,
};

/**
 * Offline YMM → BaseVehicleID fallback for the sandbox catalog (Civic 22124). Lets a
 * demo vehicle resolve MOTOR test data even without the exact sandbox VIN. Only used
 * when the sandbox overlay is on (MOTOR_SANDBOX_CACHE=true) and no live match is found.
 */
const SANDBOX_YMM_BASE_VEHICLE_ID: Array<{ base: number; match: (v: Vehicle) => boolean }> = [
  {
    base: 22124,
    match: (v) =>
      (v.make ?? "").trim().toLowerCase() === "honda" &&
      (v.model ?? "").trim().toLowerCase().startsWith("civic"),
  },
];

function motorVehicleLookupEnabled(): boolean {
  return isLicensedMotorCatalog() || allowSandboxMotorDbCache();
}

type MotorVehicleSearchItem = {
  BaseVehicleID?: number;
  Year?: number;
  MakeName?: string;
  ModelName?: string;
  SubModelName?: string;
};

const baseVehicleCache = new Map<string, { id: number; expiresAt: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function cacheKey(vehicle: Vehicle): string {
  const vin = vehicle.vin?.trim();
  if (vin && normalizeVin(vin).length >= 11) return `vin:${normalizeVin(vin)}`;
  return [
    vehicle.year ?? "",
    vehicle.make ?? "",
    vehicle.model ?? "",
    vehicle.trim ?? "",
    vehicle.engine ?? "",
  ]
    .join("|")
    .toLowerCase();
}

function unwrapVehicleItems(payload: unknown): MotorVehicleSearchItem[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const body = (root.Body ?? root.body ?? root) as Record<string, unknown>;
  const vehicles = body.Vehicles ?? body.vehicles;
  if (Array.isArray(vehicles)) return vehicles as MotorVehicleSearchItem[];
  if (vehicles && typeof vehicles === "object") {
    const v = vehicles as Record<string, unknown>;
    const items = v.Vehicle ?? v.vehicle ?? v.Items ?? v.items;
    if (Array.isArray(items)) return items as MotorVehicleSearchItem[];
    if (items && typeof items === "object") return [items as MotorVehicleSearchItem];
  }
  return [];
}

function scoreVehicleMatch(item: MotorVehicleSearchItem, vehicle: Vehicle): number {
  let score = 0;
  if (vehicle.year && item.Year === vehicle.year) score += 4;
  if (vehicle.make && item.MakeName?.toLowerCase() === vehicle.make.toLowerCase()) score += 3;
  if (vehicle.model && item.ModelName?.toLowerCase() === vehicle.model.toLowerCase()) score += 3;
  if (vehicle.trim && item.SubModelName?.toLowerCase().includes(vehicle.trim.toLowerCase())) {
    score += 1;
  }
  return score;
}

function pickBestVehicle(
  items: MotorVehicleSearchItem[],
  vehicle: Vehicle,
): MotorVehicleSearchItem | null {
  if (!items.length) return null;
  let best = items[0]!;
  let bestScore = scoreVehicleMatch(best, vehicle);
  for (const item of items.slice(1)) {
    const s = scoreVehicleMatch(item, vehicle);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best?.BaseVehicleID ? best : items.find((i) => i.BaseVehicleID) ?? null;
}

async function searchMotorByVin(
  vinTerm: string,
  vehicle: Vehicle,
): Promise<MotorVehicleSearchItem | null> {
  const res = await motorGet("/Information/Vehicles/Search/ByVIN", {
    vin: vinTerm,
    withRel: "EWT",
    AttributeStandard: "MOTOR",
  });
  if (!res.ok) return null;
  return pickBestVehicle(unwrapVehicleItems(res.data), vehicle);
}

/** Resolve MOTOR BaseVehicleID from VIN (full, then 10-char prefix) or YMM search. */
export async function resolveMotorBaseVehicleId(vehicle: Vehicle): Promise<number | null> {
  if (!motorVehicleLookupEnabled()) return null;

  const key = cacheKey(vehicle);
  const cached = baseVehicleCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.id;

  const rawVin = vehicle.vin?.trim();
  if (rawVin) {
    for (const vinTerm of motorVinLookupAttempts(rawVin)) {
      const picked = await searchMotorByVin(vinTerm, vehicle);
      if (picked?.BaseVehicleID) {
        baseVehicleCache.set(key, {
          id: picked.BaseVehicleID,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return picked.BaseVehicleID;
      }
    }

    const sandboxId = resolveSandboxBaseVehicleId(vehicle, key);
    if (sandboxId) return sandboxId;
  }

  const term = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!term) return null;

  const res = await motorGet("/Information/Vehicles/Search/ByTerm", {
    searchTerm: term,
    withRel: "EWT",
    AttributeStandard: "MOTOR",
  });
  // Live search unavailable (e.g. no keys in sandbox dev) → offline YMM fallback.
  if (!res.ok) return resolveSandboxBaseVehicleId(vehicle, key);

  const picked = pickBestVehicle(unwrapVehicleItems(res.data), vehicle);
  if (!picked?.BaseVehicleID) {
    return resolveSandboxBaseVehicleId(vehicle, key);
  }
  baseVehicleCache.set(key, { id: picked.BaseVehicleID, expiresAt: Date.now() + CACHE_TTL_MS });
  return picked.BaseVehicleID;
}

function resolveSandboxBaseVehicleId(vehicle: Vehicle, cacheKeyValue: string): number | null {
  // Sandbox VIN/YMM → BaseVehicleID map only when MOTOR_SANDBOX_CACHE is opted in.
  if (!allowSandboxMotorDbCache()) return null;

  const rawVin = vehicle.vin?.trim();
  let mapped = rawVin ? SANDBOX_VIN_BASE_VEHICLE_ID[normalizeVin(rawVin)] : undefined;

  if (mapped == null) {
    mapped = SANDBOX_YMM_BASE_VEHICLE_ID.find((entry) => entry.match(vehicle))?.base;
  }
  if (mapped == null) return null;

  baseVehicleCache.set(cacheKeyValue, {
    id: mapped,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return mapped;
}
