/**
 * MOTOR-aligned labor category tree for shop library browse.
 * Static reference from prisma/data/motor-taxonomy-22124.json (8 systems).
 * Live vehicles use synced MotorCatalogNode via getLaborBookMotorInit.
 */

import {
  isMotorAlignedSubcategoryId,
  motorSubGroupIdFromShopId,
} from "@/lib/labor-motor-tree";
import {
  LEGACY_SUBCATEGORY_TO_MOTOR,
  MOTOR_FLAT_SUBCATEGORIES,
  MOTOR_LABOR_SYSTEMS,
  MOTOR_REFERENCE_COUNTS,
} from "@/lib/labor-motor-tree-static";

export type LaborSubcategory = {
  id: string;
  label: string;
  keywords: string[];
  motorSystemId?: number;
  motorGroupId?: number;
  motorSubGroupId?: number;
  nodeKey?: string;
  groupLabel?: string;
};

export type LaborCategory = {
  id: string;
  label: string;
  motorSystemId?: number;
  subcategories: LaborSubcategory[];
};

export type OperationClassification = {
  categoryId: string;
  subcategoryId: string;
  breadcrumb: string;
};

/** Resolve legacy subcategory ids (brakes-pads) to MOTOR-aligned ids (motor-sg-44). */
export function resolveSubcategoryId(subcategoryId: string): string {
  return LEGACY_SUBCATEGORY_TO_MOTOR[subcategoryId] ?? subcategoryId;
}

/** MOTOR-shaped 2-level tree: System → SubGroup (label includes Group). */
export const LABOR_CATEGORY_TREE: LaborCategory[] = MOTOR_LABOR_SYSTEMS.map((system) => ({
  id: system.id,
  label: system.label,
  motorSystemId: system.motorSystemId,
  subcategories: system.groups.flatMap((group) =>
    group.subgroups.map((sub) => ({
      id: sub.id,
      label: `${group.label} › ${sub.label}`,
      groupLabel: group.label,
      motorSystemId: sub.motorSystemId,
      motorGroupId: sub.motorGroupId,
      motorSubGroupId: sub.motorSubGroupId,
      nodeKey: sub.nodeKey,
      keywords: sub.keywords,
    })),
  ),
}));

/** Flat list of main categories (backward compatible). */
export const LABOR_CATEGORIES = LABOR_CATEGORY_TREE.map(({ id, label }) => ({ id, label }));

export const MOTOR_SHOP_LIBRARY_COUNTS = MOTOR_REFERENCE_COUNTS;

export function laborCategoryById(id: string): LaborCategory | undefined {
  return LABOR_CATEGORY_TREE.find((c) => c.id === id);
}

export function laborSubcategoryById(subcategoryId: string): {
  category: LaborCategory;
  subcategory: LaborSubcategory;
} | undefined {
  const resolved = resolveSubcategoryId(subcategoryId);
  for (const category of LABOR_CATEGORY_TREE) {
    const subcategory = category.subcategories.find((s) => s.id === resolved);
    if (subcategory) return { category, subcategory };
  }
  return undefined;
}

function keywordMatches(text: string, keyword: string): boolean {
  const hay = text.toLowerCase();
  const kw = keyword.toLowerCase().trim();
  if (!kw) return false;
  if (kw.includes(" ")) return hay.includes(kw);
  if (kw.length <= 3) {
    return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(hay);
  }
  return hay.includes(kw);
}

function textMatchesKeywords(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => keywordMatches(text, kw));
}

const SUSPENSION_PRIORITY = [
  "strut",
  "shock",
  "spring",
  "control arm",
  "ball joint",
  "sway bar",
  "stabilizer",
  "tie rod",
  "bushing",
  "knuckle",
  "alignment",
];

const STEERING_PRIORITY = ["steering rack", "steering gear", "power steering", "steering column", "steering pump"];

const DRIVETRAIN_PRIORITY = [
  "cv axle",
  "cv joint",
  "axle shaft",
  "halfshaft",
  "half shaft",
  "drive shaft",
  "driveshaft",
  "u-joint",
];

const WHEEL_BEARING_PRIORITY = ["wheel bearing", "hub bearing", "hub assembly"];

const BRAKE_PRIORITY = [
  "brake pad",
  "brake rotor",
  "brake caliper",
  "brake line",
  "brake hose",
  "brake fluid",
  "brake job",
  "brake service",
  "parking brake",
  "drum brake",
];

