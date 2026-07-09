import type { VehicleMaintenanceMemoryView } from "@/lib/vehicle-maintenance-specs";
import type { VehicleSpecsView } from "@/lib/vehicle-specs-view";
import type { LastTireOrderSize } from "@/server/actions/vehicle-specs";

/** Serializable vehicle specs bundle for estimate lab client surfaces. */
export type EstimateLabVehicleSpecsBundle = {
  vehicleId: string;
  specs: VehicleSpecsView;
  tireSizeFront: string | null;
  tireSizeRear: string | null;
  lastTireOrder: LastTireOrderSize | null;
  maintenanceMemory: VehicleMaintenanceMemoryView;
};
