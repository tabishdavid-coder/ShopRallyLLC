import "server-only";

import { prisma } from "@/db/client";
import {
  enrichHitClassification,
  matchOperationsToSubcategory,
} from "@/lib/labor-categories";
import {
  allowSandboxMotorDbCache,
  isLicensedMotorCatalog,
  isReferenceTaxonomyMode,
} from "@/lib/labor-catalog-mode";
import type { LaborGuideHit } from "@/lib/labor-guide-types";
import { LABOR_GUIDE_PROMPT_VERSION } from "@/lib/labor-guide-prompt";
import {
  applyLaborHoursFloor,
  shouldCalibrateLaborDataSource,
} from "@/lib/labor-hours-calibration";
import { normalizeAssemblyHit } from "@/lib/labor-guide-assembly-rules";
import {
  legacyVehicleKey,
  normalizeVin,
  primaryVehicleKey,
  storedRowMatchesVehicle,
  vehicleKeyMatchRank,
  vehicleKeysForLookup,
  vehicleKeysForWriteThrough,
  vehicleMatchLabel,
  vin10FromVin,
  vin10VehicleKey,
  ymmVehicleKeysForPromote,
  type LaborVehicle,
} from "@/lib/labor-vehicle-key";
import {
  resolveLaborSuggestionWithFallback,
  reauditCachedSuggestion,
  type MotorLaborContext,
} from "@/server/services/labor-guide-resolver";
import {
  resolveShopHistoryLabor,
  type ShopHistoryLaborResult,
} from "@/server/services/shop-history-labor";
import type { MotorNodeAssignment } from "@/server/services/motor/motor-node-assignment";
import {
  findMotorCatalogApplicationMatch,
  motorCatalogAppToSuggestion,
} from "@/server/services/motor/motor-ai-context";
import { resolveMotorBaseVehicleId } from "@/server/services/motor/motor-vehicle";
import type { LaborSuggestion, Vehicle } from "@/server/services/labor-guide";
import {
  catalogHitToSuggestion,
  findCatalogLaborSuggestion,
  isLaborCatalogServiceEnabled,
} from "@/server/services/labor-guide-catalog";
import { isMotorLaborEnabled } from "@/server/services/motor/motor-config";

/**
 * Persistent labor-guide cache.
 *
 * The AI estimator (`suggestLaborJob`) is stateless and costs an API call every
 * time. This layer turns it into a growing, reusable reference table:
 *
 *   lookup() → check LaborOperation by (vehicleKey, queryKey)
 *            → fresh hit?  serve it instantly, no AI call
 *            → miss/stale? call the provider, write-through, serve
 *
 * Because the table is GLOBAL (not shop-scoped), every shop's searches enrich
 * the same catalog. Swap `suggestLaborJob` for a licensed provider (MOTOR, etc.)
 * and nothing here or upstream changes — only `source` on the row.
 */

const MODEL = process.env.LABOR_GUIDE_MODEL || "claude-sonnet-4-6";

/** Rows older than this are regenerated on read. Default 180 days. */
const TTL_DAYS = Number(process.env.LABOR_CACHE_TTL_DAYS) || 180;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

/** Collapse case/whitespace/punctuation so trivially-different inputs collide. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** @deprecated Use primaryVehicleKey / vehicleKeysForLookup from labor-vehicle-key. */
export function vehicleKeyFor(v: Vehicle): string {
  return legacyVehicleKey(v);
}

/** Stable key for a repair request — the same normalization used for storage. */
export function laborQueryKey(request: string): string {
  return normalize(request);
}

export type LaborLookup = {
  suggestion: LaborSuggestion;
  /** True when served from the table (no AI call this request). */
  cached: boolean;
  /** Non-blocking quality warnings from assembly audit. */
  auditWarnings?: string[];
  dataSource?: string;
  categoryPath?: string;
  motorAssignment?: MotorNodeAssignment | null;
};