const HVAC_PRIORITY = [
  "heater core",
  "ac compressor",
  "a/c compressor",
  "compressor clutch",
  "compressor pulley",
  "a/c condenser",
  "ac condenser",
  "evaporator",
  "evap core",
  "refrigerant",
  "freon",
  "a/c recharge",
  "ac recharge",
  "a/c leak",
  "ac leak",
  "blower motor",
  "blower resistor",
  "blend door",
  "cabin filter",
  "cabin air filter",
  "heater hose",
  "a/c line",
  "ac line",
  "hvac diagnosis",
  "a/c diagnosis",
];

/** MOTOR SystemID hints for keyword routing. */
const MOTOR_SYSTEM_INTENT: Array<{ motorSystemId: number; keywords: string[] }> = [
  { motorSystemId: 2, keywords: BRAKE_PRIORITY },
  { motorSystemId: 6, keywords: SUSPENSION_PRIORITY },
  { motorSystemId: 5, keywords: STEERING_PRIORITY },
  { motorSystemId: 4, keywords: HVAC_PRIORITY },
  { motorSystemId: 3, keywords: ["battery", "alternator", "starter", "sensor", "wiring", "headlight"] },
  { motorSystemId: 7, keywords: [...DRIVETRAIN_PRIORITY, "engine", "transmission", "clutch", "radiator", "exhaust", "fuel"] },
  { motorSystemId: 1, keywords: ["door", "hood", "fender", "glass", "windshield", "mirror"] },
];

function operationSearchText(name: string, queryKey?: string): string {
  return [name, queryKey ?? ""].filter(Boolean).join(" ");
}

function scoreSubcategory(text: string, sub: LaborSubcategory): number {
  let score = 0;
  for (const kw of sub.keywords) {
    if (keywordMatches(text, kw)) score += kw.includes(" ") ? 3 : 1;
  }
  return score;
}

function pickBestSubcategoryInSystem(
  motorSystemId: number,
  text: string,
): { category: LaborCategory; subcategory: LaborSubcategory } | undefined {
  const category = LABOR_CATEGORY_TREE.find((c) => c.motorSystemId === motorSystemId);
  if (!category) return undefined;

  let best: { subcategory: LaborSubcategory; score: number } | null = null;
  for (const subcategory of category.subcategories) {
    const score = scoreSubcategory(text, subcategory);
    if (score > 0 && (!best || score > best.score)) {
      best = { subcategory, score };
    }
  }
  return best ? { category, subcategory: best.subcategory } : undefined;
}

function toClassification(category: LaborCategory, subcategory: LaborSubcategory): OperationClassification {
  return {
    categoryId: category.id,
    subcategoryId: subcategory.id,
    breadcrumb: `${category.label} › ${subcategory.label}`,
  };
}

function fallbackSubcategory(): { category: LaborCategory; subcategory: LaborSubcategory } {
  const vehicle = laborCategoryById("motor-s-8")!;
  const sub =
    vehicle.subcategories.find((s) => s.motorSubGroupId === 332) ?? vehicle.subcategories[0]!;
  return { category: vehicle, subcategory: sub };
}

