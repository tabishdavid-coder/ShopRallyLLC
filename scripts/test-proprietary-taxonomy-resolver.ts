/**
 * Smoke test: proprietary taxonomy labor/parts/billing pipeline (in-memory).
 *
 * Run: npx tsx --tsconfig ./tsconfig.scripts.json scripts/test-proprietary-taxonomy-resolver.ts
 *
 * Demonstrates:
 *  - L2 chassis interpolation (INLINE_4_OPEN → V6_TIGHT × 1.28)
 *  - Parts generic-category placeholder enqueue
 *  - Texarkana $135/hr unalterable cents billing
 *  - LLM intent cannot inject hours/rates
 */

import assert from "node:assert/strict";

import {
  TEXARKANA_PRESET,
  type LaborTimeMatrixRecord,
  type VehiclePartFitmentRecord,
  type VehicleTaxonomyRecord,
} from "../src/lib/proprietary-taxonomy";
import {
  resolveLaborHours,
  type LaborNeighbor,
  type LaborResolverStore,
} from "../src/server/services/proprietary-taxonomy/labor-resolver";
import { buildQuoteFromIntent } from "../src/server/services/proprietary-taxonomy/quote-pipeline";

function emb(seed: number): number[] {
  // Tiny deterministic pseudo-embedding for distance demos (8-d)
  return Array.from({ length: 8 }, (_, i) => Math.sin(seed * (i + 1) * 0.37));
}

const civic: VehicleTaxonomyRecord = {
  id: "vt_civic_2012",
  year: 2012,
  make: "Honda",
  model: "Civic",
  engineConfiguration: "1.8L I4",
  driveType: "FWD",
  chassisComplexityTier: "INLINE_4_OPEN",
  taxonomyKey: "2012|honda|civic|1.8l_i4|fwd",
  configEmbedding: emb(1),
};

const accord: VehicleTaxonomyRecord = {
  id: "vt_accord_2015",
  year: 2015,
  make: "Honda",
  model: "Accord",
  engineConfiguration: "3.5L V6",
  driveType: "FWD",
  chassisComplexityTier: "V6_TIGHT",
  taxonomyKey: "2015|honda|accord|3.5l_v6|fwd",
  configEmbedding: emb(9), // far enough that L1 may reject → L2
};

const opId = "op_brakes_front_pads";
const opKey = "BRAKES.FRONT.PADS.R_AND_R";

const seedMatrix: LaborTimeMatrixRecord = {
  id: "ltm_civic_pads",
  vehicleTaxonomyId: civic.id,
  serviceOperationId: opId,
  factoryHours: 1.0,
  standardHours: 1.0,
  telemetryScore: null,
  chassisMultiplierApplied: 1,
  confidence: 1,
  inheritedFromId: null,
  lastTelemetrySource: "FACTORY_SEED",
};

function makeLaborStore(seed: LaborTimeMatrixRecord[]): LaborResolverStore {
  const rows = new Map(seed.map((r) => [`${r.vehicleTaxonomyId}:${r.serviceOperationId}`, r]));
  const vehicles = new Map<string, VehicleTaxonomyRecord>([
    [civic.id, civic],
    [accord.id, accord],
  ]);

  return {
    async findExactMatrix(vehicleTaxonomyId, serviceOperationId) {
      return rows.get(`${vehicleTaxonomyId}:${serviceOperationId}`) ?? null;
    },
    async findMatrixNeighbors(serviceOperationId, limit = 8) {
      const out: LaborNeighbor[] = [];
      for (const row of rows.values()) {
        if (row.serviceOperationId !== serviceOperationId) continue;
        const vehicle = vehicles.get(row.vehicleTaxonomyId);
        if (!vehicle) continue;
        out.push({ vehicle, matrix: row });
      }
      return out.slice(0, limit);
    },
    async persistMatrixRow(row) {
      const saved = { ...row, id: row.id ?? `ltm_${rows.size + 1}` } as LaborTimeMatrixRecord;
      rows.set(`${saved.vehicleTaxonomyId}:${saved.serviceOperationId}`, saved);
      return saved;
    },
  };
}

