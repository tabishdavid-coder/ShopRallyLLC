import "server-only";

import { prisma } from "@/db/client";
import type { Prisma } from "@/generated/prisma";
import { compactOperationName } from "@/lib/labor-guide-helpers";
import {
  buildRedundancyMeta,
  type DataFreshness,
  type RedundancyMeta,
} from "@/server/platform/oem-automation";
import type { LaborSuggestion, Vehicle } from "@/server/services/labor-guide";

/** TTL for in-process labor estimate cache (seconds) — mirrors Python DEFAULT_CACHE_TTLS.labor. */
const OEM_LABOR_CACHE_TTL_SEC = 3_600;

type CacheEntry = { data: OemLaborEstimatePayload; storedAt: number };

const memoryCache = new Map<string, CacheEntry>();

export type OemLaborDataSource =
  | "oem_sql_average"
  | "oem_automation"
  | "oem_default_1hr";

export type OemLaborEstimatePayload = {
  vehicleId: string;
  operationId: string;
  hours: number;
  warning?: string;
  dataSource: OemLaborDataSource;
  meta: RedundancyMeta;
};

export type OemLaborEstimateResult = OemLaborEstimatePayload & {
  cacheHit: boolean;
  cacheAgeSeconds: number | null;
};

function oemAutomationBaseUrl(): string | null {
  const raw =
    process.env.OEM_AUTOMATION_URL?.trim() ||
    process.env.OEM_AUTOMATION_SERVICE_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : null;
}

/** Stable vehicle key for OEM pipeline — `year|make|model` (optional vin suffix). */
export function oemVehicleIdFromVehicle(vehicle: Vehicle): string {
  const parts: string[] = [];
  if (vehicle.year != null) parts.push(String(vehicle.year));
  parts.push((vehicle.make ?? "").trim() || "unknown");
  parts.push((vehicle.model ?? "").trim() || "unknown");
  const vin = vehicle.vin?.trim();
  if (vin && vin.length >= 11) parts.push(vin);
  return parts.join("|");
}

export function oemOperationIdFromRequest(request: string): string {
  return request
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "_");
}

function cacheKey(vehicleId: string, operationId: string): string {
  return `labor|${vehicleId}|${operationId}`;
}

function readCache(key: string): { payload: OemLaborEstimatePayload; ageSeconds: number } | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  const ageSeconds = Math.floor((Date.now() - entry.storedAt) / 1000);
  if (ageSeconds > OEM_LABOR_CACHE_TTL_SEC) return null;
  return { payload: entry.data, ageSeconds };
}

function writeCache(key: string, payload: OemLaborEstimatePayload): void {
  memoryCache.set(key, { data: payload, storedAt: Date.now() });
}