export type LaborLookupOptions = MotorLaborContext & {
  /** Current shop — enables the shop-history (tier SHOP) authority above AI drafts. */
  shopId?: string;
};

type LaborOperationRow = {
  id: string;
  vehicleKey: string;
  queryKey: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleEngine: string | null;
  vehicleVin: string | null;
  jobName: string;
  queryText: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations: string[];
  notes: string | null;
  hitCount: number;
  refreshedAt: Date;
  confidenceScore?: number | null;
  reasoningSummary?: string | null;
  source?: string | null;
  model?: string | null;
  dataSource?: string | null;
  promptVersion?: string | null;
  baseVehicleId?: number | null;
  motorApplicationId?: number | null;
  motorSubGroupId?: number | null;
  motorGroupId?: number | null;
  motorSystemId?: number | null;
};

function rowSearchText(row: {
  jobName: string;
  queryText: string;
  laborOperations: string[];
}): string {
  return [row.jobName, row.queryText, ...row.laborOperations].join(" ");
}

function cachedRowToHit(row: LaborOperationRow, vehicle: LaborVehicle): LaborGuideHit {
  const raw = {
    jobName: row.jobName,
    queryText: row.queryText,
    unitLabel: row.unitLabel,
    unitsOnVehicle: row.unitsOnVehicle,
    laborHoursPerUnit: row.laborHoursPerUnit,
    laborOperations: row.laborOperations,
    notes: row.notes ?? "",
  };
  const calibrated =
    row.motorApplicationId == null && shouldCalibrateLaborDataSource(row.dataSource)
      ? applyLaborHoursFloor(raw).suggestion
      : raw;
  const totalHours =
    calibrated.unitLabel.toLowerCase() === "vehicle"
      ? calibrated.laborHoursPerUnit
      : calibrated.laborHoursPerUnit * calibrated.unitsOnVehicle;
  return {
    id: `cache:${row.id}`,
    laborOperationId: row.id,
    jobName: calibrated.jobName,
    queryText: calibrated.queryText,
    totalHours,
    laborHoursPerUnit: calibrated.laborHoursPerUnit,
    unitLabel: calibrated.unitLabel,
    unitsOnVehicle: calibrated.unitsOnVehicle,
    laborOperations: calibrated.laborOperations,
    notes: calibrated.notes || undefined,
    source: "cached",
    vehicleMatch: vehicleMatchLabel(row, vehicle),
    // Carry the stored confidence through unchanged — do NOT flatten to 0.5, or
    // the low-confidence / verify affordance in the UI never fires (honesty T0).
    confidenceScore: row.confidenceScore ?? undefined,
    dataSource: row.dataSource ?? undefined,
  };
}

function enrichCachedHit(row: LaborOperationRow, vehicle: LaborVehicle): LaborGuideHit {
  const hit = cachedRowToHit(row, vehicle);
  if (row.motorApplicationId != null) {
    return normalizeAssemblyHit(hit);
  }
  const classified = enrichHitClassification(hit, row.queryKey);
  return normalizeAssemblyHit(classified);
}

/** Load cache rows for a vehicle across all lookup keys, filter + dedupe by best key rank. */
async function fetchLaborRowsForVehicle(
  vehicle: Vehicle,
  take = 300,
): Promise<LaborOperationRow[]> {
  const keys = vehicleKeysForLookup(vehicle);

  const [keyRows, ymmRows] = await Promise.all([
    prisma.laborOperation.findMany({
      where: { vehicleKey: { in: keys } },
      orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
      take: take * 3,
    }),
    vehicle.year != null && vehicle.make?.trim()
      ? prisma.laborOperation.findMany({
          where: {
            vehicleYear: vehicle.year,
            vehicleMake: { equals: vehicle.make, mode: "insensitive" },
          },
          orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
          take: take * 3,
        })
      : Promise.resolve([]),
  ]);

  const byId = new Map<string, LaborOperationRow>();
  for (const row of [...keyRows, ...ymmRows]) {
    byId.set(row.id, row);
  }
  const rows = [...byId.values()];

  const filtered = rows.filter((row) => storedRowMatchesVehicle(row, vehicle));

  const byQuery = new Map<string, LaborOperationRow>();
  for (const row of filtered) {
    const existing = byQuery.get(row.queryKey);
    if (
      !existing ||
      vehicleKeyMatchRank(row.vehicleKey) > vehicleKeyMatchRank(existing.vehicleKey)
    ) {
      byQuery.set(row.queryKey, row);
    }
  }

  const deduped = [...byQuery.values()].slice(0, take);

  return deduped;
}

