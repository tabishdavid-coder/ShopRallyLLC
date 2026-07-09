/** Browse drill-down facets (position + operation) — generic shop-SMS taxonomy, not licensed guide data. */

import type { LaborGuideHit } from "@/lib/labor-guide-types";
import {
  laborSubcategoryById,
  matchOperationsToSubcategory,
  resolveSubcategoryId,
} from "@/lib/labor-categories";
import { isMotorAlignedSubcategoryId } from "@/lib/labor-motor-tree";
import { isCvAxleJob, isWheelBearingJob } from "@/lib/labor-job-context";

export type PositionFacet = {
  id: string;
  label: string;
  /** Synthetic search phrase for position derivation + filtering. */
  queryHint: string;
};

export type OperationFacet = {
  id: string;
  label: string;
  keywords: string[];
};

/** Miller-column and breadcrumb order when both position + operation facets exist. */
export type FacetOrder = "position-first" | "operation-first";

export type SubcategoryNavConfig = {
  positions?: PositionFacet[];
  operations?: OperationFacet[];
  /**
   * position-first (default): Front/Rear → Replace pads — best when axle location is the primary split (brake pads).
   * operation-first: Replace strut → Front — best when job type comes before axle (suspension, calipers, rotors).
   */
  facetOrder?: FacetOrder;
};

/** Brakes, struts, rotors — axle is the primary split (no flat "all positions" shortcut). */
const FRONT_REAR_AXLE: PositionFacet[] = [
  { id: "front", label: "Front", queryHint: "front" },
  { id: "rear", label: "Rear", queryHint: "rear" },
];

/** Tires, bearings — corner-level when needed. */
const WHEEL_POSITIONS: PositionFacet[] = [
  { id: "front", label: "Front", queryHint: "front" },
  { id: "rear", label: "Rear", queryHint: "rear" },
  { id: "left", label: "Left", queryHint: "left" },
  { id: "right", label: "Right", queryHint: "right" },
];

const VEHICLE_WIDE: PositionFacet[] = [{ id: "all", label: "Vehicle", queryHint: "" }];

const BRAKE_PAD_OPS: OperationFacet[] = [
  { id: "pads-rr", label: "Replace brake pads", keywords: ["pad", "replace", "r&r", "r/r"] },
  { id: "pads-rotors", label: "Pads & rotors", keywords: ["pad", "rotor"] },
  { id: "inspect", label: "Inspect / measure", keywords: ["inspect", "measure", "check", "thin"] },
  { id: "resurface", label: "Resurface / turn rotors", keywords: ["resurface", "turn", "machine", "cut"] },
];

const BRAKE_ROTOR_OPS: OperationFacet[] = [
  { id: "rotor-rr", label: "Replace rotors", keywords: ["rotor", "replace", "r&r"] },
  { id: "resurface", label: "Resurface / turn", keywords: ["resurface", "turn", "machine"] },
  { id: "drum-rr", label: "Drum service", keywords: ["drum"] },
];

const BRAKE_CALIPER_OPS: OperationFacet[] = [
  { id: "caliper-rr", label: "Replace caliper", keywords: ["caliper", "replace"] },
  { id: "caliper-rebuild", label: "Rebuild / hardware", keywords: ["rebuild", "hardware", "slide", "pin"] },
];

const BRAKE_LINE_OPS: OperationFacet[] = [
  { id: "bleed", label: "Bleed / flush", keywords: ["bleed", "flush", "fluid"] },
  { id: "line-rr", label: "Lines & hoses", keywords: ["line", "hose", "master"] },
];

const STRUT_OPS: OperationFacet[] = [
  { id: "strut-rr", label: "Replace strut / shock", keywords: ["strut", "shock", "replace"] },
  { id: "strut-mount", label: "Strut mount / bearing", keywords: ["mount", "bearing", "plate"] },
  { id: "inspect", label: "Inspect suspension", keywords: ["inspect", "check"] },
];

const COMPRESSOR_OPS: OperationFacet[] = [
  { id: "compressor-rr", label: "Replace compressor", keywords: ["compressor", "replace", "r&r"] },
  { id: "clutch-pulley", label: "Clutch / pulley", keywords: ["clutch", "pulley"] },
  { id: "inspect", label: "Inspect / diagnose", keywords: ["inspect", "diagnose", "check"] },
];

const REFRIGERANT_OPS: OperationFacet[] = [
  { id: "recharge", label: "Recharge", keywords: ["recharge", "refill", "freon", "r134a"] },
  { id: "leak-test", label: "Leak test", keywords: ["leak", "leak test", "dye"] },
  { id: "evac-recharge", label: "Evac & recharge", keywords: ["evac", "vacuum", "recover"] },
];

