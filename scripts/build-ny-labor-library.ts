/**
 * Pre-populate the global LaborOperation cache for NY-market vehicles.
 *
 * Uses the same write-path as live estimate search (`lookupLaborSuggestion`) so
 * cached rows match organically-grown ones. Idempotent: skips existing rows unless
 * FORCE=1.
 *
 * Matrix (see `src/lib/labor-seed-matrix.ts`):
 *   • 19 top US / Northeast ICE/hybrid brands (Toyota, Ford, Chevy, Honda, … Volvo)
 *   • EV-only brands excluded — mechanical labor guide focus
 *   • 2–4 representative models per brand (~52 model lines)
 *   • 30-year lookback collapsed into 5-year buckets (7 representative years)
 *   • ~50 tiered shop jobs — suspension first, fluids/inspections last
 *     (oil/filter + engine air filter via Canned Jobs)
 *
 * Job tiers (batch processes tier 1 first):
 *   1 Suspension — struts, shocks, control arms, ball joints, sway bar links,
 *     wheel bearings, CV axles, tie rods, alignment
 *   2 Brakes & Steering — pads/rotors, calipers, lines, rack, PS pump
 *   3 Drivetrain & Engine — starter, alternator, belts, mounts, clutch
 *   4 Other Mechanical — A/C, radiator, exhaust, ignition
 *   5 Defer — cabin filter, fluid flushes, tires, inspections (excluded by default)
 *
 * Profiles:
 *   mechanical (default) — tiers 1–4 (39 jobs)
 *   full — all tiers including defer (50 jobs)
 *   focused — 18 jobs: all tier-1 suspension + starter, alternator, spark plugs
 *     (excludes brakes, fluids, tires, inspection, A/C, etc.)
 *
 * Full matrix ≈ 52 × 7 × 50 ≈ 18,200 rows (mechanical profile ≈ 39 jobs).
 * At ~$0.004–0.008 per Sonnet call
 * (claude-sonnet-4-6, ~500 in / ~300 out tokens) that's roughly $55–105 for a
 * complete cold fill. Re-runs skip existing rows ($0). Use LIMIT to batch.
 *
 * Year bucketing tradeoff: labor times differ year-to-year, but 5-year buckets
 * give ~80% coverage at ~17% of the cost vs. every model year. Shops still get
 * AI estimates on cache miss for exact years.
 *
 * NOT licensed MOTOR/Mitchell flat-rate data — AI estimates for service writers.
 *
 * Run:
 *   npm run db:build-labor-ny                         # mechanical profile, LIMIT=100
 *   BATCH_PROFILE=mechanical LIMIT=500 npm run db:build-labor-ny  # suspension-first batch
 *   BATCH_PROFILE=full npm run db:build-labor-ny      # include fluids, tires, inspections
 *   BATCH_PROFILE=focused LIMIT=2000 CONC=4 npm run db:build-labor-ny  # suspension + electrical
 *   DRY_RUN=1 npm run db:build-labor-ny               # print plan, no API calls
 *   LIMIT=500 CONC=4 npm run db:build-labor-ny        # batch 500 new rows
 *   YEAR_FROM=1996 YEAR_TO=2026 npm run db:build-labor-ny
 *   BUCKET_SIZE=5 npm run db:build-labor-ny           # 5-year buckets (default)
 *   FORCE=1 LIMIT=10 npm run db:build-labor-ny        # regenerate 10 existing rows
 *
 * Requires: DATABASE_URL, ANTHROPIC_API_KEY (unless DRY_RUN=1)
 * Model: LABOR_GUIDE_MODEL (default claude-sonnet-4-6)
 */
import { prisma } from "../src/db/client";
import {
  expandNyVehicleMatrix,
  getJobsForBatchProfile,
  nyMatrixStats,
  tierLogPrefix,
  type BatchProfile,
  YEAR_BUCKET_SIZE,
} from "../src/lib/labor-seed-matrix";
import {
  lookupLaborSuggestion,
  laborQueryKey,
} from "../src/server/labor-guide-cache";
import { primaryVehicleKey, vehicleKeysForLookup } from "../src/lib/labor-vehicle-key";
import type { Vehicle } from "../src/server/services/labor-guide";

// ── Env / args ──────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();
const YEAR_FROM = Number(process.env.YEAR_FROM) || currentYear - 30;
const YEAR_TO = Number(process.env.YEAR_TO) || currentYear;
const BUCKET_SIZE = Number(process.env.BUCKET_SIZE) || YEAR_BUCKET_SIZE;
const LIMIT = Number(process.env.LIMIT) || 100;
const CONC = Math.max(1, Number(process.env.CONC) || 3);
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const FORCE = process.env.FORCE === "1" || process.env.FORCE === "true";
const BATCH_PROFILE: BatchProfile =
  process.env.BATCH_PROFILE === "full"
    ? "full"
    : process.env.BATCH_PROFILE === "focused"
      ? "focused"
      : "mechanical";

// ── Helpers ──────────────────────────────────────────────────────────────────