/**
 * Cache-only search for a vehicle + query. Never calls the AI provider ($0).
 * Returns partial/fuzzy matches from the global LaborOperation table.
 */
export async function searchCachedLaborOperations(
  vehicle: Vehicle,
  query: string,
  limit = 25,
): Promise<LaborGuideHit[]> {
  const needle = normalize(query);
  if (!needle) return [];

  const rows = await fetchLaborRowsForVehicle(vehicle, 200);

  const matched = rows
    .filter((row) => {
      const hay = normalize(rowSearchText(row));
      return hay.includes(needle) || needle.split(" ").every((w) => w.length > 1 && hay.includes(w));
    })
    .slice(0, limit);

  return matched.map((row) => enrichCachedHit(row, vehicle));
}

/**
 * Cache-only browse by subcategory for a vehicle. Never calls AI.
 * Re-classifies each row on read so stale/wrong groupings are corrected.
 */
export async function browseCachedLaborBySubcategory(
  vehicle: Vehicle,
  subcategoryId: string,
  limit = 30,
): Promise<LaborGuideHit[]> {
  const rows = await fetchLaborRowsForVehicle(vehicle, 300);
  const hits = rows.map((row) => enrichCachedHit(row, vehicle));
  return matchOperationsToSubcategory(subcategoryId, hits).slice(0, limit);
}

/** Map a cached row back to LaborSuggestion (for cart / job creation). */
export function laborHitToSuggestion(hit: LaborGuideHit): LaborSuggestion | null {
  if (hit.source === "catalog") return catalogHitToSuggestion(hit);
  if (hit.source !== "cached" && hit.source !== "ai_estimate") return null;
  if (hit.laborHoursPerUnit == null || hit.unitLabel == null || hit.unitsOnVehicle == null) return null;
  return {
    jobName: hit.jobName,
    unitLabel: hit.unitLabel,
    unitsOnVehicle: hit.unitsOnVehicle,
    laborHoursPerUnit: hit.laborHoursPerUnit,
    laborOperations: hit.laborOperations,
    notes: hit.notes ?? "",
    confidenceScore: 0.5,
    reasoningSummary: "",
  };
}

/**
 * Resolve a labor suggestion for a vehicle + repair request, using the cache.
 * Returns the suggestion and whether it came from the table.
 */
