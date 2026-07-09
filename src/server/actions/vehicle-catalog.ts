"use server";

import type { VehicleEngineOption, VehicleEpaDetails } from "@/lib/vehicle-catalog-types";
import {
  fetchEngines,
  fetchMakes,
  fetchModels,
  fetchTrims,
  fetchVehicleDetails,
} from "@/server/services/vehicle-catalog";

/** Passenger-car makes for the Add-Vehicle drill-down. */
export async function getCarMakes(): Promise<string[]> {
  return fetchMakes();
}

/** Models for a make + year (empty if either is missing). */
export async function getCarModels(make: string, year: number): Promise<string[]> {
  if (!make || !Number.isFinite(year)) return [];
  return fetchModels(make, year);
}

/** Trim variants for make + year + model (EPA, year-scoped). */
export async function getCarTrims(make: string, year: number, model: string): Promise<string[]> {
  if (!make || !Number.isFinite(year) || !model) return [];
  return fetchTrims(make, year, model);
}

/** Engine options for make + year + trim (EPA trim model name). */
export async function getCarEngines(
  make: string,
  year: number,
  trim: string,
): Promise<VehicleEngineOption[]> {
  if (!make || !Number.isFinite(year) || !trim) return [];
  return fetchEngines(make, year, trim);
}

/** EPA trim specs (transmission, drivetrain, body class) for a selected engine option. */
export async function getEpaVehicleDetails(vehicleId: string): Promise<VehicleEpaDetails | null> {
  if (!vehicleId?.trim()) return null;
  return fetchVehicleDetails(vehicleId);
}
