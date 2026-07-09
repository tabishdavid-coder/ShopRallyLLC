import { extractEngineDetails, engineDetailRows } from "@/lib/engine-details";

export type VehicleSpecsView = {
  vin: string | null;
  engine: string | null;
  engineDetails: ReturnType<typeof extractEngineDetails>;
  engineRows: { label: string; value: string }[];
  transmission: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
};

/** Build decoded-style specs from a stored vehicle record (no API call). */
export function vehicleSpecsView(vehicle: {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  bodyClass?: string | null;
  decodedData?: unknown;
}): VehicleSpecsView {
  const engineDetails = extractEngineDetails({
    engine: vehicle.engine ?? null,
    raw: vehicle.decodedData,
  });
  const engineRows = engineDetailRows(engineDetails, vehicle.engine ?? null);

  return {
    vin: vehicle.vin ?? null,
    engine: vehicle.engine ?? null,
    engineDetails,
    engineRows,
    transmission: vehicle.transmission ?? null,
    drivetrain: vehicle.drivetrain ?? null,
    bodyClass: vehicle.bodyClass ?? null,
    year: vehicle.year ?? null,
    make: vehicle.make ?? null,
    model: vehicle.model ?? null,
    trim: vehicle.trim ?? null,
  };
}

export function vehicleHasSpecsData(view: VehicleSpecsView): boolean {
  return Boolean(
    view.engine ||
      view.engineRows.length ||
      view.transmission ||
      view.drivetrain ||
      view.bodyClass ||
      view.vin,
  );
}