export async function lookupLaborSuggestion(
  vehicle: Vehicle,
  request: string,
  options: LaborLookupOptions = {},
): Promise<LaborLookup> {
  const queryKey = normalize(request);
  const lookupKeys = vehicleKeysForLookup(vehicle);

  // Skip MOTOR BaseVehicleID resolution unless licensed or sandbox overlay is opted in.
  const mayUseMotor =
    isLicensedMotorCatalog() || allowSandboxMotorDbCache();
  const baseVehicleId = mayUseMotor
    ? (options.baseVehicleId ?? (await resolveMotorBaseVehicleId(vehicle)) ?? undefined)
    : (options.baseVehicleId ?? undefined);
  const motorContext: MotorLaborContext = {
    ...options,
    baseVehicleId: baseVehicleId ?? null,
  };

  // Legacy exact cache by (vehicleKey, queryKey)
  const candidates = await prisma.laborOperation.findMany({
    where: { vehicleKey: { in: lookupKeys }, queryKey },
    orderBy: { hitCount: "desc" },
  });
  const existing = candidates
    .filter((row) => storedRowMatchesVehicle(row, vehicle))
    .sort((a, b) => vehicleKeyMatchRank(b.vehicleKey) - vehicleKeyMatchRank(a.vehicleKey))[0];

  const existingDsEarly = (existing?.dataSource ?? "").toLowerCase();
  const isAiSourced =
    !existingDsEarly ||
    existingDsEarly.startsWith("ai_") ||
    existingDsEarly === "ai" ||
    existingDsEarly === "ai_estimate";
  // Prompt bumps (e.g. bearing hour calibration) invalidate AI rows immediately;
  // MOTOR / shop-curated rows keep age-based TTL only.
  const promptStale =
    isAiSourced &&
    existing != null &&
    (existing.promptVersion ?? null) !== LABOR_GUIDE_PROMPT_VERSION;
  const fresh =
    existing &&
    !promptStale &&
    Date.now() - existing.refreshedAt.getTime() < TTL_MS;

  // T1-lite (tier SHOP): the shop's own repeated actuals are a more honest source
  // than an ungrounded AI draft. Resolve them unless a grounded (MOTOR / shop_history
  // / curated) cache row is already fresh — then that authoritative row wins and we
  // skip the extra query. No floors are applied to this path.
  const cachedIsGrounded = Boolean(
    existing && fresh && !isAiSourced && storedRowMatchesVehicle(existing, vehicle),
  );
  const shopHistory: ShopHistoryLaborResult | null =
    options.shopId && !cachedIsGrounded
      ? await resolveShopHistoryLabor(options.shopId, vehicle, request)
      : null;

  if (existing && fresh && storedRowMatchesVehicle(existing, vehicle)) {
    const existingDs = (existing.dataSource ?? "").toLowerCase();
    const isMotorSourced =
      existingDs === "motor_ewt" ||
      existingDs.startsWith("motor") ||
      existing.motorApplicationId != null;
    // Prefer shop history over a cached AI draft; motor/curated cache still wins.
    const preferShopHistory = shopHistory != null && isAiSourced;
    if (isMotorSourced && !isLicensedMotorCatalog() && !allowSandboxMotorDbCache()) {
      // Fall through — ignore sandbox/MOTOR cache while building shop labor guide.
    } else if (preferShopHistory) {
      // Fall through — write-through the shop-history row below instead of the AI cache.
    } else {
    await prisma.laborOperation.update({
      where: { id: existing.id },
      data: { hitCount: { increment: 1 } },
    });
    void promoteVinCacheToYmm(vehicle, queryKey, existing).catch(() => {});
    const raw = toSuggestion(existing);
    const reaudit = reauditCachedSuggestion(raw, request, {
      skipClassify: existing.motorApplicationId != null,
    });
    return {
      suggestion: reaudit.suggestion,
      cached: true,
      auditWarnings: reaudit.auditWarnings,
      dataSource: existing.dataSource ?? undefined,
    };
    }
  }

  // MOTOR catalog application match (licensed hours — never AI override)
  if (
    baseVehicleId != null &&
    (isLicensedMotorCatalog() || allowSandboxMotorDbCache())
  ) {
    const catalogApp = await findMotorCatalogApplicationMatch(baseVehicleId, request, {
      motorSubGroupId: options.motorSubGroupId ?? undefined,
      positionHint: options.positionHint ?? undefined,
    });

    if (catalogApp) {
      const motorCached = await prisma.laborOperation.findFirst({
        where: {
          baseVehicleId,
          motorApplicationId: catalogApp.motorApplicationId,
        },
        orderBy: { hitCount: "desc" },
      });

      if (motorCached && Date.now() - motorCached.refreshedAt.getTime() < TTL_MS) {
        await prisma.laborOperation.update({
          where: { id: motorCached.id },
          data: { hitCount: { increment: 1 } },
        });
        return {
          suggestion: toSuggestion(motorCached),
          cached: true,
          dataSource: motorCached.dataSource ?? "motor_ewt",
        };
      }

      const catalogSuggestion = motorCatalogAppToSuggestion(catalogApp);
      await upsertLaborCacheRows(vehicle, queryKey, {
        queryText: request,
        ...fromSuggestion(catalogSuggestion, "motor_ewt"),
        source: "catalog",
        model: "motor-catalog",
        dataSource: "motor_ewt",
        baseVehicleId,
        motorApplicationId: catalogApp.motorApplicationId,
        motorSubGroupId: catalogApp.motorSubGroupId,
        motorGroupId: catalogApp.motorGroupId,
        motorSystemId: catalogApp.motorSystemId,
      });
      return {
        suggestion: catalogSuggestion,
        cached: true,
        dataSource: "motor_ewt",
      };
    }
  }

  // MOTOR live search (legacy API path when DB apps not synced)
  if (isLicensedMotorCatalog() && isLaborCatalogServiceEnabled()) {
    const catalogSuggestion = await findCatalogLaborSuggestion(vehicle, request);
    if (catalogSuggestion) {
      const catalogDataSource = isMotorLaborEnabled() ? "motor_ewt" : "y_mm_catalog";
      await upsertLaborCacheRows(vehicle, queryKey, {
        queryText: request,
        ...fromSuggestion(catalogSuggestion, catalogDataSource),
        source: "catalog",
        model: "autopilot-labor-guide",
        dataSource: catalogDataSource,
        baseVehicleId: baseVehicleId ?? null,
        motorSubGroupId: options.motorSubGroupId ?? null,
        motorGroupId: options.motorGroupId ?? null,
        motorSystemId: options.motorSystemId ?? null,
      });
      return { suggestion: catalogSuggestion, cached: true, dataSource: catalogDataSource };
    }
  }

  // Shop-history authority: above AI first-principles, below licensed MOTOR (which
  // returns earlier). Served with dataSource "shop_history" → tier SHOP in the UI.
  if (shopHistory) {
    await upsertLaborCacheRows(vehicle, queryKey, {
      queryText: request,
      ...fromSuggestion(shopHistory.suggestion, "shop_history"),
      source: "shop_history",
      model: "shop-history",
      dataSource: "shop_history",
      baseVehicleId: baseVehicleId ?? null,
      motorSubGroupId: options.motorSubGroupId ?? null,
      motorGroupId: options.motorGroupId ?? null,
      motorSystemId: options.motorSystemId ?? null,
    });
    return {
      suggestion: shopHistory.suggestion,
      cached: false,
      dataSource: "shop_history",
    };
  }

  const resolved = await resolveLaborSuggestionWithFallback(vehicle, request, motorContext);
  const suggestion = resolved.suggestion;
  const dataSource =
    resolved.dataSource ??
    resolved.motorAssignment?.dataSource ??
    (motorContext.motorSubGroupId
      ? isReferenceTaxonomyMode()
        ? "ai_taxonomy_scoped"
        : "ai_motor_scoped"
      : "ai_first_principles");

  await upsertLaborCacheRows(vehicle, queryKey, {
    queryText: request,
    ...fromSuggestion(suggestion, dataSource),
    source: resolved.resolution === "ai" ? "ai" : "ai",
    model: MODEL,
    dataSource,
    baseVehicleId: resolved.motorAssignment?.baseVehicleId ?? baseVehicleId ?? null,
    motorApplicationId: resolved.motorAssignment?.motorApplicationId ?? null,
    motorSubGroupId:
      resolved.motorAssignment?.motorSubGroupId ?? options.motorSubGroupId ?? null,
    motorGroupId: resolved.motorAssignment?.motorGroupId ?? options.motorGroupId ?? null,
    motorSystemId: resolved.motorAssignment?.motorSystemId ?? options.motorSystemId ?? null,
  });

  return {
    suggestion,
    cached: false,
    auditWarnings: resolved.auditWarnings,
    dataSource,
    categoryPath: resolved.motorAssignment?.categoryPath,
    motorAssignment: resolved.motorAssignment,
  };
}

