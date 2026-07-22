"use client";

import { EstimateAdjustments } from "@/components/repair-order/estimate-adjustments";
import { useEstimateSelection } from "@/components/repair-order/estimate-selection-context";
import type { RepairOrderDetail } from "@/server/repair-order";

type Fee = RepairOrderDetail["fees"][number];
type Discount = RepairOrderDetail["discounts"][number];
type DiscountTemplate = { name: string; method: "PERCENT" | "FIXED"; base: "LABOR" | "PARTS" | "LABOR_PARTS"; amount: number };

/** RO-level fees/discounts using live authorized labor/parts from selection context. */
export function EstimateRoAdjustments({
  roId,
  fees,
  discounts,
  discountTemplates,
  feeTemplates = [],
  jobCount,
  layout = "estimate-ro",
  canEdit = true,
}: {
  roId: string;
  fees: Fee[];
  discounts: Discount[];
  discountTemplates: DiscountTemplate[];
  feeTemplates?: DiscountTemplate[];
  jobCount?: number;
  layout?: "estimate-ro" | "right-rail";
  canEdit?: boolean;
}) {
  const { totals } = useEstimateSelection();

  return (
    <EstimateAdjustments
      roId={roId}
      fees={fees}
      discounts={discounts}
      laborCents={totals.laborCents}
      partsCents={totals.partsCents}
      discountTemplates={discountTemplates}
      feeTemplates={feeTemplates}
      layout={layout}
      jobCount={jobCount}
      canEdit={canEdit}
    />
  );
}
