/**
 * Canonical assembly rules for the internal labor guide.
 * NOT licensed flat-rate data — structural guardrails so AI/cache output
 * matches how shops bill common assembly jobs (one rack & pinion, not fragments).
 */

export type AssemblyRule = {
  id: string;
  subcategoryId?: string;
  /** Match repair request or job name (lowercase substring). */
  matchTerms: string[];
  canonicalName: string;
  expectedUnitLabel: string;
  expectedUnitsOnVehicle: number;
  /** Max distinct labor operation lines before consolidation. */
  maxLaborOperations: number;
  /** Baseline hours when AI is unavailable (midpoint used). */
  defaultHoursPerUnit: { min: number; max: number };
  /** Sub-job phrases that indicate incorrect fragmentation. */
  forbiddenFragments?: string[];
};

export const LABOR_ASSEMBLY_RULES: AssemblyRule[] = [
  {
    id: "steering-rack-pinion-rr",
    subcategoryId: "steering-rack",
    matchTerms: [
      "rack and pinion",
      "rack & pinion",
      "steering rack",
      "steering gear",
      "rack and pinion replacement",
      "rack pinion replacement",
    ],
    canonicalName: "Rack & Pinion R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 3.0, max: 6.5 },
    forbiddenFragments: ["pinion only", "rack only", "inner tie rod"],
  },
  {
    id: "power-steering-pump-rr",
    subcategoryId: "steering-pump",
    matchTerms: ["power steering pump", "ps pump", "steering pump"],
    canonicalName: "Power Steering Pump R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 1.2, max: 2.5 },
  },
  {
    id: "front-brake-pads-rotors",
    subcategoryId: "brakes-pads",
    matchTerms: ["front brake pads and rotors", "front pads and rotors", "front brake pads"],
    canonicalName: "Front Brake Pads & Rotors R&R",
    expectedUnitLabel: "axle end",
    expectedUnitsOnVehicle: 2,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 0.8, max: 1.4 },
  },
  {
    id: "rear-brake-pads-rotors",
    subcategoryId: "brakes-pads",
    matchTerms: ["rear brake pads and rotors", "rear pads and rotors", "rear brake pads"],
    canonicalName: "Rear Brake Pads & Rotors R&R",
    expectedUnitLabel: "axle end",
    expectedUnitsOnVehicle: 2,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 0.7, max: 1.3 },
  },
  {
    id: "front-struts-rr",
    subcategoryId: "suspension-struts",
    matchTerms: ["front struts", "front strut", "front shocks"],
    canonicalName: "Front Strut R&R",
    expectedUnitLabel: "strut",
    expectedUnitsOnVehicle: 2,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 0.6, max: 1.2 },
  },
  {
    id: "water-pump-rr",
    subcategoryId: "cooling-pump",
    matchTerms: ["water pump", "water pump replacement"],
    canonicalName: "Water Pump R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 2.0, max: 4.5 },
  },
  {
    id: "ac-compressor-rr",
    subcategoryId: "hvac-compressor",
    matchTerms: ["ac compressor", "a/c compressor", "air conditioning compressor", "compressor replacement"],
    canonicalName: "A/C Compressor R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 2.5, max: 5.0 },
    forbiddenFragments: ["clutch only", "pulley only"],
  },
  {
    id: "ac-condenser-rr",
    subcategoryId: "hvac-condenser",
    matchTerms: ["ac condenser", "a/c condenser", "condenser replacement"],
    canonicalName: "A/C Condenser R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 1.5, max: 3.5 },
  },
  {
    id: "ac-evaporator-rr",
    subcategoryId: "hvac-evaporator",
    matchTerms: ["evaporator", "evap core", "evap coil", "evaporator replacement"],
    canonicalName: "A/C Evaporator R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 4.0, max: 10.0 },
  },
  {
    id: "heater-core-rr",
    subcategoryId: "hvac-heater-core",
    matchTerms: ["heater core", "heater core replacement"],
    canonicalName: "Heater Core R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 4.0, max: 9.0 },
  },
  {
    id: "blower-motor-rr",
    subcategoryId: "hvac-blower-controls",
    matchTerms: ["blower motor", "blower fan", "blower motor replacement"],
    canonicalName: "Blower Motor R&R",
    expectedUnitLabel: "assembly",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 2,
    defaultHoursPerUnit: { min: 0.8, max: 2.5 },
  },
  {
    id: "timing-belt-pump",
    subcategoryId: "engine-timing",
    matchTerms: ["timing belt", "timing belt and water pump", "timing belt replacement"],
    canonicalName: "Timing Belt R&R",
    expectedUnitLabel: "vehicle",
    expectedUnitsOnVehicle: 1,
    maxLaborOperations: 3,
    defaultHoursPerUnit: { min: 3.5, max: 8.0 },
  },
];

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function shouldSkipAssemblyNormalize(text: string): boolean {
  const t = normalizeText(text);
  if (t.includes("timing belt") && t.includes("water pump")) return true;
  if (t.includes("brake") && t.includes("pad") && t.includes("rotor")) return true;
  if (t.includes("belt") && t.includes("tensioner") && !t.includes("timing belt")) return true;
  if (t.includes("starter") && t.includes("alternator")) return true;
  if (t.includes("bearing") && t.includes("hub")) return true;
  if (t.includes("compressor") && t.includes("condenser")) return true;
  if (t.includes("evaporator") && t.includes("heater core")) return true;
  if (t.includes("compressor") && t.includes("evaporator")) return true;
  return false;
}