/** Map a stored row back to the LaborSuggestion shape the UI/action expect. */
function toSuggestion(row: {
  jobName: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations: string[];
  notes: string | null;
  confidenceScore?: number | null;
  reasoningSummary?: string | null;
  queryText?: string | null;
  dataSource?: string | null;
  motorApplicationId?: number | null;
}): LaborSuggestion {
  const raw: LaborSuggestion = {
    jobName: row.jobName,
    unitLabel: row.unitLabel,
    unitsOnVehicle: row.unitsOnVehicle,
    laborHoursPerUnit: row.laborHoursPerUnit,
    laborOperations: row.laborOperations,
    notes: row.notes ?? "",
    confidenceScore: row.confidenceScore ?? 0.5,
    reasoningSummary: row.reasoningSummary ?? "",
  };
  if (row.motorApplicationId != null || !shouldCalibrateLaborDataSource(row.dataSource)) return raw;
  return applyLaborHoursFloor({
    ...raw,
    queryText: row.queryText ?? undefined,
  }).suggestion;
}

/** Map a LaborSuggestion to the column set we persist. */
function fromSuggestion(s: LaborSuggestion, dataSource = "ai_first_principles") {
  const calibrated = shouldCalibrateLaborDataSource(dataSource)
    ? applyLaborHoursFloor(s).suggestion
    : s;
  return {
    jobName: calibrated.jobName,
    unitLabel: calibrated.unitLabel,
    unitsOnVehicle: calibrated.unitsOnVehicle,
    laborHoursPerUnit: calibrated.laborHoursPerUnit,
    laborOperations: calibrated.laborOperations,
    notes: calibrated.notes || null,
    confidenceScore: calibrated.confidenceScore,
    reasoningSummary: calibrated.reasoningSummary || null,
    dataSource,
    promptVersion: LABOR_GUIDE_PROMPT_VERSION,
  };
}

