import type { LaborCartLine, LaborGuideHit, LaborVariant } from "@/lib/labor-guide-types";
import { compactOperationName, shortLaborLineDescription } from "@/lib/labor-guide-helpers";
import { isSingleAssemblyJob, matchAssemblyRule, normalizeAssemblyHit } from "@/lib/labor-guide-assembly-rules";

/** Round to 2 decimal places for display/storage. */
function roundHours(h: number): number {
  return Math.round(h * 100) / 100;
}

/** Round component-split hours to nearest 0.1h (industry estimate granularity). */
function roundToTenth(h: number): number {
  return Math.round(h * 10) / 10;
}

function searchText(hit: LaborGuideHit): string {
  return [hit.jobName, hit.queryText ?? "", ...hit.laborOperations, hit.unitLabel ?? ""]
    .join(" ")
    .toLowerCase();
}

function matchesAny(text: string, patterns: string[]): boolean {
  return patterns.some((p) => text.includes(p));
}

type VariantPattern = "assembly" | "strut" | "brake" | "tire" | "generic";

function detectPattern(hit: LaborGuideHit): VariantPattern {
  const text = searchText(hit);
  if (isSingleAssemblyJob(text, hit.jobName, hit.subcategoryId)) return "assembly";
  if (matchAssemblyRule(text, hit.jobName, hit.subcategoryId)?.expectedUnitsOnVehicle === 1) {
    return "assembly";
  }
  if (matchesAny(text, ["strut", "shock absorber"]) || /\bshock\b/.test(text)) return "strut";
  if (matchesAny(text, ["brake pad", "brake rotor", " brake rotor", "caliper", "brake service", "brake job"])) {
    return "brake";
  }
  if (matchesAny(text, ["brake"]) && matchesAny(text, ["pad", "rotor", "caliper"])) return "brake";
  // Wheel bearing / hub = corner job (like brakes), not tire One/Pair/Four.
  if (
    matchesAny(text, ["wheel bearing", "hub bearing", "hub assembly"]) ||
    (/\bbearing\b/.test(text) && /\b(hub|wheel)\b/.test(text))
  ) {
    return "brake";
  }
  if (
    matchesAny(text, ["tire", "tire rotation"]) ||
    (/\bwheel\b/.test(text) &&
      !/\bbearing\b/.test(text) &&
      !/\bhub\b/.test(text) &&
      !isSingleAssemblyJob(text, hit.jobName, hit.subcategoryId))
  ) {
    return "tire";
  }
  return "generic";
}

/**
 * Base hours for one unit (one strut, one axle, one wheel, etc.).
 * When cache stores laborHoursPerUnit, use it directly.
 * Otherwise infer from totalHours / unitsOnVehicle.
 */
function baseHoursPerUnit(hit: LaborGuideHit): number {
  if (hit.laborHoursPerUnit != null && hit.laborHoursPerUnit > 0) {
    return hit.laborHoursPerUnit;
  }
  const units = hit.unitsOnVehicle ?? 1;
  const label = hit.unitLabel?.toLowerCase() ?? "vehicle";
  if (label !== "vehicle" && units > 1) {
    return hit.totalHours / units;
  }
  return hit.totalHours;
}

function positionMultiplier(position: string): number {
  if (position.includes("Front") && position.includes("Rear")) return 2;
  return 1;
}

function buildVariant(
  hit: LaborGuideHit,
  id: string,
  label: string,
  position: string | undefined,
  scope: string | undefined,
  multiplier: number,
): LaborVariant {
  const hours = roundHours(baseHoursPerUnit(hit) * multiplier);
  return {
    id: `${hit.id}:${id}`,
    label,
    position,
    scope,
    hours,
    quantityDefault: multiplier,
  };
}

function buildComponentVariant(
  hit: LaborGuideHit,
  id: string,
  label: string,
  position: string | undefined,
  scope: string,
  combinedHourRatio: number,
): LaborVariant {
  const posMult = position ? positionMultiplier(position) : 1;
  const hours = roundToTenth(baseHoursPerUnit(hit) * combinedHourRatio * posMult);
  return {
    id: `${hit.id}:${id}`,
    label,
    position,
    scope,
    hours,
    quantityDefault: posMult,
  };
}

