/**
 * Manual unit checks for labor-guide-variants (no vitest in project).
 * Run: npx tsx scripts/test-labor-variants.ts
 */
import {
  expandOperationVariants,
  variantToCartLine,
  __laborVariantTestFixtures,
} from "../src/lib/labor-guide-variants";
import type { LaborGuideHit } from "../src/lib/labor-guide-types";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function approx(a: number, b: number, tol = 0.05): boolean {
  return Math.abs(a - b) <= tol;
}

const { frontPadsRotors2h, storedSplitOps } = __laborVariantTestFixtures();

// ── Combined pads + rotors: 2h → pads 1.2h, rotors 0.8h, both 2.0h ─────────
{
  const variants = expandOperationVariants(frontPadsRotors2h);
  assert(variants.length === 3, `front combined: expected 3 variants, got ${variants.length}`);

  const pads = variants.find((v) => v.scope === "Pads only");
  const rotors = variants.find((v) => v.scope === "Rotors only");
  const both = variants.find((v) => v.scope === "Pads & Rotors");

  assert(Boolean(pads), "missing Pads only");
  assert(Boolean(rotors), "missing Rotors only");
  assert(Boolean(both), "missing Pads & Rotors");
  assert(approx(pads!.hours, 1.2), `pads hours ${pads!.hours} !== 1.2`);
  assert(approx(rotors!.hours, 0.8), `rotors hours ${rotors!.hours} !== 0.8`);
  assert(approx(both!.hours, 2), `both hours ${both!.hours} !== 2.0`);
  assert(pads!.position === "Front", "pads should be Front position");

  const cart = variantToCartLine(pads!, frontPadsRotors2h, "cached");
  assert(cart.description === "front brake pads", `cart desc: ${cart.description}`);
}

// ── Generic brake pads and rotors → Front + Rear component splits ───────────
{
  const hit: LaborGuideHit = {
    id: "test:generic",
    jobName: "Brake pads and rotors",
    queryText: "brake pads and rotors",
    totalHours: 2,
    laborOperations: [],
    source: "cached",
  };
  const variants = expandOperationVariants(hit);
  assert(variants.length === 6, `generic combined: expected 6 variants, got ${variants.length}`);
  const frontPads = variants.find((v) => v.label === "Front · Pads only");
  assert(Boolean(frontPads), "missing Front · Pads only");
  assert(approx(frontPads!.hours, 1.2), `front pads ${frontPads!.hours}`);
}

// ── Stored separate component ops preferred over re-split ───────────────────
{
  const variants = expandOperationVariants(storedSplitOps);
  assert(variants.length >= 3, `stored split: expected >=3 variants, got ${variants.length}`);
  const labels = variants.map((v) => v.label);
  assert(labels.some((l) => l.includes("Pads only")), `labels: ${labels.join(", ")}`);
  assert(labels.some((l) => l.includes("Rotors only")), `labels: ${labels.join(", ")}`);
}

// ── Skip battery + terminals ────────────────────────────────────────────────
{
  const hit: LaborGuideHit = {
    id: "test:battery",
    jobName: "Battery and terminals",
    totalHours: 0.5,
    laborOperations: [],
    source: "cached",
  };
  const variants = expandOperationVariants(hit);
  assert(variants.length === 1, "battery+terminals should not split");
}

// ── Timing belt + water pump ratios ───────────────────────────────────────────
{
  const hit: LaborGuideHit = {
    id: "test:timing",
    jobName: "Timing belt and water pump",
    totalHours: 5,
    laborOperations: [],
    source: "cached",
  };
  const variants = expandOperationVariants(hit);
  const belt = variants.find((v) => v.scope === "Belt only");
  const pump = variants.find((v) => v.scope === "Pump only");
  assert(Boolean(belt), "missing belt only");
  assert(approx(belt!.hours, 3), `belt hours ${belt!.hours} !== 3.0`);
  assert(approx(pump!.hours, 2), `pump hours ${pump!.hours} !== 2.0`);
}

// ── Rack & pinion: single assembly only (not One/Two/Four tire variants) ───
{
  const hit: LaborGuideHit = {
    id: "test:rack-pinion-bad-cache",
    jobName: "Rack & Pinion Replacement",
    queryText: "rack and pinion replacement",
    totalHours: 14,
    laborHoursPerUnit: 3.5,
    unitLabel: "wheel",
    unitsOnVehicle: 4,
    laborOperations: ["Rack & Pinion Replacement"],
    source: "cached",
    subcategoryId: "steering-rack",
  };
  const variants = expandOperationVariants(hit);
  assert(variants.length === 1, `rack & pinion: expected 1 variant, got ${variants.length}`);
  assert(approx(variants[0]!.hours, 3.5), `rack hours ${variants[0]!.hours} !== 3.5`);
  assert(!variants.some((v) => /pair|four/i.test(v.label)), `bad labels: ${variants.map((v) => v.label).join(", ")}`);
}

console.log("All labor-guide-variants checks passed.");