type Pair = {
  vehicle: Vehicle;
  job: string;
  vehicleKey: string;
  queryKey: string;
  tierLabel: string;
};

function vehicleLabel(v: Vehicle): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "(unspecified)";
}

async function runPool<T>(items: T[], conc: number, fn: (item: T, i: number) => Promise<void>) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(conc, items.length) }, worker));
}

async function warmup(tries = 6) {
  for (let i = 1; i <= tries; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (e) {
      if (i === tries) throw e;
      console.log(`  (db waking, retry ${i}/${tries - 1}…)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    /* .env optional */
  }

  await warmup();

  const matrixOpts = { yearFrom: YEAR_FROM, yearTo: YEAR_TO, bucketSize: BUCKET_SIZE };
  const vehicles = expandNyVehicleMatrix(matrixOpts);
  const stats = nyMatrixStats({ yearFrom: YEAR_FROM, yearTo: YEAR_TO });

  if (!vehicles.length) {
    console.error("No vehicles in NY matrix. Check YEAR_FROM / YEAR_TO.");
    process.exit(1);
  }

  const profileJobs = getJobsForBatchProfile(BATCH_PROFILE);
  const seen = new Set<string>();
  const all: Pair[] = [];
  for (const { tier, job } of profileJobs) {
    const queryKey = laborQueryKey(job);
    const tierLabel = tierLogPrefix(tier);
    for (const vehicle of vehicles) {
      const vehicleKey = primaryVehicleKey(vehicle);
      const dedup = `${vehicleKey} ${queryKey}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      all.push({ vehicle, job, vehicleKey, queryKey, tierLabel });
    }
  }

  let todo = all;
  if (!FORCE) {
    const allKeys = [...new Set(all.flatMap((p) => vehicleKeysForLookup(p.vehicle)))];
    const existing = await prisma.laborOperation.findMany({
      where: { vehicleKey: { in: allKeys } },
      select: { vehicleKey: true, queryKey: true },
    });
    const have = new Set(existing.map((e) => `${e.vehicleKey} ${e.queryKey}`));
    todo = all.filter((p) => {
      const keys = vehicleKeysForLookup(p.vehicle);
      return !keys.some((k) => have.has(`${k} ${p.queryKey}`));
    });
  }

  const planned = todo.slice(0, LIMIT);
  const startCount = await prisma.laborOperation.count();
  const estCostLow = (planned.length * 0.004).toFixed(2);
  const estCostHigh = (planned.length * 0.008).toFixed(2);

  console.log(
    `NY labor library build\n` +
      `  profile:      ${BATCH_PROFILE} (${profileJobs.length} jobs, tier-ordered)\n` +
      `  brands:       ${stats.brands}\n` +
      `  models:       ${stats.models}\n` +
      `  year range:   ${YEAR_FROM}–${YEAR_TO} (${stats.yearBuckets} × ${BUCKET_SIZE}-yr buckets)\n` +
      `  jobs (all):   ${stats.jobs}\n` +
      `  vehicles:     ${vehicles.length}\n` +
      `  matrix:       ${all.length} pairs (${BATCH_PROFILE})\n` +
      `  already in:   ${all.length - todo.length}\n` +
      `  to build:     ${todo.length}  →  this run: ${planned.length} (LIMIT=${LIMIT})\n` +
      `  est. cost:    $${estCostLow}–$${estCostHigh} for this run (Sonnet)\n` +
      `  model:        ${process.env.LABOR_GUIDE_MODEL || "claude-sonnet-4-6"}  conc=${CONC}  ${DRY_RUN ? "[DRY RUN]" : ""}\n` +
      `  rows now:     ${startCount}`,
  );

  if (DRY_RUN) {
    for (const p of planned) {
      console.log(`  ${p.tierLabel} ${vehicleLabel(p.vehicle)} · ${p.job}`);
    }
    if (planned.length < todo.length) {
      console.log(`  … and ${todo.length - planned.length} more (raise LIMIT)`);
    }
    await prisma.$disconnect();
    return;
  }

  if (!planned.length) {
    console.log("Nothing to build. NY matrix already covered.");
    await prisma.$disconnect();
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is required (or use DRY_RUN=1).");
    process.exit(1);
  }

  let done = 0;
  let created = 0;
  let failed = 0;
  await runPool(planned, CONC, async (p) => {
    try {
      const { cached } = await lookupLaborSuggestion(p.vehicle, p.job);
      if (!cached) created++;
      done++;
      console.log(
        `  [${done}/${planned.length}] ${cached ? "have" : "new "}  ${p.tierLabel} ${vehicleLabel(p.vehicle)} · ${p.job}`,
      );
    } catch (e) {
      failed++;
      done++;
      console.warn(
        `  [${done}/${planned.length}] FAIL  ${p.tierLabel} ${vehicleLabel(p.vehicle)} · ${p.job}: ${e instanceof Error ? e.message : e}`,
      );
    }
  });

  const endCount = await prisma.laborOperation.count();
  console.log(
    `\nDone. generated=${created} failed=${failed}  ` +
      `rows ${startCount} → ${endCount} (+${endCount - startCount}).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