/** Infer hour multiplier from a variant label (both sides ≈ 2× one side, etc.). */
function multiplierFromLabel(label: string): number {
  const l = label.toLowerCase();
  if (l.includes("all four") || l.includes("all (4") || (/\bfour\b/.test(l) && !l.includes("one"))) return 4;
  if (l.includes("both sides") || l.includes("front & rear") || l.includes("front and rear") || l.includes("pair")) {
    return 2;
  }
  if (l.includes("one side") || l.includes("single") || /\bone\b/.test(l)) return 1;
  if (l.includes("front & rear") || l.includes("front and rear")) return 2;
  if (/\brear\b/.test(l) && !/\bfront\b/.test(l)) return 1;
  if (/\bfront\b/.test(l) && !/\brear\b/.test(l) && !l.includes("both")) return 1;
  return 1;
}

function isVariantLikeOp(op: string): boolean {
  const l = op.toLowerCase();
  return (
    l.includes(" · ") ||
    /\b(front|rear|left|right)\b/.test(l) ||
    /\b(one side|both sides|front & rear|front and rear|pair|all four)\b/.test(l)
  );
}

/** Parse distinct variant rows already stored in laborOperations[]. */
function expandFromStoredOperations(hit: LaborGuideHit): LaborVariant[] | null {
  const ops = hit.laborOperations.filter(Boolean);
  if (ops.length < 2 || !ops.every(isVariantLikeOp)) return null;

  const text = searchText(hit);
  const combinedRule = detectCombinedRule(text);
  if (combinedRule) {
    const componentOps = combinedRule.components.filter(
      (c) => c.scopeId !== "both" && ops.some((op) => c.matchesOp(op)),
    );
    if (componentOps.length >= 2) return null;
  }

  return ops.map((op, i) => {
    const label = op.includes(" · ") ? op : op.trim();
    const mult = multiplierFromLabel(label);
    const [position, scope] = label.split(" · ").map((s) => s.trim());
    return buildVariant(
      hit,
      `op-${i}`,
      label,
      position || undefined,
      scope || undefined,
      mult,
    );
  });
}

// ── Combined-operation component splits ─────────────────────────────────────

/**
 * Industry labor ratios: component-only as fraction of combined R&R hours per axle.
 * Pads R&R dominates brake jobs (~wheel off, caliper, hardware); rotors add resurface/swap.
 *
 * Manual examples (run: npx tsx scripts/test-labor-variants.ts):
 *   "front brake pads and rotors" @ 2.0h → Front·Pads only 1.2h, Rotors only 0.8h, Pads & Rotors 2.0h
 *   "brake pads and rotors" @ 2.0h → Front + Rear × 3 component scopes each (6 rows)
 *   "timing belt and water pump" @ 5.0h → Belt only 3.0h, Pump only 2.0h, Both 5.0h
 *   cache ops ["Front brake pads R&R","Front brake rotors R&R"] → ratio hours, not 1h each
 *   "battery and terminals" → no split (single variant)
 */
const COMPONENT_RATIOS = {
  brake_pads: 0.6,
  brake_rotors: 0.4,
  timing_belt: 0.6,
  water_pump: 0.4,
  serpentine_belt: 0.55,
  tensioner: 0.45,
  starter: 0.5,
  alternator: 0.5,
  wheel_bearing: 0.55,
  hub_assembly: 0.45,
} as const;

type ComboComponent = {
  scopeId: string;
  scopeLabel: string;
  shortPart: string;
  ratio: number;
  matchesOp: (text: string) => boolean;
};

type CombinedComboRule = {
  id: string;
  matches: (text: string) => boolean;
  components: ComboComponent[];
};

const AND_SPLIT = /\s*(?:and|&|,)\s*/i;

