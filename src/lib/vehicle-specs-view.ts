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

/** True when decode/catalog identity fields exist (engine/trans/drive/body/VIN). */
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

/** Minimum identity for specs UI — YMM is enough; VIN is not required. */
export function vehicleHasYmm(view: VehicleSpecsView): boolean {
  return Boolean(view.year && view.make?.trim() && view.model?.trim());
}

/** Show Specs / Fluids entry when we have YMM or any richer decode fields. */
export function vehicleCanShowSpecsUi(view: VehicleSpecsView): boolean {
  return vehicleHasYmm(view) || vehicleHasSpecsData(view);
}

export type VehicleSpecsSourceKind = "decoded" | "catalog" | "entered" | "needs_engine";

/** Soft source chip for the identity strip (no VIN gate). */
export function vehicleSpecsSourceKind(view: VehicleSpecsView): VehicleSpecsSourceKind {
  if (view.vin && (view.engine || view.transmission || view.drivetrain || view.bodyClass)) {
    return "decoded";
  }
  if (view.engine && vehicleHasYmm(view)) return "catalog";
  if (vehicleHasYmm(view) && !view.engine) return "needs_engine";
  return "entered";
}

export function vehicleSpecsSourceLabel(kind: VehicleSpecsSourceKind): string {
  switch (kind) {
    case "decoded":
      return "Decoded";
    case "catalog":
      return "Catalog";
    case "needs_engine":
      return "Needs engine";
    default:
      return "Entered";
  }
}

export function vehicleYmmLabel(view: VehicleSpecsView): string {
  return [view.year, view.make, view.model, view.trim].filter(Boolean).join(" ");
}
