type PrintVehicle = {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  vin?: string | null;
  plate?: string | null;
  plateState?: string | null;
};

export function formatPrintVehicleLabel(vehicle: PrintVehicle | null | undefined): string {
  if (!vehicle) return "Vehicle";

  const ymm = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean)
    .join(" ");

  if (ymm) return ymm;

  const plate = [vehicle.plate, vehicle.plateState].filter(Boolean).join(" ");
  if (plate) return plate;

  if (vehicle.vin) return vehicle.vin;

  return "Vehicle";
}