function hasCombinedPair(text: string, a: RegExp, b: RegExp): boolean {
  const parts = text.split(AND_SPLIT).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const hasA = parts.some((p) => a.test(p));
    const hasB = parts.some((p) => b.test(p));
    if (hasA && hasB) return true;
  }
  return a.test(text) && b.test(text) && /\b(?:and|&|,)\b/.test(text);
}

/** Slash-joined hub/bearing names are ONE assembly job, not a pads+rotors-style combo. */
function isHubBearingAssemblyPhrase(text: string): boolean {
  const t = text.toLowerCase();
  if (/\bbearing\s*(?:\/|&|and)\s*hub\b/.test(t)) return true;
  if (/\bhub\s*(?:\/|&|and)\s*bearing\b/.test(t)) return true;
  if (/\bhub\s+bearing\b/.test(t) || /\bhub\/bearing\b/.test(t)) return true;
  if (/\bwheel\s+bearing\/hub\b/.test(t) || /\bwheel\s+bearing\s+hub\b/.test(t)) return true;
  // "Wheel Bearing R&R" alone — single corner job
  if (/\bwheel\s+bearing\b/.test(t) && !/\band\b/.test(t) && !/,/.test(t)) return true;
  return false;
}

const COMBO_RULES: CombinedComboRule[] = [
  {
    id: "pads_rotors",
    matches: (t) =>
      /\bbrake\b/.test(t) &&
      hasCombinedPair(t, /\bpads?\b/i, /\brotors?\b/i),
    components: [
      {
        scopeId: "pads",
        scopeLabel: "Pads only",
        shortPart: "pads",
        ratio: COMPONENT_RATIOS.brake_pads,
        matchesOp: (op) => /\bpad/i.test(op) && !/\brotor/i.test(op),
      },
      {
        scopeId: "rotors",
        scopeLabel: "Rotors only",
        shortPart: "rotors",
        ratio: COMPONENT_RATIOS.brake_rotors,
        matchesOp: (op) => /\brotor/i.test(op) && !/\bpad/i.test(op),
      },
      {
        scopeId: "both",
        scopeLabel: "Pads & Rotors",
        shortPart: "pads & rotors",
        ratio: 1,
        matchesOp: () => false,
      },
    ],
  },
  {
    id: "timing_belt_water_pump",
    matches: (t) => hasCombinedPair(t, /\btiming\s+belt\b/i, /\bwater\s+pump\b/i),
    components: [
      {
        scopeId: "belt",
        scopeLabel: "Belt only",
        shortPart: "timing belt",
        ratio: COMPONENT_RATIOS.timing_belt,
        matchesOp: (op) => /\btiming\s+belt\b/i.test(op) && !/\bpump\b/i.test(op),
      },
      {
        scopeId: "pump",
        scopeLabel: "Pump only",
        shortPart: "water pump",
        ratio: COMPONENT_RATIOS.water_pump,
        matchesOp: (op) => /\bwater\s+pump\b/i.test(op) && !/\btiming\s+belt\b/i.test(op),
      },
      {
        scopeId: "both",
        scopeLabel: "Belt & Pump",
        shortPart: "timing belt & water pump",
        ratio: 1,
        matchesOp: () => false,
      },
    ],
  },
  {
    id: "serpentine_belt_tensioner",
    matches: (t) =>
      hasCombinedPair(t, /\b(?:serpentine\s+)?belt\b/i, /\btensioner\b/i) &&
      !/\btiming\s+belt\b/i.test(t),
    components: [
      {
        scopeId: "belt",
        scopeLabel: "Belt only",
        shortPart: "serpentine belt",
        ratio: COMPONENT_RATIOS.serpentine_belt,
        matchesOp: (op) => /\bbelt\b/i.test(op) && !/\btensioner\b/i.test(op),
      },
      {
        scopeId: "tensioner",
        scopeLabel: "Tensioner only",
        shortPart: "tensioner",
        ratio: COMPONENT_RATIOS.tensioner,
        matchesOp: (op) => /\btensioner\b/i.test(op) && !/\bbelt\b/i.test(op),
      },
      {
        scopeId: "both",
        scopeLabel: "Belt & Tensioner",
        shortPart: "belt & tensioner",
        ratio: 1,
        matchesOp: () => false,
      },
    ],
  },
  {
    id: "starter_alternator",
    matches: (t) => hasCombinedPair(t, /\bstarter\b/i, /\balternator\b/i),
    components: [
      {
        scopeId: "starter",
        scopeLabel: "Starter only",
        shortPart: "starter",
        ratio: COMPONENT_RATIOS.starter,
        matchesOp: (op) => /\bstarter\b/i.test(op) && !/\balternator\b/i.test(op),
      },
      {
        scopeId: "alternator",
        scopeLabel: "Alternator only",
        shortPart: "alternator",
        ratio: COMPONENT_RATIOS.alternator,
        matchesOp: (op) => /\balternator\b/i.test(op) && !/\bstarter\b/i.test(op),
      },
      {
        scopeId: "both",
        scopeLabel: "Starter & Alternator",
        shortPart: "starter & alternator",
        ratio: 1,
        matchesOp: () => false,
      },
    ],
  },
  {
    id: "wheel_bearing_hub",
    // Only true "bearing AND hub" billable splits — not "bearing/hub assembly" OEM unit.
    matches: (t) => {
      if (isHubBearingAssemblyPhrase(t)) return false;
      return hasCombinedPair(t, /\b(?:wheel\s+)?bearing\b/i, /\bhub\b/i);
    },
    components: [
      {
        scopeId: "bearing",
        scopeLabel: "Bearing only",
        shortPart: "wheel bearing",
        ratio: COMPONENT_RATIOS.wheel_bearing,
        matchesOp: (op) => /\bbearing\b/i.test(op) && !/\bhub\b/i.test(op),
      },
      {
        scopeId: "hub",
        scopeLabel: "Hub assembly",
        shortPart: "hub assembly",
        ratio: COMPONENT_RATIOS.hub_assembly,
        matchesOp: (op) => /\bhub\b/i.test(op) && !/\bbearing\b/i.test(op),
      },
      {
        scopeId: "both",
        scopeLabel: "Bearing & Hub",
        shortPart: "bearing & hub",
        ratio: 1,
        matchesOp: () => false,
      },
    ],
  },
];

