/**
 * Canonical end-to-end Labor Book browse paths for Q1 Option A (trail + list + detail).
 * Used by scripts/test-labor-paths.ts and /dev/labor-paths.
 */

import {
  browseStepOrder,
  isBrowsePathComplete,
  nextBrowseStep,
  shouldLoadBrowseResults,
  shouldLoadOnSubcategorySelect,
  subcategoryIsAssemblyOnly,
} from "@/lib/labor-browse-hierarchy";
import { laborCategoryById, laborSubcategoryById } from "@/lib/labor-categories";
import {
  browseBreadcrumbParts,
  browseSyntheticQuery,
  operationFacetById,
  positionFacetById,
} from "@/lib/labor-nav-facets";
import type { ShopLibraryBrowsePath } from "@/lib/shop-library-chip-paths";

export type LaborPathPattern = "axle-first" | "operation-first" | "assembly-qualifier";

export type LaborPathVehicle = {
  label: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  engine?: string | null;
  trim?: string | null;
};

export type LaborBrowsePathStep = {
  step: number;
  /** User action in current Miller dialog (maps 1:1 to proposed trail clicks). */
  click: string;
  /** Miller column active on this step (today's UI). */
  millerColumn: "System" | "Component" | "Position" | "Operation" | "Jobs";
  /** Proposed Q1 Option A trail after this click. */
  trail: string[];
  /** What the middle / active list shows before the next click. */
  middlePane: string;
  /** Whether browse path is complete and jobs may load. */
  pathComplete: boolean;
};

export type LaborBrowsePathDefinition = {
  id: string;
  title: string;
  pattern: LaborPathPattern;
  vehicle: LaborPathVehicle;
  browsePath: ShopLibraryBrowsePath;
  /** Expected synthetic query sent to cache on final step. */
  syntheticQuery: string;
  /** Human label for the job row the user should pick. */
  addToJobTarget: string;
  /** Optional qualifier band (MOTOR / VIN context) shown above middle results. */
  qualifierBand?: string;
  steps: LaborBrowsePathStep[];
};

function vehicleHeader(v: LaborPathVehicle): string {
  const ymm = [v.year, v.make, v.model].filter(Boolean).join(" ");
  const engine = v.engine ? ` · ${v.engine}` : "";
  const vin = v.vin ? ` · VIN …${v.vin.slice(-6)}` : "";
  return `${ymm}${engine}${vin}`;
}

function resolveSteps(
  browsePath: ShopLibraryBrowsePath,
  vehicle: LaborPathVehicle,
): LaborBrowsePathStep[] {
  const cat = laborCategoryById(browsePath.categoryId);
  const sub = laborSubcategoryById(browsePath.subcategoryId);
  if (!cat || !sub) return [];

  const subLabel = sub.subcategory.label;

  const steps: LaborBrowsePathStep[] = [];
  let stepNum = 0;

  const push = (
    click: string,
    millerColumn: LaborBrowsePathStep["millerColumn"],
    positionId: string | null,
    operationId: string | null,
    middlePane: string,
  ) => {
    stepNum += 1;
    steps.push({
      step: stepNum,
      click,
      millerColumn,
      trail: [vehicleHeader(vehicle), ...browseBreadcrumbParts(browsePath.subcategoryId, positionId, operationId)],
      middlePane,
      pathComplete: isBrowsePathComplete(browsePath.subcategoryId, positionId, operationId),
    });
  };

  push(
    `Select System → ${cat.label}`,
    "System",
    null,
    null,
    `Component list under ${cat.label} (${subLabel}, …)`,
  );

  const assemblyOnly = subcategoryIsAssemblyOnly(browsePath.subcategoryId);
  const facetSteps = browseStepOrder(browsePath.subcategoryId);

  if (assemblyOnly) {
    push(
      `Select Component → ${subLabel}`,
      "Component",
      null,
      null,
      "Operation / variant rows (qualifier band may filter With AC / Without AC)",
    );
    push(
      "Jobs load immediately — pick variant row",
      "Jobs",
      null,
      null,
      "Heater core R&R variants with hours; qualifier band above results",
    );
    return steps;
  }

  push(
    `Select Component → ${subLabel}`,
    "Component",
    null,
    null,
    facetSteps.length
      ? `Next: ${facetSteps[0] === "position" ? "Position" : "Operation"} column (${facetSteps.join(" → ")})`
      : "Jobs list",
  );

  let positionId: string | null = null;
  let operationId: string | null = null;

  for (const facet of facetSteps) {
    if (facet === "position") {
      const posId = browsePath.positionId ?? "front";
      const pos = positionFacetById(browsePath.subcategoryId, posId);
      positionId = posId;
      push(
        `Select Position → ${pos?.label ?? posId}`,
        "Position",
        positionId,
        operationId,
        nextBrowseStep(browsePath.subcategoryId, positionId, operationId) === "operation"
          ? "Operation list (Replace pads, Pads & rotors, …)"
          : "Jobs list loading…",
      );
    } else if (facet === "operation") {
      const opId = browsePath.operationId ?? "pads-rr";
      const op = operationFacetById(browsePath.subcategoryId, opId);
      operationId = opId;
      push(
        `Select Operation → ${op?.label ?? opId}`,
        "Operation",
        positionId,
        operationId,
        shouldLoadBrowseResults(browsePath.subcategoryId, positionId, operationId)
          ? "Jobs list with hours (+ related labor)"
          : "Position column (Front / Rear)",
      );
    }
  }

  if (shouldLoadBrowseResults(browsePath.subcategoryId, browsePath.positionId, browsePath.operationId)) {
    push(
      "Select job row → Add to job (+) or detail panel",
      "Jobs",
      browsePath.positionId ?? positionId,
      browsePath.operationId ?? operationId,
      "Pick primary labor line; optional related rows below",
    );
  }

  return steps;
}

