/**
 * Representative vehicle + job matrix for pre-warming the global LaborOperation cache.
 *
 * NOT licensed flat-rate data — these are curated inputs for AI labor estimates.
 * NY brand list mirrors 2024–2025 US / Northeast sales (Toyota, Ford, Chevy, Honda lead).
 * EV-only brands excluded — mechanical labor guide focus. Each brand gets 2–4 popular
 * models; years are collapsed into 5-year buckets over a 30-year lookback to keep API
 * cost manageable.
 */

import type { Vehicle } from "@/server/services/labor-guide";

/** Five-year bucket width. 30 years → 6 representative model years instead of 30. */
export const YEAR_BUCKET_SIZE = 5;

/** Top ~19 ICE/hybrid brands by US / Northeast volume (2024–2025). EV-only marques excluded. */
export const NY_TOP_BRANDS: { make: string; models: { model: string; engine?: string }[] }[] = [
  { make: "Toyota", models: [{ model: "Camry", engine: "2.5L 4-cyl" }, { model: "RAV4", engine: "2.5L 4-cyl" }, { model: "Corolla", engine: "1.8L 4-cyl" }] },
  { make: "Ford", models: [{ model: "F-150", engine: "3.5L V6" }, { model: "Escape", engine: "1.5L 4-cyl" }, { model: "Explorer", engine: "2.3L 4-cyl" }] },
  { make: "Chevrolet", models: [{ model: "Silverado 1500", engine: "5.3L V8" }, { model: "Equinox", engine: "1.5L 4-cyl" }, { model: "Malibu", engine: "2.0L 4-cyl" }] },
  { make: "Honda", models: [{ model: "Civic", engine: "2.0L 4-cyl" }, { model: "CR-V", engine: "1.5L 4-cyl" }, { model: "Accord", engine: "1.5L 4-cyl" }] },
  { make: "Hyundai", models: [{ model: "Elantra", engine: "2.0L 4-cyl" }, { model: "Tucson", engine: "2.5L 4-cyl" }, { model: "Santa Fe", engine: "2.5L 4-cyl" }] },
  { make: "Nissan", models: [{ model: "Altima", engine: "2.5L 4-cyl" }, { model: "Rogue", engine: "2.5L 4-cyl" }, { model: "Sentra", engine: "2.0L 4-cyl" }] },
  { make: "Kia", models: [{ model: "Sportage", engine: "2.5L 4-cyl" }, { model: "Forte", engine: "2.0L 4-cyl" }, { model: "Sorento", engine: "2.5L 4-cyl" }] },
  { make: "GMC", models: [{ model: "Sierra 1500", engine: "5.3L V8" }, { model: "Terrain", engine: "1.5L 4-cyl" }] },
  { make: "Subaru", models: [{ model: "Outback", engine: "2.5L 4-cyl" }, { model: "Forester", engine: "2.5L 4-cyl" }, { model: "Crosstrek", engine: "2.0L 4-cyl" }] },
  { make: "Jeep", models: [{ model: "Grand Cherokee", engine: "3.6L V6" }, { model: "Wrangler", engine: "3.6L V6" }, { model: "Compass", engine: "2.4L 4-cyl" }] },
  { make: "Ram", models: [{ model: "1500", engine: "5.7L V8" }, { model: "2500", engine: "6.4L V8" }] },
  { make: "Mazda", models: [{ model: "CX-5", engine: "2.5L 4-cyl" }, { model: "Mazda3", engine: "2.5L 4-cyl" }, { model: "CX-30", engine: "2.5L 4-cyl" }] },
  { make: "BMW", models: [{ model: "3 Series", engine: "2.0L 4-cyl" }, { model: "X3", engine: "2.0L 4-cyl" }, { model: "X5", engine: "3.0L 6-cyl" }] },
  { make: "Lexus", models: [{ model: "RX", engine: "3.5L V6" }, { model: "ES", engine: "2.5L 4-cyl" }, { model: "NX", engine: "2.5L 4-cyl" }] },
  { make: "Volkswagen", models: [{ model: "Jetta", engine: "1.4L 4-cyl" }, { model: "Tiguan", engine: "2.0L 4-cyl" }, { model: "Atlas", engine: "3.6L V6" }] },
  { make: "Mercedes-Benz", models: [{ model: "C-Class", engine: "2.0L 4-cyl" }, { model: "GLC", engine: "2.0L 4-cyl" }, { model: "E-Class", engine: "2.0L 4-cyl" }] },
  { make: "Audi", models: [{ model: "A4", engine: "2.0L 4-cyl" }, { model: "Q5", engine: "2.0L 4-cyl" }] },
  { make: "Buick", models: [{ model: "Encore", engine: "1.4L 4-cyl" }, { model: "Enclave", engine: "3.6L V6" }] },
  { make: "Volvo", models: [{ model: "XC60", engine: "2.0L 4-cyl" }, { model: "XC90", engine: "2.0L 4-cyl" }] },
];

