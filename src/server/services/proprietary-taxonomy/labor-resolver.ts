/**
 * Labor hours resolution chain (L0 → L1 → L2 → L4).
 *
 * Pure application logic with an injectable store — no LLM, no money math.
 * Billing happens only after a successful resolve via proprietary-taxonomy/billing.
 */

import {
  chassisLaborMultiplier,
  confidenceFromDistance,
  cosineDistance,
  scaleLaborHours,
  vectorAcceptBand,
  type ChassisComplexityTier,
  type LaborResolvePath,
  type LaborTimeMatrixRecord,
  type LaborTelemetrySource,
  type VehicleTaxonomyRecord,
} from "@/lib/proprietary-taxonomy";

export type LaborNeighbor = {
  vehicle: VehicleTaxonomyRecord;
  matrix: LaborTimeMatrixRecord;
};

export type LaborResolverStore = {
  findExactMatrix(
    vehicleTaxonomyId: string,
    serviceOperationId: string,
  ): Promise<LaborTimeMatrixRecord | null>;
  /**
   * Vehicles that already have a matrix row for this operation,
   * with embeddings for k-NN. Caller may pre-filter in SQL via pgvector.
   */
  findMatrixNeighbors(
    serviceOperationId: string,
    limit?: number,
  ): Promise<LaborNeighbor[]>;
  /** Persist an inherited / interpolated row for future L0 hits. */
  persistMatrixRow(
    row: Omit<LaborTimeMatrixRecord, "id"> & { id?: string },
  ): Promise<LaborTimeMatrixRecord>;
};

export type LaborResolveResult =
  | {
      ok: true;
      path: Exclude<LaborResolvePath, "L4_PENDING">;
      matrix: LaborTimeMatrixRecord;
      sourceVehicleId: string;
      multiplierApplied: number;
      neighborDistance: number | null;
    }
  | {
      ok: false;
      path: "L4_PENDING";
      reason: string;
    };

function newMatrixId(): string {
  return `ltm_${Math.random().toString(36).slice(2, 12)}`;
}

function buildInheritedRow(args: {
  targetVehicleId: string;
  serviceOperationId: string;
  factoryHours: number;
  standardHours: number;
  confidence: number;
  inheritedFromId: string | null;
  multiplier: number;
  source: LaborTelemetrySource;
}): LaborTimeMatrixRecord {
  return {
    id: newMatrixId(),
    vehicleTaxonomyId: args.targetVehicleId,
    serviceOperationId: args.serviceOperationId,
    factoryHours: args.factoryHours,
    standardHours: args.standardHours,
    telemetryScore: null,
    chassisMultiplierApplied: args.multiplier,
    confidence: args.confidence,
    inheritedFromId: args.inheritedFromId,
    lastTelemetrySource: args.source,
  };
}

/**
 * Resolve labor hours for a vehicle × operation using the documented fallback chain.
 */