async function recordFallbackEvent(opts: {
  fallbackSource: string;
  success: boolean;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.fallbackEvent.create({
      data: {
        dataType: "labor",
        primarySource: "oem_automation",
        fallbackSource: opts.fallbackSource,
        success: opts.success,
        details: (opts.details ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Non-blocking telemetry — CRM must work without audit table in dev.
  }
}

/**
 * Average labor hours from LaborOperation — mirrors Python FallbackEngine.lookup_average_hours.
 */
export async function lookupOemAverageHours(
  vehicle: Vehicle,
  operationId: string,
): Promise<number | null> {
  const vehicleId = oemVehicleIdFromVehicle(vehicle);
  const parts = vehicleId.split("|");
  const year = parts[0]?.match(/^\d{4}$/) ? Number(parts[0]) : null;
  const make = parts[1] ?? null;
  const needle = operationId.toLowerCase().replace(/_/g, " ");

  try {
    const rows = await prisma.$queryRaw<{ avg: number | null }[]>`
      SELECT AVG("laborHoursPerUnit") AS avg
      FROM "LaborOperation"
      WHERE (${year}::int IS NULL OR "vehicleYear" = ${year})
        AND (${make}::text IS NULL OR LOWER("vehicleMake") = LOWER(${make}))
        AND (
          LOWER("queryText") LIKE ${`%${needle}%`}
          OR LOWER("jobName") LIKE ${`%${needle}%`}
        )
    `;
    const avg = rows[0]?.avg;
    if (avg != null && Number.isFinite(Number(avg))) {
      return Math.round(Number(avg) * 100) / 100;
    }
  } catch {
    // Table may be empty in fresh dev — fall through.
  }
  return null;
}

async function fetchRemoteOemLaborEstimate(
  vehicleId: string,
  operationId: string,
): Promise<OemLaborEstimatePayload | null> {
  const base = oemAutomationBaseUrl();
  if (!base) return null;

  const url = new URL(`${base}/labor/estimate`);
  url.searchParams.set("vehicle_id", vehicleId);
  url.searchParams.set("operation_id", operationId);

  try {
    const resp = await fetch(url.toString(), {
      headers: { Accept: "application/json", "User-Agent": "ShopRally-OEM-Labor/1.0" },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    });
    if (!resp.ok) return null;
    const body = (await resp.json()) as {
      hours?: number;
      warning?: string;
      source?: string;
      meta?: Partial<RedundancyMeta>;
    };
    if (typeof body.hours !== "number" || !Number.isFinite(body.hours)) return null;

    const metaBlock = body.meta ?? {};
    return {
      vehicleId,
      operationId,
      hours: body.hours,
      warning: body.warning,
      dataSource: "oem_automation",
      meta: {
        source: metaBlock.source ?? "oem_automation",
        fallback_used: metaBlock.fallback_used ?? false,
        cache_age_seconds: metaBlock.cache_age_seconds ?? null,
        health_status: (metaBlock.health_status as DataFreshness) ?? "live",
      },
    };
  } catch {
    return null;
  }
}

/**
 * Primary OEM automation labor estimate — TypeScript mirror of Python DataResolver.get_labor_estimate.
 * Works without Python service (Prisma SQL avg → 1.0 hr default). Optionally calls FastAPI when configured.
 */
export async function getOemLaborEstimate(
  vehicle: Vehicle,
  request: string,
): Promise<OemLaborEstimateResult> {
  const vehicleId = oemVehicleIdFromVehicle(vehicle);
  const operationId = oemOperationIdFromRequest(request);
  const key = cacheKey(vehicleId, operationId);

  const cached = readCache(key);
  if (cached) {
    return {
      ...cached.payload,
      meta: {
        ...cached.payload.meta,
        cache_age_seconds: cached.ageSeconds,
        health_status: "cached" as DataFreshness,
      },
      cacheHit: true,
      cacheAgeSeconds: cached.ageSeconds,
    };
  }

  const remote = await fetchRemoteOemLaborEstimate(vehicleId, operationId);
  if (remote) {
    writeCache(key, remote);
    await recordFallbackEvent({
      fallbackSource: "fastapi",
      success: true,
      details: { hours: remote.hours, vehicleId, operationId },
    });
    return { ...remote, cacheHit: false, cacheAgeSeconds: null };
  }

  const avgHours = await lookupOemAverageHours(vehicle, operationId);
  if (avgHours != null) {
    const payload: OemLaborEstimatePayload = {
      vehicleId,
      operationId,
      hours: avgHours,
      dataSource: "oem_sql_average",
      meta: buildRedundancyMeta({
        source: "oem_sql_average",
        fallbackUsed: true,
        healthStatus: "cached",
      }).meta,
    };
    writeCache(key, payload);
    await recordFallbackEvent({
      fallbackSource: "sql_average",
      success: true,
      details: { hours: avgHours, vehicleId, operationId },
    });
    return { ...payload, cacheHit: false, cacheAgeSeconds: null };
  }

  const warning =
    "No OEM labor match — defaulting to 1.0 hr; verify before quoting.";
  const payload: OemLaborEstimatePayload = {
    vehicleId,
    operationId,
    hours: 1.0,
    warning,
    dataSource: "oem_default_1hr",
    meta: buildRedundancyMeta({
      source: "oem_default_1hr",
      fallbackUsed: true,
      healthStatus: "stale",
    }).meta,
  };
  writeCache(key, payload);
  await recordFallbackEvent({
    fallbackSource: "default_1hr",
    success: true,
    details: { warning, vehicleId, operationId },
  });
  return { ...payload, cacheHit: false, cacheAgeSeconds: null };
}

/** Map OEM estimate → LaborSuggestion for cache write-through + UI. */
export function oemEstimateToSuggestion(
  estimate: OemLaborEstimateResult,
  request: string,
): LaborSuggestion {
  const jobName = compactOperationName(request) || request.trim() || "Labor operation";
  const confidenceScore =
    estimate.dataSource === "oem_default_1hr"
      ? 0.35
      : estimate.dataSource === "oem_sql_average"
        ? 0.72
        : 0.8;

  return {
    jobName,
    unitLabel: "vehicle",
    unitsOnVehicle: 1,
    laborHoursPerUnit: estimate.hours,
    laborOperations: [jobName],
    notes: estimate.warning ?? "",
    confidenceScore,
    reasoningSummary:
      estimate.dataSource === "oem_sql_average"
        ? "OEM pipeline SQL average from platform LaborOperation cache."
        : estimate.dataSource === "oem_automation"
          ? "OEM automation service (FastAPI redundancy layer)."
          : "OEM pipeline default — no matching average; verify hours.",
  };
}