/**
 * Tiered shop jobs aligned with `labor-categories.ts` subcategories.
 *
 * Batch builds iterate tier 1 → 5 so `LIMIT` fills suspension + brakes before
 * fluid flushes. Oil change + engine air filter excluded — use Canned Jobs.
 *
 * `BATCH_PROFILE=mechanical` (default) skips tier 5; `full` includes everything;
 * `focused` = tier 1 suspension only + starter, alternator, spark plugs (18 jobs).
 */
export type LaborJobTier = {
  tier: number;
  /** Short id for logs / env */
  name: string;
  /** Human label, e.g. "Suspension" → `[Tier 1 Suspension]` */
  label: string;
  jobs: string[];
};

export const LABOR_JOB_TIERS: LaborJobTier[] = [
  {
    tier: 1,
    name: "suspension",
    label: "Suspension",
    jobs: [
      "front struts replacement",
      "rear shocks replacement",
      "front strut mount replacement",
      "front lower control arm replacement",
      "rear lower control arm replacement",
      "front ball joint replacement",
      "front sway bar links replacement",
      "rear sway bar links replacement",
      "front wheel bearing replacement",
      "rear wheel bearing replacement",
      "outer tie rod end replacement",
      "inner tie rod replacement",
      "front cv axle replacement",
      "rear cv axle replacement",
      "wheel alignment",
    ],
  },
  {
    tier: 2,
    name: "brakes-steering",
    label: "Brakes & Steering",
    jobs: [
      "front brake pads and rotors",
      "rear brake pads and rotors",
      "front brake caliper replacement",
      "brake line replacement",
      "rack and pinion replacement",
      "power steering pump replacement",
    ],
  },
  {
    tier: 3,
    name: "drivetrain-engine",
    label: "Drivetrain & Engine",
    jobs: [
      "starter replacement",
      "alternator replacement",
      "replace battery",
      "water pump replacement",
      "timing belt replacement",
      "serpentine belt replacement",
      "engine mount replacement",
      "thermostat replacement",
      "valve cover gasket replacement",
      "clutch replacement",
    ],
  },
  {
    tier: 4,
    name: "other-mechanical",
    label: "Other Mechanical",
    jobs: [
      "ac compressor replacement",
      "radiator replacement",
      "catalytic converter replacement",
      "oxygen sensor replacement",
      "exhaust muffler replacement",
      "ignition coil replacement",
      "spark plugs replacement",
      "blower motor replacement",
    ],
  },
  {
    tier: 5,
    name: "defer",
    label: "Defer",
    jobs: [
      "cabin air filter replacement",
      "transmission fluid service",
      "coolant flush",
      "brake fluid flush",
      "power steering fluid flush",
      "differential fluid service",
      "tire rotation",
      "tire mount and balance four tires",
      "a/c recharge",
      "state inspection",
      "multi-point inspection",
    ],
  },
];