export async function resolveLaborHours(args: {
  store: LaborResolverStore;
  targetVehicle: VehicleTaxonomyRecord;
  serviceOperationId: string;
  /** Prefer persisting L1/L2 rows (cache-aside). Disable in dry-run. */
  persist?: boolean;
}): Promise<LaborResolveResult> {
  const persist = args.persist ?? true;
  const { store, targetVehicle, serviceOperationId } = args;

  // L0 — exact
  const exact = await store.findExactMatrix(targetVehicle.id, serviceOperationId);
  if (exact) {
    return {
      ok: true,
      path: "L0_EXACT",
      matrix: exact,
      sourceVehicleId: targetVehicle.id,
      multiplierApplied: exact.chassisMultiplierApplied ?? 1,
      neighborDistance: null,
    };
  }

  // L1 — vector space similarity
  const queryEmbedding = targetVehicle.configEmbedding;
  let best:
    | { neighbor: LaborNeighbor; distance: number; band: ReturnType<typeof vectorAcceptBand> }
    | null = null;

  if (queryEmbedding && queryEmbedding.length > 0) {
    const neighbors = await store.findMatrixNeighbors(serviceOperationId, 8);
    for (const neighbor of neighbors) {
      const emb = neighbor.vehicle.configEmbedding;
      if (!emb || emb.length !== queryEmbedding.length) continue;
      const distance = cosineDistance(queryEmbedding, emb);
      const band = vectorAcceptBand(distance);
      if (band === "REJECT") continue;
      if (!best || distance < best.distance) {
        best = { neighbor, distance, band };
      }
    }
  }

  if (best) {
    const fromTier = best.neighbor.vehicle.chassisComplexityTier;
    const toTier = targetVehicle.chassisComplexityTier;
    const needsChassis =
      best.band === "INHERIT_RECHECK_CHASSIS" || fromTier !== toTier;

    let hours = best.neighbor.matrix.factoryHours;
    let multiplier = 1;
    let path: Exclude<LaborResolvePath, "L4_PENDING"> = "L1_VECTOR";
    let source: LaborTelemetrySource = "VECTOR_INHERIT";

    if (needsChassis) {
      const m = chassisLaborMultiplier(fromTier, toTier);
      if (m == null) {
        return {
          ok: false,
          path: "L4_PENDING",
          reason: `No chassis multiplier for ${fromTier} → ${toTier}`,
        };
      }
      multiplier = m;
      hours = scaleLaborHours(best.neighbor.matrix.factoryHours, m);
      path = fromTier === toTier ? "L1_VECTOR" : "L2_CHASSIS";
      source = fromTier === toTier ? "VECTOR_INHERIT" : "CHASSIS_INTERPOLATED";
    }

    const confidence = confidenceFromDistance(best.distance) * (needsChassis && fromTier !== toTier ? 0.95 : 1);
    const row = buildInheritedRow({
      targetVehicleId: targetVehicle.id,
      serviceOperationId,
      factoryHours: hours,
      standardHours: hours,
      confidence: Math.round(confidence * 1000) / 1000,
      inheritedFromId: best.neighbor.matrix.id,
      multiplier,
      source,
    });

    const matrix = persist ? await store.persistMatrixRow(row) : row;
    return {
      ok: true,
      path,
      matrix,
      sourceVehicleId: best.neighbor.vehicle.id,
      multiplierApplied: multiplier,
      neighborDistance: best.distance,
    };
  }

  // L2 — chassis interpolation from a reference-tier seed (INLINE_4_OPEN preferred)
  const neighbors = await store.findMatrixNeighbors(serviceOperationId, 25);
  const reference =
    neighbors.find((n) => n.vehicle.chassisComplexityTier === "INLINE_4_OPEN") ??
    neighbors[0];

  if (!reference) {
    return {
      ok: false,
      path: "L4_PENDING",
      reason: "No labor seed available for vector or chassis fallback",
    };
  }

  const fromTier: ChassisComplexityTier = reference.vehicle.chassisComplexityTier;
  const toTier = targetVehicle.chassisComplexityTier;
  const multiplier = chassisLaborMultiplier(fromTier, toTier);
  if (multiplier == null) {
    return {
      ok: false,
      path: "L4_PENDING",
      reason: `No chassis multiplier for ${fromTier} → ${toTier}`,
    };
  }

  const hours = scaleLaborHours(reference.matrix.factoryHours, multiplier);
  const row = buildInheritedRow({
    targetVehicleId: targetVehicle.id,
    serviceOperationId,
    factoryHours: hours,
    standardHours: hours,
    confidence: 0.5,
    inheritedFromId: reference.matrix.id,
    multiplier,
    source: "CHASSIS_INTERPOLATED",
  });

  const matrix = persist ? await store.persistMatrixRow(row) : row;
  return {
    ok: true,
    path: "L2_CHASSIS",
    matrix,
    sourceVehicleId: reference.vehicle.id,
    multiplierApplied: multiplier,
    neighborDistance: null,
  };
}