type MotorPersistFields = {
  baseVehicleId?: number | null;
  motorApplicationId?: number | null;
  motorSubGroupId?: number | null;
  motorGroupId?: number | null;
  motorSystemId?: number | null;
};

type LaborPersistFields = {
  queryText: string;
  jobName: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations: string[];
  notes: string | null;
  confidenceScore: number;
  reasoningSummary: string | null;
  source: string;
  model: string | null;
  dataSource?: string | null;
  promptVersion?: string | null;
} & MotorPersistFields;

function vehicleVinForKey(vehicle: Vehicle, vehicleKey: string): string | null {
  if (!vehicleKey.startsWith("vin10:") && !vehicleKey.startsWith("vin:")) return null;
  const vin = vehicle.vin?.trim();
  if (!vin) return null;
  const normalized = normalizeVin(vin);
  if (vehicleKey.startsWith("vin10:")) {
    return vin10FromVin(normalized) ? normalized : null;
  }
  return normalized.length >= 11 ? normalized : null;
}

/** Write-through: persist the same labor row under VIN + YMM lookup keys. */
async function upsertLaborCacheRows(
  vehicle: Vehicle,
  queryKey: string,
  fields: LaborPersistFields,
  opts?: { primaryHitCount?: number },
): Promise<void> {
  const keys = vehicleKeysForWriteThrough(vehicle);
  const primaryKey = primaryVehicleKey(vehicle);
  const primaryHitCount = opts?.primaryHitCount ?? 1;

  const motorFields = {
    baseVehicleId: fields.baseVehicleId ?? null,
    motorApplicationId: fields.motorApplicationId ?? null,
    motorSubGroupId: fields.motorSubGroupId ?? null,
    motorGroupId: fields.motorGroupId ?? null,
    motorSystemId: fields.motorSystemId ?? null,
  };

  if (fields.baseVehicleId != null && fields.motorApplicationId != null) {
    await prisma.laborOperation.upsert({
      where: {
        baseVehicleId_motorApplicationId: {
          baseVehicleId: fields.baseVehicleId,
          motorApplicationId: fields.motorApplicationId,
        },
      },
      create: {
        vehicleKey: primaryKey,
        queryKey,
        vehicleYear: vehicle.year,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleTrim: vehicle.trim,
        vehicleEngine: vehicle.engine,
        vehicleVin: vehicleVinForKey(vehicle, primaryKey),
        ...fields,
        ...motorFields,
        hitCount: primaryHitCount,
      },
      update: {
        queryText: fields.queryText,
        queryKey,
        vehicleYear: vehicle.year,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleTrim: vehicle.trim,
        vehicleEngine: vehicle.engine,
        jobName: fields.jobName,
        unitLabel: fields.unitLabel,
        unitsOnVehicle: fields.unitsOnVehicle,
        laborHoursPerUnit: fields.laborHoursPerUnit,
        laborOperations: fields.laborOperations,
        notes: fields.notes,
        confidenceScore: fields.confidenceScore,
        reasoningSummary: fields.reasoningSummary,
        source: fields.source,
        model: fields.model,
        dataSource: fields.dataSource,
        promptVersion: fields.promptVersion,
        ...motorFields,
      },
    });
  }

  await Promise.all(
    keys.map(async (vehicleKey) => {
      const isPrimary = vehicleKey === primaryKey;
      const vehicleContext = {
        vehicleYear: vehicle.year,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleTrim: vehicle.trim,
        vehicleEngine: vehicle.engine,
        vehicleVin: vehicleVinForKey(vehicle, vehicleKey),
      };
      const rowMotorFields = isPrimary
        ? motorFields
        : {
            baseVehicleId: null,
            motorApplicationId: null,
            motorSubGroupId: null,
            motorGroupId: null,
            motorSystemId: null,
          };

      await prisma.laborOperation.upsert({
        where: { vehicleKey_queryKey: { vehicleKey, queryKey } },
        create: {
          vehicleKey,
          queryKey,
          ...vehicleContext,
          ...fields,
          ...rowMotorFields,
          hitCount: isPrimary ? primaryHitCount : 0,
        },
        update: {
          queryText: fields.queryText,
          ...vehicleContext,
          jobName: fields.jobName,
          unitLabel: fields.unitLabel,
          unitsOnVehicle: fields.unitsOnVehicle,
          laborHoursPerUnit: fields.laborHoursPerUnit,
          laborOperations: fields.laborOperations,
          notes: fields.notes,
          confidenceScore: fields.confidenceScore,
          reasoningSummary: fields.reasoningSummary,
          source: fields.source,
          model: fields.model,
          ...(fields.dataSource != null ? { dataSource: fields.dataSource } : {}),
          ...(fields.promptVersion != null ? { promptVersion: fields.promptVersion } : {}),
          ...(isPrimary ? rowMotorFields : {}),
        },
      });
    }),
  );
}

