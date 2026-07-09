/**
 * Sync MOTOR EWT DrillDown taxonomy for a vehicle into MotorCatalogNode.
 *
 * Usage:
 *   npm run sync:motor-taxonomy
 *   npm run sync:motor-taxonomy -- --baseVehicleId=22124
 *   npm run sync:motor-taxonomy -- --vin=19XFA1F51AE028415
 *   npm run sync:motor-taxonomy -- --json-only
 */
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { isMotorLaborEnabled } from "../src/server/services/motor/motor-config";
import {
  buildMotorTaxonomyTreeFromFlat,
  findMotorTaxonomyBranch,
  formatMotorTaxonomyBranch,
  syncMotorTaxonomyForVehicle,
} from "../src/server/services/motor/motor-taxonomy";

function parseArgs(argv: string[]) {
  let vin: string | undefined;
  let baseVehicleId: number | undefined;
  let jsonOnly = false;
  let noDb = false;

  for (const arg of argv) {
    if (arg === "--json-only") jsonOnly = true;
    if (arg === "--no-db") noDb = true;
    if (arg.startsWith("--vin=")) vin = arg.slice("--vin=".length);
    if (arg.startsWith("--baseVehicleId=")) {
      baseVehicleId = Number(arg.slice("--baseVehicleId=".length));
    }
  }

  return { vin, baseVehicleId, jsonOnly, noDb };
}

async function writeJsonSnapshot(
  baseVehicleId: number,
  payload: unknown,
): Promise<string> {
  const dir = path.join(process.cwd(), "prisma", "data");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `motor-taxonomy-${baseVehicleId}.json`);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

async function main() {
  if (!isMotorLaborEnabled()) {
    console.error(
      "MOTOR not enabled. Set MOTOR_PUBLIC_KEY + MOTOR_PRIVATE_KEY in .env.local (MOTOR_ENABLED=true).",
    );
    process.exit(1);
  }

  const { vin, baseVehicleId, jsonOnly, noDb } = parseArgs(process.argv.slice(2));

  console.log("MOTOR taxonomy sync (DrillDown)…");
  if (vin) console.log(`  VIN: ${vin}`);
  if (baseVehicleId) console.log(`  BaseVehicleID: ${baseVehicleId}`);

  const result = await syncMotorTaxonomyForVehicle({
    vin,
    baseVehicleId,
    persist: !jsonOnly && !noDb,
  });

  console.log(`BaseVehicleID=${result.baseVehicleId}${result.resolvedFromVin ? " (from VIN)" : ""}`);
  console.log(
    `Counts — systems: ${result.counts.systems}, groups: ${result.counts.groups}, subgroups: ${result.counts.subgroups}`,
  );

  if (result.persisted) {
    console.log(
      `DB upserted: ${result.persisted.upserted}, stale removed: ${result.persisted.deleted}`,
    );
  } else {
    console.log("DB persist skipped (--json-only or --no-db).");
  }

  const jsonPath = await writeJsonSnapshot(result.baseVehicleId, {
    baseVehicleId: result.baseVehicleId,
    syncedAt: new Date().toISOString(),
    counts: result.counts,
    nodes: result.nodes,
  });
  console.log(`JSON snapshot: ${jsonPath}`);

  const brakes = findMotorTaxonomyBranch(
    buildMotorTaxonomyTreeFromFlat(result.nodes),
    "Brakes",
  );

  console.log("\nBrakes subtree:");
  if (brakes) {
    for (const line of formatMotorTaxonomyBranch(brakes)) console.log(line);
  } else {
    console.log("  (Brakes system not found)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
