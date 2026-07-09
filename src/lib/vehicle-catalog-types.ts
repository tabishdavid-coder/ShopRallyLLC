export type VehicleEngineOption = { label: string; value: string; vehicleId: string };

export type VehicleEpaDetails = {
  trim: string | null;
  engine: string | null;
  transmission: string | null;
  drivetrain: string | null;
  bodyClass: string | null;
};
