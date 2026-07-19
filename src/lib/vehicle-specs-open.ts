/** Cross-tree Specs open — hero bar is outside EstimateLabContextDrawerProvider. */

export const VEHICLE_SPECS_OPEN_EVENT = "shoprally:open-vehicle-specs";

export function requestOpenVehicleSpecs(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(VEHICLE_SPECS_OPEN_EVENT));
}