const BLOWER_OPS: OperationFacet[] = [
  { id: "motor-rr", label: "Blower motor", keywords: ["blower motor", "blower fan"] },
  { id: "resistor-rr", label: "Blower resistor", keywords: ["resistor", "speed resistor"] },
  { id: "actuator-rr", label: "Blend door actuator", keywords: ["actuator", "blend door", "mode door"] },
];

const HOSES_OPS: OperationFacet[] = [
  { id: "ac-line", label: "A/C lines & hoses", keywords: ["a/c line", "ac line", "a/c hose", "discharge", "suction"] },
  { id: "heater-hose", label: "Heater hoses", keywords: ["heater hose", "heater line"] },
];

const CABIN_FILTER_OPS: OperationFacet[] = [
  { id: "filter-rr", label: "Replace cabin filter", keywords: ["cabin filter", "replace", "r&r"] },
];

const HVAC_DIAG_OPS: OperationFacet[] = [
  { id: "diagnose", label: "Diagnose", keywords: ["diagnose", "diagnosis", "performance"] },
  { id: "inspect", label: "Inspect / test", keywords: ["inspect", "check", "test"] },
];

const CV_AXLE_OPS: OperationFacet[] = [
  { id: "cv-axle-rr", label: "Replace CV axle", keywords: ["cv axle", "axle shaft", "halfshaft", "half shaft"] },
  { id: "cv-joint", label: "CV joint / boot", keywords: ["cv joint", "boot", "u-joint"] },
];

const WHEEL_BEARING_OPS: OperationFacet[] = [
  { id: "bearing-rr", label: "Replace wheel bearing", keywords: ["wheel bearing", "hub bearing", "bearing"] },
  { id: "hub-rr", label: "Replace hub assembly", keywords: ["hub assembly", "hub"] },
  { id: "bearing-hub", label: "Bearing & hub", keywords: ["bearing", "hub"] },
];

/** Per-subcategory navigation config — legacy Miller facets; MOTOR subgroups use position on application row. */
export const SUBCATEGORY_NAV: Record<string, SubcategoryNavConfig> = {
  "motor-sg-44": { positions: FRONT_REAR_AXLE, operations: BRAKE_PAD_OPS },
  "motor-sg-45": {
    positions: FRONT_REAR_AXLE,
    operations: BRAKE_ROTOR_OPS,
    facetOrder: "operation-first",
  },
  "motor-sg-41": {
    positions: FRONT_REAR_AXLE,
    operations: BRAKE_CALIPER_OPS,
    facetOrder: "operation-first",
  },
  "motor-sg-81": {
    positions: FRONT_REAR_AXLE,
    operations: STRUT_OPS,
    facetOrder: "operation-first",
  },
  "motor-sg-51": {
    positions: VEHICLE_WIDE,
    operations: COMPRESSOR_OPS,
    facetOrder: "operation-first",
  },
  /** @deprecated legacy ids — resolved via resolveSubcategoryId */
  "brakes-pads": { positions: FRONT_REAR_AXLE, operations: BRAKE_PAD_OPS },
  "brakes-rotors": {
    positions: FRONT_REAR_AXLE,
    operations: BRAKE_ROTOR_OPS,
    facetOrder: "operation-first",
  },
  "brakes-calipers": {
    positions: FRONT_REAR_AXLE,
    operations: BRAKE_CALIPER_OPS,
    facetOrder: "operation-first",
  },
  "brakes-lines": {
    positions: VEHICLE_WIDE,
    operations: BRAKE_LINE_OPS,
    facetOrder: "operation-first",
  },
  "brakes-abs": { positions: VEHICLE_WIDE },
  "brakes-parking": { positions: FRONT_REAR_AXLE },
  "suspension-struts": {
    positions: FRONT_REAR_AXLE,
    operations: STRUT_OPS,
    facetOrder: "operation-first",
  },
  "suspension-arms": { positions: FRONT_REAR_AXLE },
  "suspension-joints": { positions: FRONT_REAR_AXLE },
  "suspension-springs": { positions: FRONT_REAR_AXLE },
  "suspension-alignment": { positions: VEHICLE_WIDE },
  "steering-tie": {
    positions: [
      { id: "left", label: "Left / Driver", queryHint: "left" },
      { id: "right", label: "Right / Passenger", queryHint: "right" },
    ],
  },
  "tires-service": { positions: WHEEL_POSITIONS },
  "tires-wheels": { positions: WHEEL_POSITIONS },
  "tires-bearing": {
    positions: WHEEL_POSITIONS,
    operations: WHEEL_BEARING_OPS,
    facetOrder: "operation-first",
  },
  "trans-axle": { positions: FRONT_REAR_AXLE, operations: CV_AXLE_OPS },
  "hvac-compressor": {
    positions: VEHICLE_WIDE,
    operations: COMPRESSOR_OPS,
    facetOrder: "operation-first",
  },
  "hvac-refrigerant": {
    positions: VEHICLE_WIDE,
    operations: REFRIGERANT_OPS,
    facetOrder: "operation-first",
  },
  "hvac-blower-controls": {
    positions: VEHICLE_WIDE,
    operations: BLOWER_OPS,
    facetOrder: "operation-first",
  },
  "hvac-hoses-lines": {
    positions: VEHICLE_WIDE,
    operations: HOSES_OPS,
    facetOrder: "operation-first",
  },
  "hvac-cabin-filter": {
    positions: VEHICLE_WIDE,
    operations: CABIN_FILTER_OPS,
    facetOrder: "operation-first",
  },
  "hvac-diagnosis": {
    positions: VEHICLE_WIDE,
    operations: HVAC_DIAG_OPS,
    facetOrder: "operation-first",
  },
};

