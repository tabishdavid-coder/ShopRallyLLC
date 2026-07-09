import type { LaborGuideHit, LaborGuideSource, LaborVariant } from "@/lib/labor-guide-types";
import { expandOperationVariants } from "@/lib/labor-guide-variants";
import { sourceBadgeLabel } from "@/lib/labor-guide-helpers";
import { laborSubcategoryById } from "@/lib/labor-categories";
import { SHOP_LIBRARY_CHIPS } from "@/lib/shop-library-chip-paths";

export type PositionFilter = "all" | "front" | "rear";

export type LaborGridRow = {
  id: string;
  hit: LaborGuideHit;
  variant: LaborVariant;
  name: string;
  position: string | null;
  hours: number;
  system: string | null;
  includes?: string;
  source: LaborGuideSource;
  sourceLabel: string;
  isMock?: boolean;
};

/** Popular quick-picks for empty landing — from shop library chips. */
export const LABOR_BOOK_POPULAR = SHOP_LIBRARY_CHIPS.map((chip) => ({
  label: chip.label,
  query: chip.query,
  browsePath: chip.browsePath,
}));

export function scopeLabelForSelection(
  categoryId: string | null,
  subcategoryId: string | null,
  isSearchActive: boolean,
): string {
  if (isSearchActive) return "All systems (search)";
  if (!categoryId || !subcategoryId) return "All systems";
  const found = laborSubcategoryById(subcategoryId);
  if (!found) return "All systems";
  return `${found.category.label} › ${found.subcategory.label}`;
}

export function qualifierForSubcategory(subcategoryId: string | null | undefined): string | null {
  if (subcategoryId === "brakes-pads") return "Disc · 4-Wheel ABS";
  if (subcategoryId === "suspension-struts") return "MacPherson strut · FWD";
  if (subcategoryId === "hvac-heater-core") return "With Air Conditioning · from VIN/trim";
  return null;
}

export function qualifierVariantLabel(variant: "with-ac" | "without-ac"): string {
  return variant === "with-ac" ? "With Air Conditioning" : "Without Air Conditioning";
}

function variantMatchesPositionFilter(
  variant: LaborVariant,
  filter: PositionFilter,
): boolean {
  if (filter === "all") return true;
  const pos = (variant.position ?? variant.label).toLowerCase();
  if (filter === "front") {
    return pos.includes("front") || pos.includes("both") || pos.includes("all four");
  }
  if (filter === "rear") {
    return pos.includes("rear") || pos.includes("both") || pos.includes("all four");
  }
  return true;
}

/** Collapse identical op+position+hours rows from multi-hit browse (e.g. generic + axle-specific cache). */
function dedupeGridRows(rows: LaborGridRow[]): LaborGridRow[] {
  const seen = new Set<string>();
  const out: LaborGridRow[] = [];
  for (const row of rows) {
    const key = `${row.name.toLowerCase()}|${(row.position ?? "").toLowerCase()}|${row.hours}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Flatten guide hits into scannable grid rows (one row per variant). */
export function hitsToGridRows(
  hits: LaborGuideHit[],
  positionFilter: PositionFilter = "all",
): LaborGridRow[] {
  const rows: LaborGridRow[] = [];
  for (const hit of hits) {
    const variants = expandOperationVariants(hit);
    for (const variant of variants) {
      if (!variantMatchesPositionFilter(variant, positionFilter)) continue;
      const position =
        variant.position ?? (variant.label !== hit.jobName ? variant.label : null);
      // Prefer expand() label when it already encodes position/scope; otherwise
      // append position so Jobs rows read like MOTOR apps ("… — Front").
      const displayName =
        position && !variant.label.toLowerCase().includes(position.toLowerCase())
          ? `${hit.jobName} — ${position}`
          : position && variant.label !== hit.jobName
            ? `${hit.jobName} — ${variant.label}`
            : hit.jobName;
      const labeledVariant: LaborVariant =
        position && !variant.position
          ? { ...variant, position }
          : position && variant.label === position
            ? { ...variant, label: `${hit.jobName} — ${position}` }
            : variant;
      rows.push({
        id: variant.id,
        hit,
        variant: labeledVariant,
        name: displayName,
        position,
        hours: variant.hours,
        system: hit.categoryPath?.split(" › ")[0] ?? hit.category ?? null,
        includes: hit.notes,
        source: hit.source,
        sourceLabel: sourceBadgeLabel(hit.source, hit.dataSource),
      });
    }
  }
  return dedupeGridRows(rows);
}

/** Mock row shape for cache-empty fallback (matches dev prototype). */
export type MockGridRow = {
  id: string;
  name: string;
  hours: number;
  position?: string;
  skill?: string;
  includes?: string;
  variant?: "with-ac" | "without-ac";
};

export function mockRowsToGridRows(
  mockRows: MockGridRow[],
  subcategoryId?: string | null,
): LaborGridRow[] {
  return mockRows.map((row) => {
    const hit: LaborGuideHit = {
      id: `mock-${row.id}`,
      jobName: row.name,
      totalHours: row.hours,
      laborOperations: row.includes ? [row.includes] : [],
      notes: row.includes,
      source: "cached",
    };
    const variant: LaborVariant = {
      id: `mock-${row.id}:v`,
      label: row.position ?? row.name,
      position: row.position,
      hours: row.hours,
      quantityDefault: 1,
    };
    return {
      id: variant.id,
      hit,
      variant,
      name: row.name,
      position: row.position ?? null,
      hours: row.hours,
      system: subcategoryId ? laborSubcategoryById(subcategoryId)?.category.label ?? null : null,
      includes: row.includes,
      source: "cached" as const,
      sourceLabel: "Cache",
      isMock: true,
    };
  });
}
