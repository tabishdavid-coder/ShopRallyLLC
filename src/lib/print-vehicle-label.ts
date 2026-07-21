import { formatVehicleDisplayLabel, type VehicleDisplayInput } from "@/lib/vehicle-display";

type PrintVehicle = VehicleDisplayInput & {
  vin?: string | null;
  plate?: string | null;
  plateState?: string | null;
};

export function formatPrintVehicleLabel(vehicle: PrintVehicle | null | undefined): string {
  if (!vehicle) return "Vehicle";

  const label = formatVehicleDisplayLabel(vehicle, { includeEngine: false });
  if (label !== "Vehicle") return label;

  const plate = [vehicle.plate, vehicle.plateState].filter(Boolean).join(" ");
  if (plate) return plate;

  if (vehicle.vin) return vehicle.vin;

  return "Vehicle";
}
