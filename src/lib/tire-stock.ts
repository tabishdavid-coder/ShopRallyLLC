import type { TireCondition } from "@/generated/prisma";

export const TIRE_CONDITIONS: TireCondition[] = ["NEW", "USED"];

export const TIRE_CONDITION_LABELS: Record<TireCondition, string> = {
  NEW: "New",
  USED: "Used",
};

export const TIRE_CONDITION_COLORS: Record<TireCondition, string> = {
  NEW: "bg-brand-navy/10 text-brand-navy",
  USED: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
};

/** CSV template + import column headers (order matters). */
export const TIRE_STOCK_CSV_HEADERS = [
  "stockNumber",
  "brand",
  "model",
  "size",
  "loadSpeed",
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
