"use client";

import { CannedJobsPicker } from "@/components/repair-order/canned-jobs-picker";
import { RoAdjustmentToolbarButton } from "@/components/repair-order/ro-adjustment-toolbar-button";
import { SmartLaborGuide } from "@/components/repair-order/smart-labor-guide";
import { PartsHub, type HubPart } from "@/components/repair-order/parts-hub";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { usePartsTechUiEnabled } from "@/lib/shop-capabilities";

/** Estimate-only hero actions — build tools beside odometer / lifecycle. */
export function RoEstimateHeroToolbar({
  roId,
  canEdit,
  cannedJobs,
  cannedJobCategories,
  baseRateCents,
  partTiers,
  laborTiers,
  vehicleId,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
  jobs,
  parts,
}: {
  roId: string;
  canEdit: boolean;
  cannedJobs: CannedJobSummary[];
  cannedJobCategories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  vehicleId: string;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
  jobs: { id: string; name: string }[];
  parts: HubPart[];
}) {
  const partsTechOk = usePartsTechUiEnabled();
  if (!canEdit) return null;

  return (
    <div className="ro-hero-estimate-actions flex flex-wrap items-center gap-1.5">
      <CannedJobsPicker
        roId={roId}
        jobs={cannedJobs}
        categories={cannedJobCategories}
        baseRateCents={baseRateCents}
        partTiers={partTiers}
        laborTiers={laborTiers}
        variant="hero"
      />
      <RoAdjustmentToolbarButton kind="discount" roId={roId} variant="hero" />
      <RoAdjustmentToolbarButton kind="fee" roId={roId} variant="hero" />
      <SmartLaborGuide
        vehicleId={vehicleId}
        roId={roId}
        customerName={customerName}
        vehicleLabel={vehicleLabel}
        specLine={specLine}
        mileageIn={mileageIn}
        odometerNotWorking={odometerNotWorking}
        variant="hero"
      />
      {partsTechOk ? (
        <PartsHub
          roId={roId}
          jobs={jobs}
          vehicleLabel={vehicleLabel}
          specLine={specLine}
          partTiers={partTiers}
          parts={parts}
          variant="hero"
        />
      ) : null}
    </div>
  );
}