export function navConfigForSubcategory(subcategoryId: string): SubcategoryNavConfig {
  const resolved = resolveSubcategoryId(subcategoryId);
  if (isMotorAlignedSubcategoryId(resolved) && !SUBCATEGORY_NAV[resolved]) {
    return { positions: [{ id: "all", label: "All", queryHint: "" }] };
  }
  return SUBCATEGORY_NAV[resolved] ?? { positions: [{ id: "all", label: "All", queryHint: "" }] };
}

export function positionFacetsForSubcategory(subcategoryId: string): PositionFacet[] {
  const cfg = navConfigForSubcategory(subcategoryId);
  const positions = cfg.positions ?? [{ id: "all", label: "All", queryHint: "" }];
  return positions.length > 1 ? positions : positions;
}

export function operationFacetsForSubcategory(subcategoryId: string): OperationFacet[] {
  return navConfigForSubcategory(subcategoryId).operations ?? [];
}

export function subcategoryFacetOrder(subcategoryId: string): FacetOrder {
  return navConfigForSubcategory(subcategoryId).facetOrder ?? "position-first";
}

export function subcategoryUsesOperationFirst(subcategoryId: string): boolean {
  return subcategoryFacetOrder(subcategoryId) === "operation-first";
}

export function subcategoryNeedsPositionStep(subcategoryId: string): boolean {
  const positions = positionFacetsForSubcategory(subcategoryId);
  return positions.length > 1;
}

export function subcategoryNeedsOperationStep(subcategoryId: string): boolean {
  return operationFacetsForSubcategory(subcategoryId).length > 0;
}

export function positionFacetById(subcategoryId: string, positionId: string): PositionFacet | undefined {
  return positionFacetsForSubcategory(subcategoryId).find((p) => p.id === positionId);
}

export function operationFacetById(subcategoryId: string, operationId: string): OperationFacet | undefined {
  return operationFacetsForSubcategory(subcategoryId).find((o) => o.id === operationId);
}

function hitSearchBlob(hit: LaborGuideHit): string {
  return [hit.jobName, hit.queryText ?? "", ...hit.laborOperations].join(" ").toLowerCase();
}

function matchesPosition(hit: LaborGuideHit, facet: PositionFacet): boolean {
  if (facet.id === "all") return true;
  const text = hitSearchBlob(hit);
  switch (facet.id) {
    case "front":
      return /\bfront\b/.test(text) && !/\brear\b/.test(text);
    case "rear":
      return /\brear\b/.test(text) && !/\bfront\b/.test(text);
    case "front-rear":
      return /\bfront\b/.test(text) && /\brear\b/.test(text);
    case "left":
      return /\bleft\b|\bdriver\b/.test(text);
    case "right":
      return /\bright\b|\bpassenger\b/.test(text);
    default:
      return facet.queryHint ? text.includes(facet.queryHint.toLowerCase()) : true;
  }
}

