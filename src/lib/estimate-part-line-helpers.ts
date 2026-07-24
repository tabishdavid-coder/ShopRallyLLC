import { applyPartMatrixRow } from "@/lib/line-calc";
import type { PartTier } from "@/lib/matrix";
import type { EstimatePartLineTypeUi } from "@/lib/part-line-types";
import type { TireStockRow } from "@/server/tire-stock";

export type EstimatePartRowDraft = {
  id?: string;
  brand: string;
  description: string;
  details?: string;
  partNumber: string;
  quantity: number;
  costCents: number;
  retailCents: number;
  discountCents?: number;
  totalCents?: number;
  lastField?: "qty" | "cost" | "retail" | "total";
  usePartMatrix?: boolean;
  source?: string;
  authorized?: boolean;
  taxable?: boolean;
  sortOrder?: number;
  lineType?: EstimatePartLineTypeUi;
  inventoryPartId?: string | null;
  tireStockId?: string | null;
};

export function emptyEstimatePartRow(
  lineType: EstimatePartLineTypeUi = "part",
  taxable = true,
): EstimatePartRowDraft {
  return {
    brand: "",
    description: "",
    partNumber: "",
    quantity: lineType === "tire" ? 4 : 1,
    costCents: 0,
    retailCents: 0,
    discountCents: 0,
    taxable,
    lineType,
    inventoryPartId: null,
    tireStockId: null,
  };
}

/** Populate an estimate part row from a tire stock SKU (same defaults as canned jobs). */
export function estimatePartRowFromTireStock(
  tire: TireStockRow,
  partTiers: PartTier[],
  taxable = true,
): EstimatePartRowDraft {
  const base: EstimatePartRowDraft = {
    ...emptyEstimatePartRow("tire", taxable),
    brand: tire.brand,
    description: `${tire.brand} ${tire.model}`.trim(),
    partNumber: tire.stockNumber,
    costCents: tire.costCents,
    quantity: 4,
    tireStockId: tire.id,
  };
  if (partTiers.length > 0) {
    return { ...applyPartMatrixRow({ ...base, usePartMatrix: true }, partTiers), lineType: "tire" };
  }
  return base;
}

export function isManualTireRow(row: Pick<EstimatePartRowDraft, "lineType" | "tireStockId">): boolean {
  return row.lineType === "tire" && !row.tireStockId;
}
