/**
 * Refresh AI-generated LaborOperation cache rows through the live Labor Book path.
 *
 * This intentionally calls `lookupLaborSuggestion()` instead of updating rows
 * directly so refreshes use the same v6 prompt, retry calibration, hour floors,
 * taxonomy fallback, VIN/YMM write-through, and cache shape as the UI.
 *
 * Run:
 *   npm run db:refresh-labor
 *   npm run db:refresh-labor -- --pattern=bearing --limit=10
 *   npm run db:refresh-labor -- --stale-prompt
 *   npm run db:refresh-labor -- --all-ai --pattern=bearing
 *   DRY_RUN=1 npm run db:refresh-labor -- --pattern=bearing
 */
import { prisma } from "../src/db/client";
import { LABOR_GUIDE_PROMPT_VERSION } from "../src/lib/labor-guide-prompt";
import { primaryVehicleKey, storedRowMatchesVehicle } from "../src/lib/labor-vehicle-key";
import { shouldCalibrateLaborDataSource } from "../src/lib/labor-hours-calibration";
import { lookupLaborSuggestion } from "../src/server/labor-guide-cache";
import type { Vehicle } from "../src/server/services/labor-guide";

const DEFAULT_LIMIT = 25;
const DEFAULT_CONCURRENCY = 1;

type Args = {
  allAi: boolean;
  dryRun: boolean;
  ids: string[];
  limit: number;
  olderThanDays: number | null;
  pattern: string | null;
  stalePrompt: boolean;
};

type CandidateRow = {
  id: string;
  vehicleKey: string;
  queryKey: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleTrim: string | null;
  vehicleEngine: string | null;
  vehicleVin: string | null;
  queryText: string;
  jobName: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations: string[];
  dataSource: string | null;
  promptVersion: string | null;
  motorApplicationId: number | null;
  hitCount: number;
  refreshedAt: Date;
};

type RefreshTarget = {
  row: CandidateRow;
  vehicle: Vehicle;
};

function parseBoolEnv(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    allAi: false,
    dryRun: parseBoolEnv("DRY_RUN"),
    ids: [],
    limit: Number(process.env.LIMIT) || DEFAULT_LIMIT,
    olderThanDays: null,
    pattern: null,
    stalePrompt: false,
  };

  for (const arg of argv) {
    if (arg === "--all-ai") args.allAi = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--stale-prompt") args.stalePrompt = true;
    else if (arg.startsWith("--id=")) args.ids.push(arg.slice("--id=".length).trim());
    else if (arg.startsWith("--limit=")) args.limit = Number(arg.slice("--limit=".length)) || args.limit;
    else if (arg.startsWith("--older-than-days=")) {
      args.olderThanDays = Number(arg.slice("--older-than-days=".length)) || null;
    } else if (arg.startsWith("--pattern=")) {
      args.pattern = arg.slice("--pattern=".length).trim() || null;
    }
  }

  // The common case after a prompt bump: refresh stale prompt-version AI rows.
  if (!args.allAi && args.olderThanDays == null && args.ids.length === 0) {
    args.stalePrompt = true;
  }

  return args;
}

function patternWhere(pattern: string | null) {
  if (!pattern) return {};
  return {
    OR: [
      { jobName: { contains: pattern, mode: "insensitive" as const } },
      { queryText: { contains: pattern, mode: "insensitive" as const } },
      { queryKey: { contains: pattern, mode: "insensitive" as const } },
    ],
  };
}

function staleWhere(args: Args) {
  const parts = [];
  if (args.ids.length) {
    parts.push({ id: { in: args.ids } });
  }
  if (args.stalePrompt) {
    parts.push({
      OR: [{ promptVersion: null }, { promptVersion: { not: LABOR_GUIDE_PROMPT_VERSION } }],
    });
  }
  if (args.olderThanDays != null) {
    parts.push({
      refreshedAt: { lt: new Date(Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000) },
    });
  }
  if (args.allAi || parts.length === 0) return {};
  return { OR: parts };
}

function vehicleFromRow(row: CandidateRow): Vehicle {
  return {
    vin: row.vehicleVin,
    year: row.vehicleYear,
    make: row.vehicleMake,
    model: row.vehicleModel,
    trim: row.vehicleTrim,
    engine: row.vehicleEngine,
    drivetrain: null,
  };
}

