/**
 * ShopRally labor-hour calibration floors.
 *
 * AI first-principles estimates can undershoot industry flat-rate for
 * access-heavy jobs. We do not copy commercial tables; we enforce conservative
 * minimum hours per unit so Labor Book stays usable.
 *
 * Applied on AI suggest/write paths and when serving AI-sourced cache rows.
 * Licensed MOTOR and shop-curated/manual rows are left alone.
 */

export type LaborHoursCalibration = {
  id: string;
  /** Match job / query / ops text after normalization. */
  match: (text: string) => boolean;
  /** Minimum laborHoursPerUnit (one corner / one axle / one assembly). */
  minHoursPerUnit: number;
  /** Soft typical target, used only for notes when a row is raised. */
  typicalLabel: string;
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Ordered most-specific first. First match wins.
 * Hours are per unit, not whole-vehicle totals.
 */
export const LABOR_HOURS_FLOORS: LaborHoursCalibration[] = [
  {
    id: "wheel-bearing-hub",
    match: (t) => {
      const isBearingHub =
        /\bwheel bearing\b/.test(t) ||
        /\bhub bearing\b/.test(t) ||
        /\bhub assembly\b/.test(t) ||
        (/\bbearing\b/.test(t) && /\bhub\b/.test(t));
      const isPrimaryAxleJob =
        /\b(cv axle|axle shaft|halfshaft)\s+(replacement|r r|remove|install)\b/.test(t) &&
        !/\bwheel bearing\b/.test(t) &&
        !/\bhub bearing\b/.test(t);
      return isBearingHub && !isPrimaryAxleJob;
    },
    // ProDemand-class shape: Accord front one-side ~2.2-2.7; both ~4.2-5.2.
    minHoursPerUnit: 2.2,
    typicalLabel: "wheel bearing/hub ~2.2-2.7 hr per corner",
  },
  {
    id: "strut-shock",
    match: (t) =>
      (/\bstruts?\b/.test(t) || /\bshock\b/.test(t)) &&
      !/\bmount only\b/.test(t),
    minHoursPerUnit: 1.5,
    typicalLabel: "strut/shock ~1.5-2.5 hr per corner",
  },
  {
    id: "brake-pads-rotors",
    match: (t) => /\bpads?\b/.test(t) && /\brotors?\b/.test(t) && /\bbrake\b/.test(t),
    minHoursPerUnit: 1.8,
    typicalLabel: "pads+rotors ~1.8-2.5 hr per axle",
  },
  {
    id: "brake-pads",
    match: (t) =>
      (/\bbrake pads?\b/.test(t) || (/\bpads?\b/.test(t) && /\bbrake\b/.test(t))) &&
      !/\brotors?\b/.test(t),
    minHoursPerUnit: 1.0,
    typicalLabel: "brake pads ~1.0-1.5 hr per axle",
  },
  {
    id: "brake-rotors",
    match: (t) =>
      /\brotors?\b/.test(t) &&
      /\bbrake\b/.test(t) &&
      !/\bpads?\b/.test(t),
    minHoursPerUnit: 1.0,
    typicalLabel: "brake rotors alone ~1.0-1.5 hr per axle",
  },
  {
    id: "brake-caliper",
    match: (t) => /\bcaliper\b/.test(t) && !/\bpads?\b/.test(t),
    minHoursPerUnit: 1.0,
    typicalLabel: "caliper R&R ~1.0-1.5 hr per corner",
  },
  {
    id: "timing-belt",
    match: (t) => /\btiming belt\b/.test(t),
    minHoursPerUnit: 3.5,
    typicalLabel: "timing belt ~3.5-6+ hr (vehicle dependent)",
  },
  {
    id: "water-pump",
    match: (t) => /\bwater pump\b/.test(t) && !/\btiming\b/.test(t),
    minHoursPerUnit: 1.5,
    typicalLabel: "water pump alone ~1.5-3 hr",
  },
  {
    id: "serpentine-belt",
    match: (t) =>
      (/\bserpentine\b/.test(t) || /\baccessory (drive )?belt\b/.test(t)) &&
      !/\btensioner\b/.test(t),
    minHoursPerUnit: 0.5,
    typicalLabel: "serpentine belt ~0.5-1.0 hr",
  },
  {
    id: "control-arm",
    match: (t) => /\bcontrol arm\b/.test(t),
    minHoursPerUnit: 1.5,
    typicalLabel: "control arm ~1.5-2.5 hr per side",
  },
  {
    id: "tie-rod",
    match: (t) => /\btie rods?\b/.test(t),
    minHoursPerUnit: 0.8,
    typicalLabel: "tie rod ~0.8-1.5 hr per side",
  },
  {
    id: "wheel-alignment",
    match: (t) => /\b(wheel )?alignment\b/.test(t),
    minHoursPerUnit: 1.0,
    typicalLabel: "alignment ~1.0-1.5 hr",
  },
];

export type CalibratableHours = {
  jobName: string;
  unitLabel: string;
  unitsOnVehicle: number;
  laborHoursPerUnit: number;
  laborOperations?: string[];
  notes?: string;
  queryText?: string;
};

export type HoursCalibrationResult<T extends CalibratableHours> = {
  suggestion: T;
  applied: LaborHoursCalibration | null;
  raisedFrom: number | null;
};

function suggestionText(s: CalibratableHours): string {
  return norm(
    [s.jobName, s.queryText ?? "", s.unitLabel, ...(s.laborOperations ?? [])].join(" "),
  );
}

export function findHoursFloor(text: string): LaborHoursCalibration | null {
  const t = norm(text);
  return LABOR_HOURS_FLOORS.find((f) => f.match(t)) ?? null;
}

/** Raise laborHoursPerUnit to the family floor when AI undershoots. */
export function applyLaborHoursFloor<T extends CalibratableHours>(
  suggestion: T,
): HoursCalibrationResult<T> {
  const floor = findHoursFloor(suggestionText(suggestion));
  if (!floor) {
    return { suggestion, applied: null, raisedFrom: null };
  }

  const current = suggestion.laborHoursPerUnit;
  if (!(current > 0) || current >= floor.minHoursPerUnit) {
    return { suggestion, applied: null, raisedFrom: null };
  }

  const note = `ShopRally hour floor applied (${floor.typicalLabel}; was ${current.toFixed(2)} hr/unit).`;
  const notes = suggestion.notes?.trim()
    ? `${suggestion.notes.trim()}\n${note}`
    : note;

  return {
    suggestion: {
      ...suggestion,
      laborHoursPerUnit: floor.minHoursPerUnit,
      notes,
    },
    applied: floor,
    raisedFrom: current,
  };
}

/** True when a cache row should receive floor calibration (AI / first-principles). */
export function shouldCalibrateLaborDataSource(dataSource: string | null | undefined): boolean {
  const ds = (dataSource ?? "").toLowerCase();
  if (!ds) return true;
  if (ds.startsWith("motor")) return false;
  if (ds === "shop_custom" || ds === "shop_curated" || ds === "canned" || ds === "manual") {
    return false;
  }
  return ds === "ai" || ds.startsWith("ai_") || ds === "ai_estimate";
}
