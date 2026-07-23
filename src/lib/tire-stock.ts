import type { TireCondition, TireSeasonality } from "@/generated/prisma";

export const TIRE_CONDITIONS: TireCondition[] = ["NEW", "USED"];

export const TIRE_CONDITION_LABELS: Record<TireCondition, string> = {
  NEW: "New",
  USED: "Used",
};

export const TIRE_CONDITION_COLORS: Record<TireCondition, string> = {
  NEW: "bg-brand-navy/10 text-brand-navy",
  USED: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

export const TIRE_SEASONALITIES: TireSeasonality[] = [
  "SUMMER",
  "WINTER",
  "ALL_SEASON",
  "ALL_WEATHER",
];

export const TIRE_SEASONALITY_LABELS: Record<TireSeasonality, string> = {
  SUMMER: "Summer",
  WINTER: "Winter",
  ALL_SEASON: "All seasons",
  ALL_WEATHER: "All weather",
};

export const TIRE_SEASONALITY_SHORT: Record<TireSeasonality, string> = {
  SUMMER: "Summer",
  WINTER: "Winter",
  ALL_SEASON: "All-season",
  ALL_WEATHER: "All-weather",
};

export const TIRE_SEASONALITY_COLORS: Record<TireSeasonality, string> = {
  SUMMER: "bg-amber-100 text-amber-900",
  WINTER: "bg-sky-100 text-sky-900",
  ALL_SEASON: "bg-brand-navy/10 text-brand-navy",
  ALL_WEATHER: "bg-brand-light/40 text-brand-navy",
};

const SIZE_PATTERN = /^(\d{2,3})\/(\d{2,3})R(\d{2})$/i;

export function composeTireSize(width: number, aspectRatio: number, rimDiameter: number): string {
  return `${width}/${aspectRatio}R${rimDiameter}`;
}

export function parseTireSize(size: string): {
  width: number;
  aspectRatio: number;
  rimDiameter: number;
} | null {
  const m = size.trim().match(SIZE_PATTERN);
  if (!m) return null;
  return {
    width: parseInt(m[1]!, 10),
    aspectRatio: parseInt(m[2]!, 10),
    rimDiameter: parseInt(m[3]!, 10),
  };
}

/** CSV template + import column headers (order matters). */
export const TIRE_STOCK_CSV_HEADERS = [
  "stockNumber",
  "brand",
  "model",
  "size",
  "width",
  "aspectRatio",
  "rimDiameter",
  "loadSpeed",
  "seasonality",
  "condition",
  "quantityOnHand",
  "reorderPoint",
  "reorderQty",
  "cost",
  "retail",
  "binLocation",
  "dotCode",
  "treadDepth32nds",
  "notes",
] as const;

export type TireStockCsvHeader = (typeof TIRE_STOCK_CSV_HEADERS)[number];

export function tireStockLabel(row: {
  brand: string;
  model: string;
  size: string;
  loadSpeed?: string | null;
}): string {
  const load = row.loadSpeed?.trim();
  return load ? `${row.brand} ${row.model} ${row.size} ${load}` : `${row.brand} ${row.model} ${row.size}`;
}
