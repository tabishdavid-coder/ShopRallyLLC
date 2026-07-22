"use client";

import { EstimateRoAdjustments } from "@/components/repair-order/estimate-ro-adjustments";
import type { RepairOrderDetail } from "@/server/repair-order";

type Fee = RepairOrderDetail["fees"][number];
type FeeTemplate = {
  name: string;
  method: "PERCENT" | "FIXED";
  base: "LABOR" | "PARTS" | "LABOR_PARTS";
  amount: number;
  capCents?: number | null;
  taxable?: boolean;
};

/** Compact RO fees editor for the estimate workspace right rail. */
export function EstimateLabRightRailFees({
  roId,
  fees,
  feeTemplates = [],
  jobCount,
  canEdit,
}: {
  roId: string;
  fees: Fee[];
  feeTemplates?: FeeTemplate[];
  jobCount?: number;
  canEdit: boolean;
}) {
  return (
    <EstimateRoAdjustments
      roId={roId}
      fees={fees}
      discounts={[]}
      discountTemplates={[]}
      feeTemplates={feeTemplates}
      jobCount={jobCount}
      layout="right-rail"
      canEdit={canEdit}
    />
  );
}