/** On vin10/vin hit, copy row to YMM (+ vin10 on legacy vin:17 read) so siblings reuse cache. */
async function promoteVinCacheToYmm(
  vehicle: Vehicle,
  queryKey: string,
  row: LaborOperationRow,
): Promise<void> {
  const isVinLevel =
    row.vehicleKey.startsWith("vin10:") || row.vehicleKey.startsWith("vin:");
  if (!isVinLevel) return;
  if (vehicle.year == null || !vehicle.make?.trim()) return;

  const fields: LaborPersistFields = {
    queryText: row.queryText,
    jobName: row.jobName,
    unitLabel: row.unitLabel,
    unitsOnVehicle: row.unitsOnVehicle,
    laborHoursPerUnit: row.laborHoursPerUnit,
    laborOperations: row.laborOperations,
    notes: row.notes,
    confidenceScore: row.confidenceScore ?? 0.5,
    reasoningSummary: row.reasoningSummary ?? null,
    source: "cached",
    model: row.model ?? null,
    dataSource: row.dataSource ?? null,
    promptVersion: row.promptVersion ?? null,
  };

  const ymmKeys = ymmVehicleKeysForPromote(vehicle);
  await Promise.all(
    ymmKeys.map(async (vehicleKey) => {
      const existing = await prisma.laborOperation.findUnique({
        where: { vehicleKey_queryKey: { vehicleKey, queryKey } },
      });
      if (existing) return;

      await prisma.laborOperation.create({
        data: {
          vehicleKey,
          queryKey,
          vehicleYear: vehicle.year,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleTrim: vehicle.trim,
          vehicleEngine: vehicle.engine,
          vehicleVin: null,
          ...fields,
          hitCount: 0,
        },
      });
    }),
  );

  // Legacy vin:17 hit → also seed vin10 key for migration
  const vin = vehicle.vin?.trim();
  if (row.vehicleKey.startsWith("vin:") && vin && vin10FromVin(vin)) {
    const vin10Key = vin10VehicleKey(vin);
    const existingVin10 = await prisma.laborOperation.findUnique({
      where: { vehicleKey_queryKey: { vehicleKey: vin10Key, queryKey } },
    });
    if (!existingVin10) {
      await prisma.laborOperation.create({
        data: {
          vehicleKey: vin10Key,
          queryKey,
          vehicleYear: vehicle.year,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          vehicleTrim: vehicle.trim,
          vehicleEngine: vehicle.engine,
          vehicleVin: normalizeVin(vin),
          ...fields,
          hitCount: 0,
        },
      });
    }
  }
}

