/**
 * End-to-end Labor Book browse path validation (hierarchy + optional cache hits).
 *
 * Usage:
 *   npx tsx scripts/test-labor-paths.ts
 *   npx tsx --tsconfig ./tsconfig.scripts.json scripts/test-labor-paths.ts
 */
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { enrichHitClassification, matchOperationsToSubcategory } from "../src/lib/labor-categories";
import { applyBrowseFacets } from "../src/lib/labor-nav-facets";
import {
  LABOR_BROWSE_TEST_PATHS,
  validateBrowsePathHierarchy,
  type LaborBrowsePathDefinition,
} from "../src/lib/labor-browse-paths";
import {
  storedRowMatchesVehicle,
  vehicleKeysForLookup,
  vehicleKeyMatchRank,
} from "../src/lib/labor-vehicle-key";
import type { Vehicle } from "../src/server/services/labor-guide";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function toVehicle(def: LaborBrowsePathDefinition): Vehicle {
  const v = def.vehicle;
  return {
    vin: v.vin ?? null,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim ?? null,
    engine: v.engine ?? null,
    drivetrain: null,
  };
}

async function fetchVehicleRows(vehicle: Vehicle, take = 400) {
  const { prisma } = await import("../src/db/client");
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

  const byId = new Map<string, (typeof keyRows)[0]>();
  for (const row of [...keyRows, ...ymmRows]) byId.set(row.id, row);
  const filtered = [...byId.values()].filter((row) => storedRowMatchesVehicle(row, vehicle));

  const byQuery = new Map<string, (typeof filtered)[0]>();
  for (const row of filtered) {
    const existing = byQuery.get(row.queryKey);
    if (
      !existing ||
      vehicleKeyMatchRank(row.vehicleKey) > vehicleKeyMatchRank(existing.vehicleKey)
    ) {
      byQuery.set(row.queryKey, row);
    }
  }

  return [...byQuery.values()].slice(0, take);
}

async function browseCachedHits(def: LaborBrowsePathDefinition) {
  const vehicle = toVehicle(def);
  const rows = await fetchVehicleRows(vehicle);
  const hits = rows.map((row) =>
    enrichHitClassification({ jobName: row.jobName, queryText: row.queryText }, row.queryKey),
  );
  const inSub = matchOperationsToSubcategory(def.browsePath.subcategoryId, hits);
  return applyBrowseFacets(
    inSub,
    def.browsePath.subcategoryId,
    def.browsePath.positionId,
    def.browsePath.operationId,
  );
}

async function main() {
  console.log("\n=== Labor browse path validation ===\n");

  let hierarchyPass = 0;
  for (const def of LABOR_BROWSE_TEST_PATHS) {
    const result = validateBrowsePathHierarchy(def);
    console.log(`${def.id} [${def.pattern}]`);
    console.log(`  Trail: ${def.steps[def.steps.length - 1]?.trail.slice(1).join(" › ") ?? "—"}`);
    console.log(`  Synthetic query: "${def.syntheticQuery}"`);
    console.log(`  Add target: ${def.addToJobTarget}`);
    if (result.ok) {
      hierarchyPass += 1;
      console.log("  Hierarchy: PASS");
    } else {
      console.log("  Hierarchy: FAIL");
      for (const e of result.errors) console.log(`    - ${e}`);
    }
    console.log("");
  }

  assert(hierarchyPass === LABOR_BROWSE_TEST_PATHS.length, "All hierarchy checks must pass");

  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set — skipping cache hit checks (hierarchy-only PASS).\n");
    console.log("All labor browse path hierarchy checks passed.");
    return;
  }

  const { prisma } = await import("../src/db/client");
  const totalLabor = await prisma.laborOperation.count();
  console.log(`LaborOperation cache: ${totalLabor} rows\n`);

  let cachePass = 0;
  for (const def of LABOR_BROWSE_TEST_PATHS) {
    const hits = await browseCachedHits(def);
    console.log(`${def.id} — cache browse: ${hits.length} hit(s)`);
    for (const h of hits.slice(0, 5)) {
      console.log(`  · ${h.jobName} (${h.totalHours ?? "?"}h)`);
    }
    if (hits.length > 0) {
      cachePass += 1;
      console.log("  Cache: PASS (≥1 hit)\n");
    } else {
      console.log("  Cache: WARN (0 hits — run db:build-labor or use AI generate in UI)\n");
    }
  }

  await prisma.$disconnect();

  console.log(`Summary: hierarchy ${hierarchyPass}/${LABOR_BROWSE_TEST_PATHS.length} PASS`);
  console.log(`         cache     ${cachePass}/${LABOR_BROWSE_TEST_PATHS.length} with hits`);
  console.log("\nAll labor browse path checks completed.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
