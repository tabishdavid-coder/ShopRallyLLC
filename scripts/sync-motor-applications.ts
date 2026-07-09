/**
 * Sync MOTOR EWT application rows per SubGroup into MotorCatalogApplication.
 *
 * Usage:
 *   npm run sync:motor-applications
 *   npm run sync:motor-applications -- --baseVehicleId=22124
 *   npm run sync:motor-applications -- --baseVehicleId=22124 --all
 *   npm run sync:motor-applications -- --baseVehicleId=22124 --subGroupId=44
 *   npm run sync:motor-applications -- --baseVehicleId=22124 --system=Brakes --limit=5
 *   npm run sync:motor-applications -- --baseVehicleId=22124 --dry-run
 *   npm run sync:motor-applications -- --vin=19XFA1F51AE028415 --no-db
 */
import dotenv from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { isMotorLaborEnabled } from "../src/server/services/motor/motor-config";
import {
  syncMotorApplicationsForVehicle,
  type SubGroupSyncDetail,
  type SyncMotorApplicationsResult,
} from "../src/server/services/motor/motor-applications";

function parseArgs(argv: string[]) {
  let vin: string | undefined;
  let baseVehicleId: number | undefined;
  let system: string | undefined;
  let subGroupId: number | undefined;
  let limit: number | undefined;
  let noDb = false;
  let dryRun = false;
  let all = false;

  for (const arg of argv) {
    if (arg === "--no-db") noDb = true;
    if (arg === "--dry-run") dryRun = true;
    if (arg === "--all") all = true;
    if (arg.startsWith("--vin=")) vin = arg.slice("--vin=".length);
    if (arg.startsWith("--baseVehicleId=")) {
      baseVehicleId = Number(arg.slice("--baseVehicleId=".length));
    }
    if (arg.startsWith("--system=")) system = arg.slice("--system=".length);
    if (arg.startsWith("--subGroupId=")) {
      subGroupId = Number(arg.slice("--subGroupId=".length));
    }
    if (arg.startsWith("--limit=")) {
      limit = Number(arg.slice("--limit=".length));
    }
  }

  return { vin, baseVehicleId, system, subGroupId, limit, noDb, dryRun, all };
}

function formatSampleRow(row: {
  motorApplicationId: number;
  literalName: string;
  operationType?: string;
  estimatedHours: number;
  positionQualifier?: string;
  motorSubGroupId: number;
}): string {
  const pos = row.positionQualifier ? ` @ ${row.positionQualifier}` : "";
  const op = row.operationType ? ` (${row.operationType})` : "";
  return `  [AppID=${row.motorApplicationId}] ${row.literalName}${op}${pos} — ${row.estimatedHours}h (SubGroup ${row.motorSubGroupId})`;
}

function formatProgress(detail: SubGroupSyncDetail): string {
  const suffix = detail.error
    ? ` — ERROR: ${detail.error}`
    : ` — ${detail.appCount} app${detail.appCount === 1 ? "" : "s"}`;
  return `[${detail.index}/${detail.total}] ${detail.path}${suffix}`;
}

function sortedSystemCounts(counts: Record<string, number>): [string, number][] {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

async function writeFullSyncSummary(
  baseVehicleId: number,
  result: SyncMotorApplicationsResult,
  startedAt: Date,
  elapsedMs: number,
  dryRun: boolean,
): Promise<string> {
  const dir = path.join(process.cwd(), "prisma", "data");
  await mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `motor-applications-${baseVehicleId}-full-sync-summary.json`);
  const payload = {
    baseVehicleId,
    syncedAt: new Date().toISOString(),
    startedAt: startedAt.toISOString(),
    elapsedMs,
    dryRun,
    subgroupsProcessed: result.subgroupsProcessed,
    subgroupsSkippedEmpty: result.subgroupsSkippedEmpty,
    applicationsFetched: result.applicationsFetched,
    applicationsUpserted: result.applicationsUpserted,
    applicationsDeleted: result.applicationsDeleted,
    errorCount: result.errors.length,
    systemCounts: Object.fromEntries(sortedSystemCounts(result.systemCounts)),
    errors: result.errors,
    subgroupDetails: result.subgroupDetails.map((d) => ({
      motorSubGroupId: d.motorSubGroupId,
      path: d.path,
      appCount: d.appCount,
      error: d.error,
    })),
  };
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

  const { vin, baseVehicleId, system, subGroupId, limit, noDb, dryRun, all } = parseArgs(
    process.argv.slice(2),
  );
  const syncAll = all || (!subGroupId && !system && !limit);

  console.log("MOTOR applications sync (EWT Summaries per SubGroup)…");
  if (vin) console.log(`  VIN: ${vin}`);
  if (baseVehicleId) console.log(`  BaseVehicleID: ${baseVehicleId}`);
  if (system) console.log(`  System filter: ${system}`);
  if (subGroupId) console.log(`  SubGroup filter: ${subGroupId}`);
  if (limit) console.log(`  Limit: ${limit} subgroups`);
  if (syncAll && !subGroupId) console.log("  Scope: ALL subgroups");
  if (dryRun) console.log("  Mode: DRY RUN (count only, no DB writes)");
  if (noDb) console.log("  Persist: disabled (--no-db)");

  const startedAt = new Date();
  const startMs = Date.now();

  const result = await syncMotorApplicationsForVehicle({
    vin,
    baseVehicleId,
    systemFilter: system,
    subGroupId,
    limit,
    persist: !noDb,
    dryRun,
    ensureTaxonomy: true,
    onProgress: (detail) => {
      console.log(formatProgress(detail));
    },
  });

  const elapsedMs = Date.now() - startMs;

  console.log("\n── Summary ──");
  console.log(`BaseVehicleID=${result.baseVehicleId}${result.resolvedFromVin ? " (from VIN)" : ""}`);
  if (result.taxonomySynced) {
    console.log("Taxonomy auto-synced (was missing for this vehicle).");
  }
  console.log(
    `SubGroups processed: ${result.subgroupsProcessed}, empty: ${result.subgroupsSkippedEmpty}, errors: ${result.errors.length}`,
  );
  console.log(
    `Applications — fetched: ${result.applicationsFetched}, upserted: ${result.applicationsUpserted}, stale removed: ${result.applicationsDeleted}`,
  );
  console.log(`Elapsed: ${(elapsedMs / 1000).toFixed(1)}s`);

  if (Object.keys(result.systemCounts).length) {
    console.log("\nApplications by system:");
    for (const [name, count] of sortedSystemCounts(result.systemCounts)) {
      console.log(`  ${name}: ${count}`);
    }
  }

  if (result.errors.length) {
    console.log("\nErrors:");
    for (const err of result.errors) {
      console.log(`  SubGroup ${err.motorSubGroupId} (${err.path}): ${err.error}`);
    }
  }

  if (result.sampleRows.length) {
    console.log("\nSample rows:");
    for (const row of result.sampleRows) {
      console.log(formatSampleRow(row));
    }
  } else if (!result.subgroupsProcessed) {
    console.log("\nNo subgroups found — run taxonomy sync first.");
  } else {
    console.log("\nNo application rows returned (all subgroups empty or errored).");
  }

  const isFullSync = syncAll && !subGroupId && !system && !limit;
  if (!noDb && !dryRun && isFullSync) {
    const summaryPath = await writeFullSyncSummary(
      result.baseVehicleId,
      result,
      startedAt,
      elapsedMs,
      dryRun,
    );
    console.log(`\nFull sync summary: ${summaryPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
