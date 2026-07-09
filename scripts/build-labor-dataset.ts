/**
 * Build / populate the global Labor Guide dataset (LaborOperation).
 *
 * The labor guide is a self-populating cache: it only grows one row per UNIQUE
 * real search, so a fresh install has an empty catalog and every estimate search
 * pays a full AI call. This script pre-builds the catalog by running a curated
 * matrix of (vehicle × common job) through the SAME write-path the live feature
 * uses (`lookupLaborSuggestion`) — so the rows it creates are byte-for-byte the
 * same shape as organically-grown ones. Idempotent: existing rows are skipped
 * (unless FORCE=1), so re-runs only fill gaps and cost nothing for what's there.
 *
 * The vehicle list defaults to the shop's REAL fleet (so the dataset is tuned to
 * the cars this shop actually services) merged with a curated top-sellers list.
 *
 * Run:
 *   npm run db:build-labor                       # default: shop_demo fleet + curated, cap 60
 *   LIMIT=10 npm run db:build-labor              # only generate 10 new rows
 *   DRY_RUN=1 npm run db:build-labor             # list what it WOULD generate, no AI calls
 *   SOURCE=curated npm run db:build-labor        # ignore the fleet, use the built-in vehicle list
 *   SHOP=shop_eastside npm run db:build-labor    # pull the fleet from another shop
 *   CONC=4 npm run db:build-labor                # concurrency (default 3)
 *   FORCE=1 npm run db:build-labor               # regenerate even rows that already exist
 *
 * Model: the row's labor times come from LABOR_GUIDE_MODEL (default claude-sonnet-4-6).
 * Override it for a cheaper bulk fill, e.g. LABOR_GUIDE_MODEL=claude-sonnet-4-6.
 */
import { prisma } from "../src/db/client";
import { lookupLaborSuggestion, laborQueryKey } from "../src/server/labor-guide-cache";
import { primaryVehicleKey, vehicleKeysForLookup } from "../src/lib/labor-vehicle-key";
import type { Vehicle } from "../src/server/services/labor-guide";

// ── Curated inputs ──────────────────────────────────────────────────────────

/** Common, high-frequency repair/maintenance jobs, phrased like a writer types.
 *  Order matters: most-common first, so a capped run covers the staples.
 *  Oil/filter and engine air filter excluded — use Canned Jobs. */
const JOBS: string[] = [
  "front brake pads and rotors",
  "rear brake pads and rotors",
  "brake fluid flush",
  "replace battery",
  "alternator replacement",
  "starter replacement",
  "serpentine belt replacement",
  "spark plugs replacement",
  "water pump replacement",
  "thermostat replacement",
  "coolant flush",
  "front struts replacement",
  "rear shocks replacement",
  "front lower control arm replacement",
  "front wheel bearing replacement",
  "outer tie rod end replacement",
  "front sway bar links replacement",
  "front cv axle replacement",
  "valve cover gasket replacement",
  "transmission fluid service",
  "cabin air filter replacement",
  "radiator replacement",
  "ignition coil replacement",
  "oxygen sensor replacement",
  "wheel alignment",
  "power steering fluid flush",
];

/** Top US-market sellers, used to broaden coverage beyond the shop fleet.
 *  EV-only brands excluded — mechanical labor guide focus. */
const CURATED_VEHICLES: Vehicle[] = [
  { year: 2018, make: "Ford", model: "F-150", trim: null, engine: "5.0L V8", drivetrain: null },
  { year: 2019, make: "Honda", model: "Civic", trim: null, engine: "2.0L 4-cyl", drivetrain: null },
  { year: 2020, make: "Toyota", model: "RAV4", trim: null, engine: "2.5L 4-cyl", drivetrain: null },
  { year: 2017, make: "Chevrolet", model: "Silverado 1500", trim: null, engine: "5.3L V8", drivetrain: null },
  { year: 2019, make: "Toyota", model: "Corolla", trim: null, engine: "1.8L 4-cyl", drivetrain: null },
  { year: 2018, make: "Nissan", model: "Altima", trim: null, engine: "2.5L 4-cyl", drivetrain: null },
  { year: 2016, make: "Honda", model: "Accord", trim: null, engine: "2.4L 4-cyl", drivetrain: null },
  { year: 2019, make: "Jeep", model: "Grand Cherokee", trim: null, engine: "3.6L V6", drivetrain: null },
];

// ── Env / args ──────────────────────────────────────────────────────────────

const SHOP = process.env.SHOP || "shop_demo";
const SOURCE = (process.env.SOURCE || "both").toLowerCase(); // fleet | curated | both
const LIMIT = Number(process.env.LIMIT) || 60;
const CONC = Math.max(1, Number(process.env.CONC) || 3);
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const FORCE = process.env.FORCE === "1" || process.env.FORCE === "true";