function shouldSkipCombinedSplit(text: string): boolean {
  if (isHubBearingAssemblyPhrase(text)) return true;
  if (/\bbattery\b.*\bterminal/i.test(text)) return true;
  if (/\bshocks?\s+(?:and|&)\s+struts?\b/i.test(text)) return true;
  if (/\bstrut\s+assembly\b/i.test(text) && !/\bshock\b/i.test(text)) return true;
  if (/\bcompressor\b.*\bcondenser\b/i.test(text)) return true;
  if (/\bevaporator\b.*\bheater\s+core\b/i.test(text)) return true;
  if (/\bcompressor\b.*\bevaporator\b/i.test(text)) return true;
  return false;
}

function detectCombinedRule(text: string): CombinedComboRule | null {
  const t = text.toLowerCase();
  if (shouldSkipCombinedSplit(t)) return null;
  return COMBO_RULES.find((rule) => rule.matches(t)) ?? null;
}

/**
 * Concurrent / component-only hours from a combined cache job (pads+rotors, etc.).
 * Used by Additional Labor — does not change variant expansion.
 * Applies COMBO_RULES ratios by rule id (same as pads_rotors split).
 */
export function companionHoursFromCombinedJob(
  combinedHours: number,
  comboRuleId: string,
  companionScopeId: string,
): number | null {
  const rule = COMBO_RULES.find((r) => r.id === comboRuleId);
  if (!rule) return null;
  const component = rule.components.find((c) => c.scopeId === companionScopeId);
  if (!component || component.scopeId === "both") return null;
  return roundToTenth(combinedHours * component.ratio);
}

