"use client";

import { EstimateTotalsBar } from "@/components/repair-order/estimate-totals-bar";
import { useEstimateSelection } from "@/components/repair-order/estimate-selection-context";

export function EstimateLiveTotalsBar({
  roId,
  roNumber,
  customerName,
  phone,
  approvable,
  gpGoalCents,
  beforeApproveAction,
}: {
  roId: string;
  roNumber: number;
  customerName: string;
  phone: string | null;
  approvable: boolean;
  gpGoalCents?: number | null;
  beforeApproveAction?: React.ReactNode;
}) {
  const { totals } = useEstimateSelection();

  return (
    <EstimateTotalsBar
      roId={roId}
      roNumber={roNumber}
      customerName={customerName}
      phone={phone}
      approvable={approvable}
      gpPct={totals.gpPct}
      gpCents={totals.gpCents}
      laborCents={totals.laborCents}
      partsCents={totals.partsCents}
      partsCount={totals.partsCount}
      subletCents={0}
      feesCents={totals.feesCents}
      discountsCents={totals.discountsCents}
      subtotalCents={totals.subtotalCents}
      taxesCents={totals.taxesCents}
      gpGoalCents={gpGoalCents}
      totalCents={totals.totalCents}
      beforeApproveAction={beforeApproveAction}
    />
  );
}
