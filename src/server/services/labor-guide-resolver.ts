import "server-only";

import { classifyOperation } from "@/lib/labor-categories";
import {
  auditAndNormalizeLaborSuggestion,
  assemblyFallbackSuggestion,
} from "@/lib/labor-guide-audit";
import { matchAssemblyRule } from "@/lib/labor-guide-assembly-rules";
import {
  isReferenceTaxonomyMode,
} from "@/lib/labor-catalog-mode";
import { prisma } from "@/db/client";
import {
  storedRowMatchesVehicle,
  vehicleKeysForLookup,
  vehicleKeyMatchRank,
  type LaborVehicle,
} from "@/lib/labor-vehicle-key";
import {
  buildMotorTaxonomyPromptBlock,
  fetchMotorRagExamples,
} from "@/server/services/motor/motor-ai-context";
import {
  assignMotorNodeFromSuggestion,
  type MotorNodeAssignment,
} from "@/server/services/motor/motor-node-assignment";
import {
  suggestLaborJob,
  type LaborSuggestion,
  type Vehicle,
} from "@/server/services/labor-guide";

export type MotorLaborContext = {
  baseVehicleId?: number | null;
  motorSubGroupId?: number | null;
  motorGroupId?: number | null;
  motorSystemId?: number | null;
  positionHint?: string | null;
};

export type ResolvedLaborLookup = {
  suggestion: LaborSuggestion;
  cached: boolean;
  auditWarnings: string[];
  resolution:
    | "exact_cache"
    | "motor_cache"
    | "neighbor_cache"
    | "ai"
    | "assembly_fallback"
    | "generic_fallback";
  motorAssignment?: MotorNodeAssignment | null;
  dataSource?: string;
};

function rowToSuggestion(row: {
  jobName: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations: string[];
  notes: string | null;
  confidenceScore?: number | null;
  reasoningSummary?: string | null;
}): LaborSuggestion {
  return {
    jobName: row.jobName,
    unitLabel: row.unitLabel,
    unitsOnVehicle: row.unitsOnVehicle,
    laborHoursPerUnit: row.laborHoursPerUnit,
    laborOperations: row.laborOperations,
    notes: row.notes ?? "",
    confidenceScore: row.confidenceScore ?? 0.5,
    reasoningSummary: row.reasoningSummary ?? "",
  };
}

function auditWrap(
  suggestion: LaborSuggestion,
  request: string,
  cached: boolean,
  resolution: ResolvedLaborLookup["resolution"],
  opts?: {
    motorAssignment?: MotorNodeAssignment | null;
    dataSource?: string;
    subcategoryId?: string;
  },
): ResolvedLaborLookup {
  const subcategoryId =
    opts?.subcategoryId ??
    (opts?.motorAssignment?.categoryPath
      ? undefined
      : classifyOperation(suggestion.jobName, request).subcategoryId);
  const audit = auditAndNormalizeLaborSuggestion(suggestion, {
    request,
    subcategoryId,
  });
  return {
    suggestion: audit.suggestion,
    cached,
    auditWarnings: audit.warnings,
    resolution,
    motorAssignment: opts?.motorAssignment ?? undefined,
    dataSource: opts?.dataSource,
  };
}

/** Pull similar cached rows for RAG few-shot context. */
async function fetchRagExamples(vehicle: Vehicle, request: string): Promise<LaborSuggestion[]> {
  const rows = await fetchSimilarLaborRows(vehicle, request, 5);
  return rows.slice(0, 3).map(rowToSuggestion);
}

async function fetchSimilarLaborRows(
  vehicle: Vehicle,
  request: string,
  limit: number,
): Promise<
  {
    jobName: string;
    unitLabel: string;
    unitsOnVehicle: number;
    laborHoursPerUnit: number;
    laborOperations: string[];
    notes: string | null;
    queryText: string;
    confidenceScore?: number | null;
    reasoningSummary?: string | null;
  }[]