async function testChassisInterpolation() {
  const store = makeLaborStore([seedMatrix]);
  const result = await resolveLaborHours({
    store,
    targetVehicle: accord,
    serviceOperationId: opId,
    persist: true,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.path, "L2_CHASSIS");
  assert.equal(result.multiplierApplied, 1.28);
  assert.equal(result.matrix.factoryHours, 1.28);
  console.log("✓ L2 chassis interpolation: 1.0 × 1.28 =", result.matrix.factoryHours);
}

async function testQuotePipelineBilling() {
  const laborStore = makeLaborStore([seedMatrix]);
  const fitment: VehiclePartFitmentRecord[] = [];
  let scrapeJobs = 0;

  const quote = await buildQuoteFromIntent({
    rawIntent: {
      vehicle: {
        year: 2015,
        make: "Honda",
        model: "Accord",
        engine_configuration: "3.5L V6",
        trim: null,
        drive_type: "FWD",
      },
      target_operation_keys: [opKey, "INVENTED.KEY.SHOULD.DROP"],
      parts_variant_flags: ["premium", "ceramic"],
      position_hints: ["FRONT"],
      confidence: 0.9,
      unresolved_tokens: [],
    },
    allowListedOperationKeys: [opKey],
    shopRate: TEXARKANA_PRESET,
    persistLabor: true,
    vehicleStore: {
      async resolveVehicle() {
        return accord;
      },
      async resolveOperations(keys) {
        return keys.includes(opKey)
          ? [{ id: opId, operationKey: opKey, displayName: "Pads R&R", isBillableLeaf: true }]
          : [];
      },
    },
    laborStore,
    partsStore: {
      async findFitment() {
        return fitment;
      },
      async enqueueSupplierSweep(input) {
        scrapeJobs += 1;
        assert.equal(input.genericCategoryKey, "BRAKE_PAD_FRONT_CERAMIC_PREMIUM");
        return { jobId: `scrape_${scrapeJobs}` };
      },
    },
  });

  assert.deepEqual(quote.rejectedOperationKeys, ["INVENTED.KEY.SHOULD.DROP"]);
  assert.equal(quote.laborLines.length, 1);
  const line = quote.laborLines[0]!;
  assert.equal(line.rateCentsPerHour, 13500);
  assert.equal(line.hours, 1.28);
  assert.equal(line.laborTotalCents, Math.round(1.28 * 13500)); // 17280
  assert.equal(quote.parts[0]?.resolution.status, "PLACEHOLDER_ENQUEUED");
  assert.equal(quote.parts[0]?.resolution.genericCategoryKey, "BRAKE_PAD_FRONT_CERAMIC_PREMIUM");
  assert.equal(scrapeJobs, 1);

  console.log("✓ Quote pipeline:");
  console.log("  hours=", line.hours, "rateCents=", line.rateCentsPerHour, "totalCents=", line.laborTotalCents);
  console.log("  parts placeholder=", quote.parts[0]?.resolution.genericCategoryKey);
  console.log("  rejected keys=", quote.rejectedOperationKeys);
}

async function testIntentCannotInjectMoney() {
  // normalizeIntentFitment / billing ignore any smuggled money fields
  const laborStore = makeLaborStore([
    {
      ...seedMatrix,
      vehicleTaxonomyId: accord.id,
      factoryHours: 1.28,
      standardHours: 1.28,
    },
  ]);

  const quote = await buildQuoteFromIntent({
    rawIntent: {
      vehicle: {
        year: 2015,
        make: "Honda",
        model: "Accord",
        engine_configuration: "3.5L V6",
        trim: null,
        drive_type: null,
      },
      target_operation_keys: [opKey],
      parts_variant_flags: [],
      position_hints: ["FRONT"],
      confidence: 1,
      unresolved_tokens: [],
      // Smuggled fields — must not affect billing
      factory_hours: 0.1,
      hourly_rate: 20,
      labor_total: 2,
    },
    allowListedOperationKeys: [opKey],
    shopRate: TEXARKANA_PRESET,
    vehicleStore: {
      async resolveVehicle() {
        return accord;
      },
      async resolveOperations() {
        return [{ id: opId, operationKey: opKey, displayName: "Pads R&R", isBillableLeaf: true }];
      },
    },
    laborStore,
    partsStore: {
      async findFitment() {
        return [];
      },
      async enqueueSupplierSweep() {
        return { jobId: "noop" };
      },
    },
  });

  assert.equal(quote.laborLines[0]?.laborTotalCents, Math.round(1.28 * 13500));
  console.log("✓ Intent money injection ignored; totalCents=", quote.laborLines[0]?.laborTotalCents);
}

async function main() {
  await testChassisInterpolation();
  await testQuotePipelineBilling();
  await testIntentCannotInjectMoney();
  console.log("\nAll proprietary taxonomy resolver checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
