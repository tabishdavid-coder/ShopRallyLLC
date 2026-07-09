"use client";

import { RoVehicleSpecsPanel } from "@/components/repair-order/ro-vehicle-specs-panel";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";

/** Vehicle Specs (+ recalls) for the estimate right rail. */
export function EstimateLabVehicleSpecsSection({
  data,
  canEdit: _canEdit,
}: {
  data: EstimateLabVehicleSpecsBundle;
  canEdit?: boolean;
}) {
  return (
    <RoVehicleSpecsPanel
      vehicleId={data.vehicleId}
      specs={data.specs}
      lightTheme
      embedded
    />
  );
}