/** Positions implied by job text; default Front + Rear for axle-level brake work. */
function extractPositions(text: string, rule: CombinedComboRule): string[] {
  const hasFront = /\bfront\b/i.test(text);
  const hasRear = /\brear\b/i.test(text);
  if (hasFront && hasRear) return ["Front & Rear"];
  if (hasFront) return ["Front"];
  if (hasRear) return ["Rear"];
  if (rule.id === "pads_rotors") return ["Front", "Rear"];
  return [""];
}

/**
 * When cache stores separate component lines (e.g. "front brake pads" + "front brake rotors"),
 * prefer those over calculated splits — assign ratio hours per matched component.
 */
function expandFromStoredComponents(hit: LaborGuideHit, rule: CombinedComboRule): LaborVariant[] | null {
  const ops = hit.laborOperations.filter(Boolean);
  if (ops.length < 2) return null;

  const matched = rule.components.filter(
    (c) => c.scopeId !== "both" && ops.some((op) => c.matchesOp(op)),
  );
  if (matched.length < 2) return null;

  const text = searchText(hit);
  const positions = extractPositions(text, rule);
  const variants: LaborVariant[] = [];
  const seen = new Set<string>();

  for (const position of positions) {
    for (const comp of matched) {
      const op = ops.find((o) => comp.matchesOp(o));
      if (!op) continue;
      const label = position ? `${position} · ${comp.scopeLabel}` : comp.scopeLabel;
      if (seen.has(label)) continue;
      seen.add(label);
      variants.push(
        buildComponentVariant(
          hit,
          `stored-${comp.scopeId}-${position || "all"}`,
          label,
          position || undefined,
          comp.scopeLabel,
          comp.ratio,
        ),
      );
    }
    const bothLabel = position ? `${position} · ${rule.components.find((c) => c.scopeId === "both")!.scopeLabel}` : rule.components.find((c) => c.scopeId === "both")!.scopeLabel;
    if (!seen.has(bothLabel)) {
      seen.add(bothLabel);
      const bothComp = rule.components.find((c) => c.scopeId === "both")!;
      variants.push(
        buildComponentVariant(
          hit,
          `stored-both-${position || "all"}`,
          bothLabel,
          position || undefined,
          bothComp.scopeLabel,
          1,
        ),
      );
    }
  }

  return variants.length >= 2 ? variants : null;
}

function expandCombinedVariants(hit: LaborGuideHit, rule: CombinedComboRule): LaborVariant[] {
  const text = searchText(hit);
  const fromStored = expandFromStoredComponents(hit, rule);
  if (fromStored) return fromStored;

  const positions = extractPositions(text, rule);
  const variants: LaborVariant[] = [];
  const seen = new Set<string>();

  for (const position of positions) {
    for (const comp of rule.components) {
      const label = position ? `${position} · ${comp.scopeLabel}` : comp.scopeLabel;
      if (seen.has(label)) continue;
      seen.add(label);
      variants.push(
        buildComponentVariant(
          hit,
          `${rule.id}-${comp.scopeId}-${position || "all"}`,
          label,
          position || undefined,
          comp.scopeLabel,
          comp.ratio,
        ),
      );
    }
  }

  return variants;
}

/**
 * Strut/shock variants — hours scale per unit:
 * one side = 1× base, both sides = 2×, all four = 4×.
 */
function expandStrutVariants(hit: LaborGuideHit): LaborVariant[] {
  return [
    buildVariant(hit, "front-one", "Front · One Side", "Front", "One Side", 1),
    buildVariant(hit, "front-both", "Front · Both Sides", "Front", "Both Sides", 2),
    buildVariant(hit, "rear-one", "Rear · One Side", "Rear", "One Side", 1),
    buildVariant(hit, "rear-both", "Rear · Both Sides", "Rear", "Both Sides", 2),
    buildVariant(hit, "all-four", "All Four", undefined, "All", 4),
  ];
}

