"use client";

import { RoVehicleSpecsPanel } from "@/components/repair-order/ro-vehicle-specs-panel";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";

/** Full vehicle specs accordions for the estimate right rail. */
export function EstimateLabVehicleSpecsSection({
  data,
  canEdit,
}: {
  data: EstimateLabVehicleSpecsBundle;
  canEdit: boolean;
}) {
  return (
    <RoVehicleSpecsPanel
      vehicleId={data.vehicleId}
      specs={data.specs}
      tireSizeFront={data.tireSizeFront}
      tireSizeRear={data.tireSizeRear}
      lastTireOrder={data.lastTireOrder}
      maintenanceMemory={data.maintenanceMemory}
      canEdit={canEdit}
      lightTheme
      embedded
    />
  );
}