/** Best matching assembly rule for a repair request or job name. */
export function matchAssemblyRule(
  request: string,
  jobName?: string,
  subcategoryId?: string,
): AssemblyRule | null {
  const haystack = normalizeText([request, jobName ?? ""].join(" "));
  if (!haystack || shouldSkipAssemblyNormalize(haystack)) return null;

  let best: { rule: AssemblyRule; score: number } | null = null;

  for (const rule of LABOR_ASSEMBLY_RULES) {
    if (subcategoryId && rule.subcategoryId && rule.subcategoryId !== subcategoryId) continue;

    for (const term of rule.matchTerms) {
      const needle = normalizeText(term);
      if (!needle || !haystack.includes(needle)) continue;
      // Belt + pump together uses component split, not single-assembly mode.
      if (
        rule.id === "timing-belt-pump" &&
        haystack.includes("water pump") &&
        haystack.includes("timing belt")
      ) {
        continue;
      }
      const score = needle.length + (subcategoryId === rule.subcategoryId ? 50 : 0);
      if (!best || score > best.score) best = { rule, score };
    }
  }

  return best?.rule ?? null;
}

/** Midpoint default hours for fallback template. */
export function assemblyDefaultHours(rule: AssemblyRule): number {
  const { min, max } = rule.defaultHoursPerUnit;
  return Math.round(((min + max) / 2) * 100) / 100;
}

/** Whole-vehicle assembly jobs — never offer 1/2/4 quantity variants. */
export function isSingleAssemblyJob(
  text: string,
  jobName?: string,
  subcategoryId?: string,
): boolean {
  const rule = matchAssemblyRule(text, jobName, subcategoryId);
  if (!rule) return false;
  return (
    rule.expectedUnitsOnVehicle === 1 &&
    (rule.expectedUnitLabel === "assembly" || rule.expectedUnitLabel === "vehicle")
  );
}

function hitSearchText(parts: {
  jobName: string;
  queryText?: string;
  unitLabel?: string;
  laborOperations?: string[];
}): string {
  return [parts.jobName, parts.queryText ?? "", parts.unitLabel ?? "", ...(parts.laborOperations ?? [])]
    .join(" ")
    .toLowerCase();
}

/**
 * Fix cache/AI rows that wrongly used wheel/strut unit counts on single assemblies
 * (e.g. rack & pinion stored as 4× wheel → One/Two/Four variants).
 */
export function normalizeAssemblyHit<
  T extends {
    jobName: string;
    queryText?: string;
    unitLabel?: string;
    unitsOnVehicle?: number;
    laborHoursPerUnit?: number;
    totalHours: number;
    laborOperations: string[];
    subcategoryId?: string;
  },
>(hit: T): T {
  const text = hitSearchText(hit);
  if (shouldSkipAssemblyNormalize(text)) return hit;
  const rule = matchAssemblyRule(text, hit.jobName, hit.subcategoryId);
  if (!rule || rule.expectedUnitsOnVehicle !== 1) return hit;

  let hoursPerUnit = hit.laborHoursPerUnit ?? hit.totalHours;
  if (
    hit.laborHoursPerUnit != null &&
    hit.laborHoursPerUnit > 0 &&
    hit.unitsOnVehicle != null &&
    hit.unitsOnVehicle > 1
  ) {
    hoursPerUnit = hit.laborHoursPerUnit;
  } else if (hit.unitsOnVehicle != null && hit.unitsOnVehicle > 1) {
    hoursPerUnit = hit.totalHours / hit.unitsOnVehicle;
  }

  const ops =
    hit.laborOperations.length > rule.maxLaborOperations
      ? [rule.canonicalName]
      : hit.laborOperations.length
        ? hit.laborOperations
        : [rule.canonicalName];

  return {
    ...hit,
    jobName: rule.canonicalName,
    unitLabel: rule.expectedUnitLabel,
    unitsOnVehicle: 1,
    laborHoursPerUnit: hoursPerUnit,
    totalHours: hoursPerUnit,
    laborOperations: ops,
  };
}