/** Flat list in tier order (all tiers). */
export const COMMON_SHOP_JOBS: string[] = LABOR_JOB_TIERS.flatMap((t) => t.jobs);

export type BatchProfile = "mechanical" | "full" | "focused";

const DEFER_TIER = 5;

/** 18 jobs: all tier-1 suspension + starter, alternator, spark plugs. */
export const FOCUSED_BATCH_JOBS: readonly string[] = [
  ...LABOR_JOB_TIERS[0].jobs,
  "starter replacement",
  "alternator replacement",
  "spark plugs replacement",
];

const JOB_TIER_LOOKUP = new Map<string, LaborJobTier>(
  LABOR_JOB_TIERS.flatMap((tier) => tier.jobs.map((job) => [job, tier] as const)),
);

/** Jobs for a batch profile, preserving tier order. */
export function getJobsForBatchProfile(profile: BatchProfile = "mechanical"): {
  tier: LaborJobTier;
  job: string;
}[] {
  if (profile === "focused") {
    return FOCUSED_BATCH_JOBS.map((job) => ({
      tier: JOB_TIER_LOOKUP.get(job)!,
      job,
    }));
  }
  const tiers =
    profile === "full" ? LABOR_JOB_TIERS : LABOR_JOB_TIERS.filter((t) => t.tier < DEFER_TIER);
  return tiers.flatMap((tier) => tier.jobs.map((job) => ({ tier, job })));
}

/** Log prefix for a tier row, e.g. `[Tier 1 Suspension]`. */
export function tierLogPrefix(tier: LaborJobTier): string {
  return `[Tier ${tier.tier} ${tier.label}]`;
}

/** Representative model year at the midpoint of each 5-year bucket. */
export function yearBucketRepresentatives(from: number, to: number, bucketSize = YEAR_BUCKET_SIZE): number[] {
  const years: number[] = [];
  for (let start = from; start <= to; start += bucketSize) {
    const end = Math.min(start + bucketSize - 1, to);
    years.push(Math.round((start + end) / 2));
  }
  return years;
}

/** Expand brand × model × year-bucket matrix into Vehicle rows (deduped by year|make|model|engine). */
export function expandNyVehicleMatrix(options?: {
  yearFrom?: number;
  yearTo?: number;
  bucketSize?: number;
}): Vehicle[] {
  const yearTo = options?.yearTo ?? new Date().getFullYear();
  const yearFrom = options?.yearFrom ?? yearTo - 30;
  const bucketSize = options?.bucketSize ?? YEAR_BUCKET_SIZE;
  const years = yearBucketRepresentatives(yearFrom, yearTo, bucketSize);

  const seen = new Set<string>();
  const out: Vehicle[] = [];

  for (const brand of NY_TOP_BRANDS) {
    for (const { model, engine } of brand.models) {
      for (const year of years) {
        const v: Vehicle = {
          year,
          make: brand.make,
          model,
          trim: null,
          engine: engine ?? null,
          drivetrain: null,
        };
        const key = [year, brand.make, model, engine ?? ""].join("|").toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(v);
        }
      }
    }
  }
  return out;
}

/** Matrix stats for logging / cost estimates. */
export function nyMatrixStats(options?: { yearFrom?: number; yearTo?: number }): {
  brands: number;
  models: number;
  yearBuckets: number;
  jobs: number;
  totalPairs: number;
} {
  const vehicles = expandNyVehicleMatrix(options);
  const models = NY_TOP_BRANDS.reduce((n, b) => n + b.models.length, 0);
  const yearTo = options?.yearTo ?? new Date().getFullYear();
  const yearFrom = options?.yearFrom ?? yearTo - 30;
  const yearBuckets = yearBucketRepresentatives(yearFrom, yearTo).length;
  return {
    brands: NY_TOP_BRANDS.length,
    models,
    yearBuckets,
    jobs: COMMON_SHOP_JOBS.length,
    totalPairs: vehicles.length * COMMON_SHOP_JOBS.length,
  };
}
