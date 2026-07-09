/**
 * Unit checks for labor-browse-hierarchy step gating.
 * Run: npx tsx scripts/test-labor-browse-hierarchy.ts
 */
import {
  ASSEMBLY_ONLY_SUBCATEGORIES,
  browseStepOrder,
  isBrowsePathComplete,
  nextBrowseStep,
  shouldLoadBrowseResults,
  shouldLoadOnSubcategorySelect,
  shouldShowOperationColumn,
  shouldShowPositionColumn,
} from "../src/lib/labor-browse-hierarchy";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// ── Brakes: position → operation (axle-first) ───────────────────────────────
{
  const steps = browseStepOrder("brakes-pads");
  assert(steps.join(",") === "position,operation", `brakes-pads steps: ${steps.join(",")}`);
  assert(!isBrowsePathComplete("brakes-pads", null, null), "incomplete without picks");
  assert(!isBrowsePathComplete("brakes-pads", "front", null), "incomplete without operation");
  assert(
    isBrowsePathComplete("brakes-pads", "front", "pads-rr"),
    "complete with front + replace pads",
  );
  assert(!shouldLoadBrowseResults("brakes-pads", null, null), "no load before position");
  assert(!shouldLoadBrowseResults("brakes-pads", "front", null), "no load before operation");
  assert(
    shouldLoadBrowseResults("brakes-pads", "front", "pads-rr"),
    "load when path complete",
  );
}

// ── Brakes rotors: operation → position ─────────────────────────────────────
{
  const steps = browseStepOrder("brakes-rotors");
  assert(steps.join(",") === "operation,position", `brakes-rotors steps: ${steps.join(",")}`);
  assert(nextBrowseStep("brakes-rotors", null, null) === "operation", "start with operation");
  assert(nextBrowseStep("brakes-rotors", null, "rotor-rr") === "position", "then position");
  assert(
    nextBrowseStep("brakes-rotors", "front", "rotor-rr") === "jobs",
    "jobs when complete",
  );
}

// ── Assembly: rack & pinion skips facets ─────────────────────────────────────
{
  assert(ASSEMBLY_ONLY_SUBCATEGORIES.has("steering-rack"), "steering-rack is assembly");
  assert(browseStepOrder("steering-rack").length === 0, "no facet steps");
  assert(shouldLoadOnSubcategorySelect("steering-rack"), "load on component pick");
  assert(isBrowsePathComplete("steering-rack", null, null), "path complete immediately");
  assert(!shouldShowPositionColumn("steering-rack", null, null), "no position column");
  assert(!shouldShowOperationColumn("steering-rack", null, null), "no operation column");
}

// ── Struts: operation → position ────────────────────────────────────────────
{
  assert(
    isBrowsePathComplete("suspension-struts", "front", "strut-rr"),
    "front strut path complete",
  );
  assert(
    shouldShowPositionColumn("suspension-struts", null, "strut-rr"),
    "position after operation",
  );
  assert(
    !shouldShowPositionColumn("suspension-struts", null, null),
    "no position before operation",
  );
}

// ── Parking brake: position only ──────────────────────────────────────────────
{
  const steps = browseStepOrder("brakes-parking");
  assert(steps.join(",") === "position", `brakes-parking steps: ${steps.join(",")}`);
  assert(isBrowsePathComplete("brakes-parking", "rear", null), "rear parking brake complete");
  assert(shouldLoadBrowseResults("brakes-parking", "rear", null), "load on position");
}

// ── Brake lines: vehicle-wide + operation (implicit position) ─────────────────
{
  assert(
    isBrowsePathComplete("brakes-lines", "all", "bleed"),
    "bleed path with implicit vehicle position",
  );
  assert(shouldLoadBrowseResults("brakes-lines", "all", "bleed"), "load bleed");
}

// ── HVAC: assembly-only components ──────────────────────────────────────────
{
  assert(ASSEMBLY_ONLY_SUBCATEGORIES.has("hvac-condenser"), "condenser is assembly");
  assert(ASSEMBLY_ONLY_SUBCATEGORIES.has("hvac-heater-core"), "heater core is assembly");
  assert(browseStepOrder("hvac-condenser").length === 0, "condenser skips facets");
  assert(shouldLoadOnSubcategorySelect("hvac-heater-core"), "heater core loads on pick");
  assert(isBrowsePathComplete("hvac-evaporator", null, null), "evaporator path complete");
}

// ── HVAC: refrigerant operation-first (vehicle-wide) ───────────────────────────
{
  const steps = browseStepOrder("hvac-refrigerant");
  assert(steps.join(",") === "operation", `refrigerant steps: ${steps.join(",")}`);
  assert(
    isBrowsePathComplete("hvac-refrigerant", "all", "recharge"),
    "a/c recharge path complete",
  );
  assert(
    shouldLoadBrowseResults("hvac-refrigerant", "all", "recharge"),
    "load recharge on operation",
  );
  assert(
    !shouldShowPositionColumn("hvac-refrigerant", null, "recharge"),
    "refrigerant has no position column",
  );
}

// ── HVAC: compressor operation-first ──────────────────────────────────────────
{
  const steps = browseStepOrder("hvac-compressor");
  assert(steps.join(",") === "operation", `compressor steps: ${steps.join(",")}`);
  assert(
    isBrowsePathComplete("hvac-compressor", "all", "compressor-rr"),
    "compressor R&R path complete",
  );
  assert(
    shouldLoadBrowseResults("hvac-compressor", "all", "compressor-rr"),
    "load compressor on operation",
  );
}

console.log("All labor-browse-hierarchy checks passed.");