/** Brake pad/rotor/caliper — per axle; front & rear = 2× one axle. Skipped when combined pads+rotors detected. */
function expandBrakeVariants(hit: LaborGuideHit): LaborVariant[] {
  const stored = detectStoredPosition(hit);
  if (stored) {
    const id = stored.toLowerCase().replace(/\s+/g, "-");
    return [buildVariant(hit, id, stored, stored, undefined, 1)];
  }
  return [
    buildVariant(hit, "front", "Front", "Front", undefined, 1),
    buildVariant(hit, "rear", "Rear", "Rear", undefined, 1),
    buildVariant(hit, "front-rear", "Front & Rear", "Front & Rear", undefined, 2),
  ];
}

/** Tire/wheel — one, pair (two), or all four. */
function expandTireVariants(hit: LaborGuideHit): LaborVariant[] {
  return [
    buildVariant(hit, "one", "One", undefined, "One", 1),
    buildVariant(hit, "pair", "Two (pair)", undefined, "Pair", 2),
    buildVariant(hit, "four", "Four", undefined, "Four", 4),
  ];
}

function singleVariant(hit: LaborGuideHit): LaborVariant[] {
  const label = hit.laborOperations[0] ?? hit.jobName;
  return [
    {
      id: `${hit.id}:single`,
      label,
      hours: roundHours(hit.totalHours),
      quantityDefault: 1,
    },
  ];
}

/** Canned jobs are whole-job bundles — one variant, all labor lines combined. */
function cannedVariant(hit: LaborGuideHit): LaborVariant[] {
  return [
    {
      id: `${hit.id}:canned`,
      label: hit.jobName,
      hours: roundHours(hit.totalHours),
      quantityDefault: 1,
    },
  ];
}

/** Positions explicitly named in hit text (front/rear). */
export function detectStoredPosition(hit: LaborGuideHit): "Front" | "Rear" | null {
  const text = searchText(hit);
  const hasFront = /\bfront\b/.test(text);
  const hasRear = /\brear\b/.test(text);
  if (hasFront && !hasRear) return "Front";
  if (hasRear && !hasFront) return "Rear";
  return null;
}

/** True when variant expansion can derive opposite-position siblings (brakes, struts, tires). */
export function isPositionDerivableHit(hit: LaborGuideHit): boolean {
  if (hit.cannedJobId) return false;
  const pattern = detectPattern(hit);
  return pattern === "brake" || pattern === "strut" || pattern === "tire";
}

function normalizePositionLabel(p: string): string {
  return p.trim().toLowerCase();
}

/** Filter variants to those matching requested position labels (Front, Rear, etc.). */
export function filterVariantsByPosition(
  variants: LaborVariant[],
  positions: string[],
): LaborVariant[] {
  if (!positions.length) return variants;
  const wanted = positions.map(normalizePositionLabel);

  return variants.filter((v) => {
    const pos = v.position ? normalizePositionLabel(v.position) : "";
    const label = v.label.toLowerCase();
    return wanted.some((w) => {
      if (w === "both sides") return label.includes("both sides");
      if (w === "front & rear") return pos.includes("front") && pos.includes("rear");
      if (pos) return pos === w || pos.startsWith(w);
      return label.startsWith(w) || label.includes(` ${w} `) || label.includes(`${w} ·`);
    });
  });
}

/**
 * Derive variants for a target position when cache row only mentions another position.
 * E.g. "front brake pads and rotors" → rear pads/rotors with same hours.
 */
export function derivePositionVariants(hit: LaborGuideHit, targetPosition: string): LaborVariant[] {
  if (!isPositionDerivableHit(hit)) return [];

  const sourcePos = detectStoredPosition(hit);
  const all = expandOperationVariantsCore(hit);

  if (!sourcePos) {
    return filterVariantsByPosition(all, [targetPosition]);
  }

  if (sourcePos.toLowerCase() === targetPosition.toLowerCase()) {
    return filterVariantsByPosition(all, [targetPosition]);
  }

  const sourceVariants = filterVariantsByPosition(all, [sourcePos]);
  if (!sourceVariants.length) return filterVariantsByPosition(all, [targetPosition]);

  return sourceVariants.map((v) => {
    const newLabel = v.label.replace(new RegExp(sourcePos, "gi"), targetPosition);
    const newPosition = v.position?.replace(sourcePos, targetPosition) ?? targetPosition;
    return {
      ...v,
      id: `${hit.id}:derived-${targetPosition.toLowerCase()}-${v.id.split(":").pop()}`,
      label: newLabel,
      position: newPosition,
    };
  });
}