// ── Helpers ──────────────────────────────────────────────────────────────────

type Pair = { vehicle: Vehicle; job: string; vehicleKey: string; queryKey: string };

function vehicleLabel(v: Vehicle): string {
  return [v.year, v.make, v.model].filter(Boolean).join(" ") || "(unspecified)";
}

/** Distinct vehicles from the shop's real fleet (deduped by labor cache key). */
async function fleetVehicles(): Promise<Vehicle[]> {
  const rows = await prisma.vehicle.findMany({
    where: { shopId: SHOP, make: { not: null }, model: { not: null } },
    select: { vin: true, year: true, make: true, model: true, engine: true },
  });
  return rows.map((r) => ({
    vin: r.vin,
    year: r.year,
    make: r.make,
    model: r.model,
    trim: null,
    engine: r.engine,
    drivetrain: null,
  }));
}

/** Resolve the vehicle list per SOURCE, deduped by primaryVehicleKey. */
async function resolveVehicles(): Promise<Vehicle[]> {
  const candidates: Vehicle[] = [];
  if (SOURCE === "fleet" || SOURCE === "both") candidates.push(...(await fleetVehicles()));
  if (SOURCE === "curated" || SOURCE === "both") candidates.push(...CURATED_VEHICLES);

  const seen = new Set<string>();
  const out: Vehicle[] = [];
  for (const v of candidates) {
    const k = primaryVehicleKey(v);
    if (k && k.replace(/\|/g, "").trim() && !seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  }
  return out;
}

/** Run an async fn over items with a fixed concurrency. */
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

/** Neon auto-suspends; the first query after idle fails until it cold-starts.
 *  Retry a trivial query a few times before doing real work. */
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
  // Load .env (DATABASE_URL, ANTHROPIC_API_KEY) when not already in the environment.
  try {
    (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.();
  } catch {
    /* .env optional — vars may already be present in the shell environment */
  }

  await warmup();
  const vehicles = await resolveVehicles();
  if (!vehicles.length) {
    console.error(`No vehicles found (SOURCE=${SOURCE}, SHOP=${SHOP}). Aborting.`);
    process.exit(1);
  }

  // Build the candidate matrix, deduped by (vehicleKey, queryKey). JOB-MAJOR
  // ordering (each job across all vehicles before the next job) so a capped run
  // spreads coverage over the whole fleet for the most-common jobs first.
  const seen = new Set<string>();
  const all: Pair[] = [];
  for (const job of JOBS) {
    const queryKey = laborQueryKey(job);
    for (const vehicle of vehicles) {
      const vehicleKey = primaryVehicleKey(vehicle);
      const dedup = `${vehicleKey} ${queryKey}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);
      all.push({ vehicle, job, vehicleKey, queryKey });
    }
  }

  // Skip pairs already in the table (unless FORCE) so re-runs only fill gaps.
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

  console.log(
    `Labor dataset build\n` +
      `  vehicles:   ${vehicles.length} (source=${SOURCE}, shop=${SHOP})\n` +
      `  jobs:       ${JOBS.length}\n` +
      `  matrix:     ${all.length} pairs\n` +
      `  already in: ${all.length - todo.length}\n` +
      `  to build:   ${todo.length}  →  this run: ${planned.length} (LIMIT=${LIMIT})\n` +
      `  model:      ${process.env.LABOR_GUIDE_MODEL || "claude-opus-4-8"}  conc=${CONC}  ${DRY_RUN ? "[DRY RUN]" : ""}\n` +
      `  rows now:   ${startCount}`,
  );

  if (DRY_RUN) {
    for (const p of planned) console.log(`  would build: ${vehicleLabel(p.vehicle)}  —  ${p.job}`);
    await prisma.$disconnect();
    return;
  }
  if (!planned.length) {
    console.log("Nothing to build. Dataset already covers the matrix.");
    await prisma.$disconnect();
    return;
  }

  let done = 0;
  let created = 0;
  let failed = 0;
  await runPool(planned, CONC, async (p) => {
    try {
      const { cached } = await lookupLaborSuggestion(p.vehicle, p.job);
      if (!cached) created++;
      done++;
      console.log(`  [${done}/${planned.length}] ${cached ? "have" : "new "}  ${vehicleLabel(p.vehicle)} — ${p.job}`);
    } catch (e) {
      failed++;
      done++;
      console.warn(`  [${done}/${planned.length}] FAIL  ${vehicleLabel(p.vehicle)} — ${p.job}: ${e instanceof Error ? e.message : e}`);
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
