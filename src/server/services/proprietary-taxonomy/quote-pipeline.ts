/**
 * End-to-end quote pipeline:
 *   validated intent JSON → labor resolve → parts placeholder → billing cents
 *
 * Trust boundary: intent may suggest operations/variants only.
 * Hours come from labor_time_matrix (via resolver); rates from shop preset.
 */

import {
  billLaborFromResolvedMatrix,
  gateOperationKeys,
  normalizeIntentFitment,
  resolvePartsPlaceholder,
  type IntentFitmentResult,
  type InvoiceLaborLine,
  type PartsResolutionResult,
  type ServiceOperationRecord,
  type ShopLaborRatePreset,
  type VehiclePartFitmentRecord,
  type VehicleTaxonomyRecord,
} from "@/lib/proprietary-taxonomy";

import {
  resolveLaborHours,
  type LaborResolverStore,
} from "./labor-resolver";

export type PartsFitmentStore = {
  findFitment(
    vehicleTaxonomyId: string,
    serviceOperationId: string,
    variantFlags: string[],
  ): Promise<VehiclePartFitmentRecord[]>;
  enqueueSupplierSweep(input: {
    vehicleTaxonomyId: string;
    serviceOperationId: string;
    genericCategoryKey: string;
    variantFlags: string[];
    positionCode: string | null;
    defaultQuantity: number;
  }): Promise<{ jobId: string }>;
};

export type VehicleOperationStore = {
  resolveVehicle(intent: IntentFitmentResult["vehicle"]): Promise<VehicleTaxonomyRecord | null>;
  resolveOperations(keys: string[]): Promise<ServiceOperationRecord[]>;
};

export type QuotePipelineResult = {
  intent: IntentFitmentResult;
  vehicle: VehicleTaxonomyRecord | null;
  laborLines: InvoiceLaborLine[];
  parts: Array<{
    operationKey: string;
    serviceOperationId: string;
    resolution: PartsResolutionResult;
  }>;
  pendingReasons: string[];
  rejectedOperationKeys: string[];
};

async function resolvePartsForOperation(args: {
  partsStore: PartsFitmentStore;
  vehicleId: string;
  operation: ServiceOperationRecord;
  variantFlags: string[];
  positionHints: string[];
}): Promise<PartsResolutionResult> {
  const existing = await args.partsStore.findFitment(
    args.vehicleId,
    args.operation.id,
    args.variantFlags,
  );
  if (existing.length > 0) {
    return {
      status: "HIT",
      fitment: existing,
      genericCategoryKey: null,
      scrapeJobId: null,
    };
  }

  const placeholder = resolvePartsPlaceholder(
    args.operation.operationKey,
    args.variantFlags,
    args.positionHints,
  );
  if (!placeholder) {
    return {
      status: "PENDING_REVIEW",
      fitment: [],
      genericCategoryKey: null,
      scrapeJobId: null,
    };
  }

  const { jobId } = await args.partsStore.enqueueSupplierSweep({
    vehicleTaxonomyId: args.vehicleId,
    serviceOperationId: args.operation.id,
    genericCategoryKey: placeholder.genericCategoryKey,
    variantFlags: args.variantFlags,
    positionCode: args.positionHints[0] ?? null,
    defaultQuantity: placeholder.defaultQuantity,
  });

  return {
    status: "PLACEHOLDER_ENQUEUED",
    fitment: [],
    genericCategoryKey: placeholder.genericCategoryKey,
    scrapeJobId: jobId,
  };
}

/**
 * Application entry after LLM middleware returns JSON.
 * Never accepts hours/rates from the intent payload.
 */
export async function buildQuoteFromIntent(args: {
  rawIntent: unknown;
  allowListedOperationKeys: readonly string[];
  shopRate: ShopLaborRatePreset;
  vehicleStore: VehicleOperationStore;
  laborStore: LaborResolverStore;
  partsStore: PartsFitmentStore;
  persistLabor?: boolean;
}): Promise<QuotePipelineResult> {
  const normalized = normalizeIntentFitment(args.rawIntent);
  const { kept, rejected } = gateOperationKeys(
    normalized.targetOperationKeys,
    args.allowListedOperationKeys,
  );

  const intent: IntentFitmentResult = {
    ...normalized,
    targetOperationKeys: kept,
    unresolvedTokens: [...normalized.unresolvedTokens, ...rejected],
  };

  const pendingReasons: string[] = [];
  if (rejected.length) {
    pendingReasons.push(`Rejected non-allow-listed keys: ${rejected.join(", ")}`);
  }

  const vehicle = await args.vehicleStore.resolveVehicle(intent.vehicle);
  if (!vehicle) {
    return {
      intent,
      vehicle: null,
      laborLines: [],
      parts: [],
      pendingReasons: [...pendingReasons, "Vehicle taxonomy row not found"],
      rejectedOperationKeys: rejected,
    };
  }

  const operations = await args.vehicleStore.resolveOperations(kept);
  const byKey = new Map(operations.map((o) => [o.operationKey, o]));

  const laborLines: QuotePipelineResult["laborLines"] = [];
  const parts: QuotePipelineResult["parts"] = [];

  for (const key of kept) {
    const operation = byKey.get(key);
    if (!operation) {
      pendingReasons.push(`Unknown operation key: ${key}`);
      continue;
    }

    const labor = await resolveLaborHours({
      store: args.laborStore,
      targetVehicle: vehicle,
      serviceOperationId: operation.id,
      persist: args.persistLabor,
    });

    if (!labor.ok) {
      pendingReasons.push(`${key}: ${labor.reason}`);
    } else {
      laborLines.push(
        billLaborFromResolvedMatrix({
          matrixRow: labor.matrix,
          shopRate: args.shopRate,
          resolvePath: labor.path,
          operationKey: key,
        }),
      );
    }

    const resolution = await resolvePartsForOperation({
      partsStore: args.partsStore,
      vehicleId: vehicle.id,
      operation,
      variantFlags: intent.partsVariantFlags,
      positionHints: intent.positionHints,
    });
    parts.push({
      operationKey: key,
      serviceOperationId: operation.id,
      resolution,
    });
  }

  return {
    intent,
    vehicle,
    laborLines,
    parts,
    pendingReasons,
    rejectedOperationKeys: rejected,
  };
}