> {
  const keys = vehicleKeysForLookup(vehicle);
  const needle = request.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

  const rows = await prisma.laborOperation.findMany({
    where: {
      OR: [
        { vehicleKey: { in: keys } },
        ...(vehicle.year && vehicle.make
          ? [
              {
                vehicleYear: vehicle.year,
                vehicleMake: { equals: vehicle.make, mode: "insensitive" as const },
              },
            ]
          : []),
      ],
      ...(needle
        ? {
            OR: [
              { queryText: { contains: needle, mode: "insensitive" as const } },
              { jobName: { contains: needle, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ hitCount: "desc" }, { refreshedAt: "desc" }],
    take: limit * 4,
  });

  return rows
    .filter((row) => storedRowMatchesVehicle(row, vehicle as LaborVehicle))
    .sort((a, b) => vehicleKeyMatchRank(b.vehicleKey) - vehicleKeyMatchRank(a.vehicleKey))
    .slice(0, limit);
}

/**
 * Neighbor cache: similar query on same vehicle when exact queryKey miss.
 */
async function tryNeighborCache(
  vehicle: Vehicle,
  request: string,
): Promise<LaborSuggestion | null> {
  const rows = await fetchSimilarLaborRows(vehicle, request, 8);
  const rule = matchAssemblyRule(request);
  const needle = request.toLowerCase();

  for (const row of rows) {
    const nameMatch =
      row.jobName.toLowerCase().includes(needle) ||
      needle.includes(row.jobName.toLowerCase().slice(0, 12));
    const cls = classifyOperation(row.jobName, row.queryText);
    const ruleMatch =
      rule && matchAssemblyRule(row.queryText ?? row.jobName, row.jobName, cls.subcategoryId)?.id === rule.id;
    if (!nameMatch && !ruleMatch) continue;
    return {
      ...rowToSuggestion(row),
      confidenceScore: 0.45,
      reasoningSummary: "Adapted from similar internal guide entry — verify hours.",
    };
  }
  return null;
}

/**
 * AI + fallback ladder. Never throws — always returns a usable suggestion.
 * Caller persists to LaborOperation when appropriate.
 */
export async function resolveLaborSuggestionWithFallback(
  vehicle: Vehicle,
  request: string,
  motorContext: MotorLaborContext = {},
): Promise<ResolvedLaborLookup> {
  const baseVehicleId = motorContext.baseVehicleId ?? null;
  const motorSubGroupId = motorContext.motorSubGroupId ?? undefined;

  const [motorRagExamples, ragExamples, motorTaxonomyBlock] = await Promise.all([
    baseVehicleId
      ? fetchMotorRagExamples({
          baseVehicleId,
          motorSubGroupId,
          literalName: request,
          limit: 3,
        })
      : Promise.resolve([]),
    fetchRagExamples(vehicle, request),
    baseVehicleId && motorSubGroupId
      ? buildMotorTaxonomyPromptBlock(baseVehicleId, motorSubGroupId)
      : Promise.resolve(null),
  ]);

  try {
    const ai = await suggestLaborJob(vehicle, request, {
      motorRagExamples,
      ragExamples,
      motorTaxonomyBlock: motorTaxonomyBlock ?? undefined,
      targetOperation: request,
      positionHint: motorContext.positionHint ?? undefined,
    });

    const motorAssignment =
      baseVehicleId != null
        ? await assignMotorNodeFromSuggestion({
            baseVehicleId,
            jobName: ai.jobName,
            positionHint: motorContext.positionHint ?? undefined,
            motorSubGroupId,
          })
        : null;

    const dataSource =
      motorAssignment?.dataSource ??
      (motorRagExamples.length || motorTaxonomyBlock
        ? isReferenceTaxonomyMode()
          ? "ai_taxonomy_scoped"
          : "ai_motor_scoped"
        : "ai_first_principles");

    return auditWrap(ai, request, false, "ai", {
      motorAssignment,
      dataSource,
    });
  } catch {
    const neighbor = await tryNeighborCache(vehicle, request);
    if (neighbor) {
      const result = auditWrap(neighbor, request, true, "neighbor_cache");
      result.auditWarnings.unshift(
        "AI unavailable — using similar cached internal guide entry. Verify hours.",
      );
      return result;
    }

    const cls = classifyOperation(request, request);
    const fallback = assemblyFallbackSuggestion(request, cls.subcategoryId);
    return {
      suggestion: fallback.suggestion,
      cached: false,
      auditWarnings: fallback.warnings,
      resolution: fallback.ruleId ? "assembly_fallback" : "generic_fallback",
    };
  }
}

/** Re-audit a cached suggestion on read (non-destructive). */
export function reauditCachedSuggestion(
  suggestion: LaborSuggestion,
  request: string,
  opts?: { skipClassify?: boolean },
): { suggestion: LaborSuggestion; auditWarnings: string[] } {
  const subcategoryId = opts?.skipClassify
    ? undefined
    : classifyOperation(suggestion.jobName, request).subcategoryId;
  const audit = auditAndNormalizeLaborSuggestion(suggestion, {
    request,
    subcategoryId,
  });
  return { suggestion: audit.suggestion, auditWarnings: audit.warnings };
}

/** Map DB row to suggestion for RAG/regenerate paths. */
export { rowToSuggestion };