function matchesOperation(hit: LaborGuideHit, facet: OperationFacet): boolean {
  const text = hitSearchBlob(hit);
  const hasPad = /\bpad/.test(text);
  const hasRotor = /\brotor/.test(text);
  const hasDrum = /\bdrum\b/.test(text);

  switch (facet.id) {
    case "pads-rr":
      // Pads only — exclude combined pad+rotor/drum jobs (those belong under Pads & rotors).
      return hasPad && !hasRotor && !hasDrum;
    case "pads-rotors":
      return hasPad && hasRotor;
    case "rotor-rr":
      return hasRotor && !hasPad;
    case "resurface":
      return /\b(resurface|turn|machine|cut)\b/.test(text);
    case "inspect":
      return /\b(inspect|measure|check|thin)\b/.test(text);
    case "drum-rr":
      return hasDrum;
    case "compressor-rr":
      return /\bcompressor\b/.test(text) && !/\b(clutch|pulley)\b/.test(text);
    case "clutch-pulley":
      return /\b(clutch|pulley)\b/.test(text);
    case "recharge":
      return /\b(recharge|refill|freon|r134a)\b/.test(text) && !/\b(evac|vacuum|leak)\b/.test(text);
    case "leak-test":
      return /\b(leak|dye)\b/.test(text);
    case "evac-recharge":
      return /\b(evac|vacuum|recover)\b/.test(text);
    case "motor-rr":
      return /\bblower\b/.test(text) && /\b(motor|fan)\b/.test(text);
    case "resistor-rr":
      return /\bresistor\b/.test(text);
    case "actuator-rr":
      return /\b(actuator|blend door|mode door)\b/.test(text);
    case "ac-line":
      return /\b(a\/c|ac)\b/.test(text) && /\b(line|hose|discharge|suction)\b/.test(text);
    case "heater-hose":
      return /\bheater\b/.test(text) && /\b(hose|line)\b/.test(text);
    case "filter-rr":
      return /\bcabin\b/.test(text) && /\bfilter\b/.test(text);
    case "diagnose":
      return /\b(diagnos|performance)\b/.test(text);
    case "cv-axle-rr":
      return isCvAxleJob(text) && !/\b(cv\s+joint|boot|u-?joint)\b/i.test(text);
    case "cv-joint":
      return /\b(cv\s+joint|boot|u-?joint)\b/i.test(text);
    case "bearing-rr":
      return (
        /\bbearing\b/i.test(text) &&
        !/\bhub\s+assembly\b/i.test(text) &&
        !(/\bbearing\b/i.test(text) && /\bhub\b/i.test(text))
      );
    case "hub-rr":
      return /\bhub\b/i.test(text) && !/\bbearing\b/i.test(text);
    case "bearing-hub":
      return isWheelBearingJob(text) && /\bbearing\b/i.test(text) && /\bhub\b/i.test(text);
    default:
      return facet.keywords.some((kw) => text.includes(kw.toLowerCase()));
  }
}

/** Build browse breadcrumb — facet order follows subcategory config. */
export function browseBreadcrumbParts(
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): string[] {
  const found = laborSubcategoryById(subcategoryId);
  if (!found) return [];
  const parts = [found.category.label, found.subcategory.label];
  const pos = positionId ? positionFacetById(subcategoryId, positionId) : undefined;
  const op = operationId ? operationFacetById(subcategoryId, operationId) : undefined;
  const opFirst = subcategoryUsesOperationFirst(subcategoryId);

  if (opFirst) {
    if (op) parts.push(op.label);
    if (pos && pos.id !== "all") parts.push(pos.label);
  } else {
    if (pos && pos.id !== "all") parts.push(pos.label);
    if (op) parts.push(op.label);
  }
  return parts;
}

/** Synthetic query for position derivation when browsing (not typing). */
export function browseSyntheticQuery(
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): string {
  const found = laborSubcategoryById(subcategoryId);
  if (!found) return "";
  const pos = positionId ? positionFacetById(subcategoryId, positionId) : undefined;
  const op = operationId ? operationFacetById(subcategoryId, operationId) : undefined;
  const opFirst = subcategoryUsesOperationFirst(subcategoryId);
  if (opFirst) {
    return [op?.keywords[0], pos?.queryHint, found.subcategory.label].filter(Boolean).join(" ").trim();
  }
  return [pos?.queryHint, op?.keywords[0], found.subcategory.label].filter(Boolean).join(" ").trim();
}

/** Filter + enrich browse hits after subcategory load. */
export function applyBrowseFacets(
  hits: LaborGuideHit[],
  subcategoryId: string,
  positionId?: string | null,
  operationId?: string | null,
): LaborGuideHit[] {
  let out = matchOperationsToSubcategory(subcategoryId, hits);

  const pos = positionId ? positionFacetById(subcategoryId, positionId) : undefined;
  if (pos && pos.id !== "all") {
    out = out.filter((h) => matchesPosition(h, pos));
  }

  const op = operationId ? operationFacetById(subcategoryId, operationId) : undefined;
  if (op) {
    out = out.filter((h) => matchesOperation(h, op));
  }

  const path = browseBreadcrumbParts(subcategoryId, positionId, operationId).join(" › ");
  return out.map((h) => ({ ...h, categoryPath: path || h.categoryPath }));
}