function vehicleLabel(vehicle: Vehicle): string {
  return [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ");
}

function rowLabel(row: CandidateRow): string {
  return `${vehicleLabel(vehicleFromRow(row)) || row.vehicleKey} — ${row.queryText}`;
}

function uniqueTargetKey(row: CandidateRow, vehicle: Vehicle): string {
  return `${primaryVehicleKey(vehicle)} ${row.queryKey}`;
}

async function warmup(tries = 6) {
  for (let i = 1; i <= tries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (e) {
      if (i === tries) throw e;
      console.log(`  (db waking, retry ${i}/${tries - 1})`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function loadTargets(args: Args): Promise<RefreshTarget[]> {
  const take = Math.max(args.limit * 4, args.limit);
  const rows = await prisma.laborOperation.findMany({
    where: {
      AND: [
        patternWhere(args.pattern),
        staleWhere(args),
        { OR: [{ dataSource: null }, { dataSource: { startsWith: "ai" } }] },
        { motorApplicationId: null },
      ],
    },
    orderBy: [{ hitCount: "desc" }, { refreshedAt: "asc" }],
    take,
  });

  const seen = new Set<string>();
  const targets: RefreshTarget[] = [];
  for (const row of rows) {
    if (!shouldCalibrateLaborDataSource(row.dataSource)) continue;
    const vehicle = vehicleFromRow(row);
    if (!storedRowMatchesVehicle(row, vehicle)) continue;
    const key = uniqueTargetKey(row, vehicle);
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({ row, vehicle });
    if (targets.length >= args.limit) break;
  }
  return targets;
}

async function runPool<T>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

async function main() {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    /* .env optional */
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  const concurrency = Math.max(1, Number(process.env.CONC) || DEFAULT_CONCURRENCY);

  await warmup();
  const targets = await loadTargets(args);
  const staleCount = await prisma.laborOperation.count({
    where: {
      AND: [
        patternWhere(args.pattern),
        staleWhere({ ...args, limit: Number.MAX_SAFE_INTEGER }),
        { OR: [{ dataSource: null }, { dataSource: { startsWith: "ai" } }] },
        { motorApplicationId: null },
      ],
    },
  });

  console.log(
    `Labor cache refresh${args.dryRun ? " [DRY RUN]" : ""}\n` +
      `  prompt:       ${LABOR_GUIDE_PROMPT_VERSION}\n` +
      `  mode:         ${args.allAi ? "all-ai" : args.stalePrompt ? "stale-prompt" : "filtered"}\n` +
      `  pattern:      ${args.pattern ?? "(none)"}\n` +
      `  olderThan:    ${args.olderThanDays ?? "(none)"}\n` +
      `  candidates:   ${staleCount}\n` +
      `  this run:     ${targets.length} (LIMIT=${args.limit}, CONC=${concurrency})`,
  );

  if (!targets.length) {
    console.log("Nothing to refresh.");
    return;
  }

  if (args.dryRun) {
    for (const { row } of targets) {
      console.log(
        `  would refresh: ${rowLabel(row)}  ` +
          `[${row.laborHoursPerUnit.toFixed(2)} hr/unit, prompt=${row.promptVersion ?? "null"}]`,
      );
    }
    return;
  }

  let refreshed = 0;
  let failed = 0;
  await runPool(targets, concurrency, async ({ row, vehicle }, index) => {
    try {
      const before = `${row.laborHoursPerUnit.toFixed(2)} hr/unit`;
      const result = await lookupLaborSuggestion(vehicle, row.queryText);
      refreshed++;
      console.log(
        `  [${index + 1}/${targets.length}] refreshed  ${rowLabel(row)}  ` +
          `${before} -> ${result.suggestion.laborHoursPerUnit.toFixed(2)} hr/unit  ` +
          `source=${result.dataSource ?? "ai"} cached=${result.cached}`,
      );
    } catch (e) {
      failed++;
      console.warn(
        `  [${index + 1}/${targets.length}] FAIL  ${rowLabel(row)}: ${
          e instanceof Error ? e.message : e
        }`,
      );
    }
  });

  console.log(`Done. refreshed=${refreshed} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
