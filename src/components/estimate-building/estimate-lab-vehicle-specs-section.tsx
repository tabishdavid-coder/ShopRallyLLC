"use client";

import { VehicleSpecsReferenceBody } from "@/components/estimate-building/vehicle-specs-reference";
import type { EstimateLabVehicleSpecsBundle } from "@/lib/estimate-lab-vehicle-specs";

/** Vehicle Specs for the estimate right rail / drawer (stacked identity + Fluids). */
export function EstimateLabVehicleSpecsSection({
  data,
  canEdit: _canEdit,
  layout = "rail",
  showTitle = false,
}: {
  data: EstimateLabVehicleSpecsBundle;
  canEdit?: boolean;
  layout?: "rail" | "dialog";
  /** When false, parent supplies the section title (e.g. rail card chrome). */
  showTitle?: boolean;
}) {
  return (
    <div className="px-3.5 py-2.5">
      {showTitle ? (
        <div className="mb-2 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--jb-ink,#0b1f3b)]">
          Vehicle specs
        </div>
      ) : null}
      <VehicleSpecsReferenceBody data={data} layout={layout} />
    </div>
  );
}