/**
 * Expand a labor guide hit into position/quantity variants for the Shop Library detail panel.
 * Uses stored operation lines when present; otherwise rule-based expansion for common patterns.
 * Combined operations (e.g. "pads and rotors") split into component scopes with scaled hours.
 */
function expandOperationVariantsCore(hit: LaborGuideHit): LaborVariant[] {
  if (hit.cannedJobId) return cannedVariant(hit);

  const text = searchText(hit);
  const combinedRule = detectCombinedRule(text);

  if (combinedRule) {
    const fromComponents = expandFromStoredComponents(hit, combinedRule);
    if (fromComponents && fromComponents.length > 0) return fromComponents;
  }

  const fromOps = expandFromStoredOperations(hit);
  if (fromOps && fromOps.length > 0) return fromOps;

  if (combinedRule) {
    const combined = expandCombinedVariants(hit, combinedRule);
    if (combined.length > 0) return combined;
  }

  switch (detectPattern(hit)) {
    case "assembly":
      return singleVariant(hit);
    case "strut":
      return expandStrutVariants(hit);
    case "brake":
      return expandBrakeVariants(hit);
    case "tire":
      return expandTireVariants(hit);
    default:
      return singleVariant(hit);
  }
}

/** Apply optional position filter after expansion (search/detail panel). */
function applyPositionFilter(
  variants: LaborVariant[],
  positionFilter?: string[],
): LaborVariant[] {
  if (!positionFilter?.length) return variants;
  const filtered = filterVariantsByPosition(variants, positionFilter);
  return filtered.length ? filtered : variants;
}

export function expandOperationVariants(
  hit: LaborGuideHit,
  opts?: { positionFilter?: string[] },
): LaborVariant[] {
  const normalized = normalizeAssemblyHit(hit);
  const positionFilter = opts?.positionFilter ?? normalized.positionFilter;

  if (normalized.derivedFrom && positionFilter?.length) {
    const base = { ...normalized, derivedFrom: undefined, positionFilter: undefined };
    const derived = derivePositionVariants(base, positionFilter[0]!);
    if (derived.length) return derived;
  }

  return applyPositionFilter(expandOperationVariantsCore(normalized), positionFilter);
}

export function variantToCartLine(
  variant: LaborVariant,
  hit: Pick<LaborGuideHit, "jobName" | "dataSource">,
  source: LaborGuideHit["source"],
): LaborCartLine {
  const hasVariant = Boolean(variant.position || variant.scope);
  const description = shortLaborLineDescription(hit.jobName, hasVariant ? variant : undefined);
  const base = compactOperationName(hit.jobName);
  const variantLabel =
    hasVariant && description === base ? variant.label : undefined;
  return { description, variantLabel, hours: variant.hours, source, dataSource: hit.dataSource };
}

/** @internal Exported for manual / script-based verification. */
export function __laborVariantTestFixtures() {
  return {
    frontPadsRotors2h: {
      id: "test:front-pads-rotors",
      jobName: "Front brake pads and rotors",
      queryText: "front brake pads and rotors",
      totalHours: 2,
      laborOperations: ["Front brake pads and rotors R&R"],
      source: "cached" as const,
    },
    storedSplitOps: {
      id: "test:stored-split",
      jobName: "Front brake service",
      queryText: "front brake pads and rotors",
      totalHours: 2,
      laborOperations: ["Front brake pads R&R", "Front brake rotors R&R"],
      source: "cached" as const,
    },
  };
}