/** Classify an operation into MOTOR-aligned category + subcategory. */
export function classifyOperation(name: string, queryKey?: string): OperationClassification {
  const text = operationSearchText(name, queryKey);

  if (textMatchesKeywords(text, DRIVETRAIN_PRIORITY)) {
    const sub = pickBestSubcategoryInSystem(7, text);
    if (sub) return toClassification(sub.category, sub.subcategory);
  }
  if (textMatchesKeywords(text, WHEEL_BEARING_PRIORITY)) {
    const sub = pickBestSubcategoryInSystem(6, text) ?? pickBestSubcategoryInSystem(7, text);
    if (sub) return toClassification(sub.category, sub.subcategory);
  }
  if (textMatchesKeywords(text, SUSPENSION_PRIORITY)) {
    const sub = pickBestSubcategoryInSystem(6, text);
    if (sub) return toClassification(sub.category, sub.subcategory);
  }
  if (textMatchesKeywords(text, STEERING_PRIORITY)) {
    const sub = pickBestSubcategoryInSystem(5, text);
    if (sub) return toClassification(sub.category, sub.subcategory);
  }
  if (
    textMatchesKeywords(text, BRAKE_PRIORITY) ||
    (keywordMatches(text, "brake") && !textMatchesKeywords(text, SUSPENSION_PRIORITY))
  ) {
    const sub = pickBestSubcategoryInSystem(2, text);
    if (sub) return toClassification(sub.category, sub.subcategory);
  }
  if (
    textMatchesKeywords(text, HVAC_PRIORITY) ||
    keywordMatches(text, "hvac") ||
    (keywordMatches(text, "a/c") && !keywordMatches(text, "a/c filter"))
  ) {
    const sub = pickBestSubcategoryInSystem(4, text);
    if (sub) return toClassification(sub.category, sub.subcategory);
  }

  for (const intent of MOTOR_SYSTEM_INTENT) {
    if (textMatchesKeywords(text, intent.keywords)) {
      const sub = pickBestSubcategoryInSystem(intent.motorSystemId, text);
      if (sub) return toClassification(sub.category, sub.subcategory);
    }
  }

  let best: { category: LaborCategory; subcategory: LaborSubcategory; score: number } | null = null;
  for (const category of LABOR_CATEGORY_TREE) {
    for (const subcategory of category.subcategories) {
      const score = scoreSubcategory(text, subcategory);
      if (score > 0 && (!best || score > best.score)) {
        best = { category, subcategory, score };
      }
    }
  }

  if (best) return toClassification(best.category, best.subcategory);

  const fallback = fallbackSubcategory();
  return toClassification(fallback.category, fallback.subcategory);
}

/** True when text belongs to a subcategory (re-classifies on read). */
export function textMatchesSubcategory(text: string, subcategoryId: string): boolean {
  const resolved = resolveSubcategoryId(subcategoryId);
  const found = laborSubcategoryById(resolved);
  if (!found) return false;

  if (found.subcategory.motorSubGroupId === 332) {
    const cls = classifyOperation(text);
    return cls.subcategoryId === found.subcategory.id;
  }

  const cls = classifyOperation(text);
  if (cls.subcategoryId === resolved) return true;

  const textScore = scoreSubcategory(text, found.subcategory);
  if (textScore > 0) return true;

  return false;
}

/** @deprecated Use textMatchesSubcategory — kept for canned-job category label checks. */
export function textMatchesCategory(text: string, category: Pick<LaborCategory, "id">): boolean {
  const cls = classifyOperation(text);
  return cls.categoryId === category.id;
}

/** Filter labor guide hits to those classified under the given subcategory. */
export function matchOperationsToSubcategory<T extends { jobName: string; queryText?: string }>(
  subcategoryId: string,
  ops: T[],
): T[] {
  const resolved = resolveSubcategoryId(subcategoryId);
  return ops.filter((op) => {
    const text = [op.jobName, op.queryText ?? ""].join(" ");
    return textMatchesSubcategory(text, resolved);
  });
}

/** Enrich a hit with classification breadcrumb (re-classifies from operation name). */
export function enrichHitClassification<
  T extends { jobName: string; queryText?: string; categoryId?: string; subcategoryId?: string; categoryPath?: string },
>(hit: T, queryKey?: string): T {
  const cls = classifyOperation(hit.jobName, queryKey ?? hit.queryText);
  return {
    ...hit,
    categoryId: cls.categoryId,
    subcategoryId: cls.subcategoryId,
    categoryPath: cls.breadcrumb,
  };
}

/** MOTOR SubGroupID from a shop-library subcategory id, when aligned. */
export function motorSubGroupIdForSubcategory(subcategoryId: string): number | null {
  const resolved = resolveSubcategoryId(subcategoryId);
  if (!isMotorAlignedSubcategoryId(resolved)) {
    const found = laborSubcategoryById(resolved);
    return found?.subcategory.motorSubGroupId ?? null;
  }
  return motorSubGroupIdFromShopId(resolved);
}

/** Lookup flat MOTOR subcategory metadata by shop id. */
export function motorFlatSubcategoryById(subcategoryId: string) {
  const resolved = resolveSubcategoryId(subcategoryId);
  return MOTOR_FLAT_SUBCATEGORIES.find((s) => s.id === resolved);
}

/** Default shop-library chip subgroup ids (Civic 22124 reference). */
export const MOTOR_CHIP_SUBGROUP_IDS: Record<string, number> = {
  "front-brakes": 44,
  "rear-brakes": 44,
  "motor-sg-44": 44,
  "brakes-pads": 44,
};