/**
 * Refresh the most-used stale rows by re-running the provider. Intended for a
 * scheduled job (Inngest cron) so the catalog "stays up to date" without anyone
 * searching. Returns how many rows were refreshed.
 */
export async function refreshStaleLaborOperations(limit = 50): Promise<number> {
  const cutoff = new Date(Date.now() - TTL_MS);
  const stale = await prisma.laborOperation.findMany({
    where: { refreshedAt: { lt: cutoff } },
    orderBy: { hitCount: "desc" },
    take: limit,
  });

  let refreshed = 0;
  for (const row of stale) {
    try {
      const resolved = await resolveLaborSuggestionWithFallback(
        {
          vin: row.vehicleVin,
          year: row.vehicleYear,
          make: row.vehicleMake,
          model: row.vehicleModel,
          trim: row.vehicleTrim,
          engine: row.vehicleEngine,
          drivetrain: null,
        },
        row.queryText,
      );
      await prisma.laborOperation.update({
        where: { id: row.id },
        data: { ...fromSuggestion(resolved.suggestion), source: "ai", model: MODEL },
      });
      refreshed++;
    } catch {
      // Skip on provider error; the row stays stale and is retried next run.
    }
  }
  return refreshed;
}

/**
 * Force-regenerate ONE catalog row by id, ignoring TTL. Powers the per-row
 * "regenerate" action in the labor-guide catalog. Returns false if the row is
 * gone; throws if the provider fails (the caller surfaces the error).
 */
export async function regenerateLaborOperation(id: string): Promise<boolean> {
  const row = await prisma.laborOperation.findUnique({ where: { id } });
  if (!row) return false;
  const resolved = await resolveLaborSuggestionWithFallback(
    {
      vin: row.vehicleVin,
      year: row.vehicleYear,
      make: row.vehicleMake,
      model: row.vehicleModel,
      trim: row.vehicleTrim,
      engine: row.vehicleEngine,
      drivetrain: null,
    },
    row.queryText,
  );
  await prisma.laborOperation.update({
    where: { id },
    data: { ...fromSuggestion(resolved.suggestion), source: "ai", model: MODEL },
  });
  return true;
}