/** Path 1 — axle-first (Tekmetric Video 2 deep breadcrumb): Brakes › Pads › Front › Replace. */
export const LABOR_PATH_AXLE_FIRST_BRAKE_PADS: LaborBrowsePathDefinition = {
  id: "path-1-axle-first-brake-pads",
  title: "Front brake pads (axle-first)",
  pattern: "axle-first",
  vehicle: {
    label: "2010 Honda Civic",
    vin: "19XFA1F51AE028415",
    year: 2010,
    make: "Honda",
    model: "Civic",
    engine: "2.0L 4-cyl",
  },
  browsePath: {
    categoryId: "motor-s-2",
    subcategoryId: "motor-sg-44",
    positionId: "front",
    operationId: "pads-rr",
  },
  syntheticQuery: browseSyntheticQuery("motor-sg-44", "front", "pads-rr"),
  addToJobTarget: "Front brake pads R&R (pads-only; exclude pad+rotor combo rows)",
  qualifierBand: "Disc · 4-Wheel ABS (when VIN/trim available)",
  steps: [],
};

/** Path 2 — operation-first (struts): Suspension › Struts › Replace › Front. */
export const LABOR_PATH_OPERATION_FIRST_STRUTS: LaborBrowsePathDefinition = {
  id: "path-2-operation-first-struts",
  title: "Front strut replacement (operation-first)",
  pattern: "operation-first",
  vehicle: {
    label: "2010 Honda Civic",
    vin: "19XFA1F51AE028415",
    year: 2010,
    make: "Honda",
    model: "Civic",
    engine: "2.0L 4-cyl",
  },
  browsePath: {
    categoryId: "motor-s-6",
    subcategoryId: "motor-sg-81",
    operationId: "strut-rr",
    positionId: "front",
  },
  syntheticQuery: browseSyntheticQuery("motor-sg-81", "front", "strut-rr"),
  addToJobTarget: "Front strut / shock R&R",
  steps: [],
};

/** Reference path — assembly + MOTOR qualifier (not in automated 2-path suite). */
export const LABOR_PATH_ASSEMBLY_HEATER_CORE: LaborBrowsePathDefinition = {
  id: "path-ref-hvac-heater-core",
  title: "Heater core R&R (assembly + AC qualifier)",
  pattern: "assembly-qualifier",
  vehicle: {
    label: "2009 Hyundai Sonata GLS",
    year: 2009,
    make: "Hyundai",
    model: "Sonata",
    engine: "2.4L 4-cyl",
  },
  browsePath: {
    categoryId: "hvac",
    subcategoryId: "hvac-heater-core",
  },
  syntheticQuery: browseSyntheticQuery("hvac-heater-core", "all", null),
  addToJobTarget: "Heater Core R&R — With AC (or Without AC if no AC on vehicle)",
  qualifierBand: "With Air Conditioning · from VIN/trim",
  steps: [],
};

function hydrate(def: LaborBrowsePathDefinition): LaborBrowsePathDefinition {
  return {
    ...def,
    steps: resolveSteps(def.browsePath, def.vehicle),
  };
}

export const LABOR_BROWSE_TEST_PATHS: LaborBrowsePathDefinition[] = [
  hydrate(LABOR_PATH_AXLE_FIRST_BRAKE_PADS),
  hydrate(LABOR_PATH_OPERATION_FIRST_STRUTS),
];

export const LABOR_BROWSE_REFERENCE_PATHS: LaborBrowsePathDefinition[] = [
  hydrate(LABOR_PATH_ASSEMBLY_HEATER_CORE),
];

/** Hierarchy-only validation (no DB). */
export function validateBrowsePathHierarchy(def: LaborBrowsePathDefinition): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { browsePath: p } = def;

  if (!laborCategoryById(p.categoryId)) errors.push(`Unknown category: ${p.categoryId}`);
  if (!laborSubcategoryById(p.subcategoryId)) errors.push(`Unknown subcategory: ${p.subcategoryId}`);

  if (p.positionId && !positionFacetById(p.subcategoryId, p.positionId)) {
    errors.push(`Unknown position: ${p.positionId}`);
  }
  if (p.operationId && !operationFacetById(p.subcategoryId, p.operationId)) {
    errors.push(`Unknown operation: ${p.operationId}`);
  }

  if (!isBrowsePathComplete(p.subcategoryId, p.positionId ?? null, p.operationId ?? null)) {
    errors.push("Browse path incomplete per browseStepOrder()");
  }

  if (!shouldLoadBrowseResults(p.subcategoryId, p.positionId, p.operationId)) {
    errors.push("shouldLoadBrowseResults returned false");
  }

  const expectedQuery = browseSyntheticQuery(p.subcategoryId, p.positionId, p.operationId);
  if (def.syntheticQuery !== expectedQuery) {
    errors.push(`Synthetic query mismatch: expected "${expectedQuery}"`);
  }

  if (def.steps.length === 0) errors.push("No steps resolved");

  const last = def.steps[def.steps.length - 1];
  if (last && !last.pathComplete && !subcategoryIsAssemblyOnly(p.subcategoryId)) {
    errors.push("Final step should mark pathComplete");
  }

  if (subcategoryIsAssemblyOnly(p.subcategoryId) && !shouldLoadOnSubcategorySelect(p.subcategoryId)) {
    errors.push("Assembly subcategory should load on component select");
  }

  return { ok: errors.length === 0, errors };
}
