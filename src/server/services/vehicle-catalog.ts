import "server-only";

import { CAR_MAKES } from "@/lib/vehicle-makes";
import type { VehicleEngineOption, VehicleEpaDetails } from "@/lib/vehicle-catalog-types";

/**
 * Vehicle Year/Make/Model/Trim/Engine catalog for the Add-Vehicle "Select
 * Vehicle" drill-down. Makes are a BUNDLED static list (instant, immune to
 * NHTSA rate limits). Models are fetched per make+year from the free NHTSA
 * vPIC API (year-scoped). Trims + engines come from the free EPA Fuel Economy
 * API, filtered to the selected NHTSA model. The UI falls back to free-text
 * entry when a provider is unavailable.
 */

const NHTSA = "https://vpic.nhtsa.dot.gov/api/vehicles";
const EPA = "https://fueleconomy.gov/ws/rest/vehicle/menu";
const UA = "ShopRally/1.0 (+https://getshoprally.com)";

// Vehicle types that a repair shop services — everything except motorcycles,
// buses, trailers, etc. NHTSA files SUVs/minivans under "mpv" and pickups under
// "truck", so we merge all three to get the real car/SUV/truck/van lineup.
const SHOP_TYPES = ["car", "truck", "mpv"] as const;

const modelsCache = new Map<string, string[]>();
const trimsCache = new Map<string, string[]>();
const enginesCache = new Map<string, VehicleEngineOption[]>();
const vehicleDetailsCache = new Map<string, VehicleEpaDetails>();

/** Bundled passenger-car makes (US-market). */
export async function fetchMakes(): Promise<string[]> {
  return CAR_MAKES;
}

/** One NHTSA models-by-type call (year-accurate), with a single retry. */
async function modelsByType(make: string, year: number, type: string): Promise<string[]> {
  const url = `${NHTSA}/GetModelsForMakeYear/make/${encodeURIComponent(make)}/modelyear/${year}/vehicleType/${type}?format=json`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { Results?: { Model_Name?: string }[] };
      return (json.Results ?? []).map((r) => (r.Model_Name ?? "").trim()).filter(Boolean);
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return [];
}

/**
 * Year-accurate models for a make (cars/SUVs/trucks/vans, no motorcycles),
 * de-duped + sorted. Empty if NHTSA is unavailable — the UI then falls back to
 * free-text model entry.
 */
export async function fetchModels(make: string, year: number): Promise<string[]> {
  const key = `${make.toLowerCase()}|${year}`;
  const hit = modelsCache.get(key);
  if (hit) return hit;
  const lists = await Promise.all(SHOP_TYPES.map((t) => modelsByType(make, year, t)));
  const models = [...new Set(lists.flat())].sort((a, b) => a.localeCompare(b));
  if (models.length) modelsCache.set(key, models); // don't cache transient failures
  return models;
}

function normalizeModelKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** EPA model names that correspond to a NHTSA base model for the same year+make. */
function filterEpaModelsForBase(epaModels: string[], baseModel: string): string[] {
  const base = normalizeModelKey(baseModel);
  if (!base) return [];
  return epaModels.filter((m) => {
    const norm = normalizeModelKey(m);
    return norm === base || norm.startsWith(base);
  });
}

type EpaMenu = { menuItem?: { text?: string; value?: string }[] };

async function epaMenu(path: string): Promise<{ text: string; value: string }[]> {
  const url = `${EPA}/${path}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as EpaMenu | null;
      if (!json || !json.menuItem) return [];
      return json.menuItem
        .map((r) => ({ text: (r.text ?? r.value ?? "").trim(), value: (r.value ?? r.text ?? "").trim() }))
        .filter((r) => r.text && r.value);
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return [];
}

/**
 * Year-scoped trim variants for a make+model. EPA encodes many trims as
 * distinct "models" (e.g. "Accord Hybrid", "F150 Pickup 4WD Limited"); we
 * filter those to the selected NHTSA base model.
 */
export async function fetchTrims(make: string, year: number, model: string): Promise<string[]> {
  if (!make || !Number.isFinite(year) || !model) return [];
  const key = `${make.toLowerCase()}|${year}|${model.toLowerCase()}`;
  const hit = trimsCache.get(key);
  if (hit) return hit;
  const epaModels = await epaMenu(`model?year=${year}&make=${encodeURIComponent(make)}`);
  const trims = filterEpaModelsForBase(
    epaModels.map((m) => m.text),
    model,
  ).sort((a, b) => a.localeCompare(b));
  if (trims.length) trimsCache.set(key, trims);
  return trims;
}

/**
 * Engine / powertrain options for a year+make+trim (EPA model name).
 * Labels are human-readable strings like "Auto (S10), 6 cyl, 3.5 L, Turbo".
 */
export async function fetchEngines(
  make: string,
  year: number,
  trim: string,
): Promise<VehicleEngineOption[]> {
  if (!make || !Number.isFinite(year) || !trim) return [];
  const key = `${make.toLowerCase()}|${year}|${trim.toLowerCase()}`;
  const hit = enginesCache.get(key);
  if (hit) return hit;
  const options = await epaMenu(
    `options?year=${year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(trim)}`,
  );
  const engines = options
    .map((o) => ({ label: o.text, value: o.text, vehicleId: o.value }))
    .sort((a, b) => a.label.localeCompare(b.label));
  if (engines.length) enginesCache.set(key, engines);
  return engines;
}

type EpaVehicle = {
  model?: string;
  displ?: string;
  cylinders?: string;
  trany?: string;
  drive?: string;
  VClass?: string;
};

function formatEpaEngine(displ?: string, cylinders?: string): string | null {
  const parts: string[] = [];
  if (displ?.trim()) parts.push(`${displ.trim()}L`);
  if (cylinders?.trim()) parts.push(`${cylinders.trim()}-cyl`);
  return parts.length ? parts.join(" ") : null;
}

/** Full trim specs from an EPA vehicle record id (engine option value). */
export async function fetchVehicleDetails(vehicleId: string): Promise<VehicleEpaDetails | null> {
  const id = vehicleId.trim();
  if (!id) return null;
  const hit = vehicleDetailsCache.get(id);
  if (hit) return hit;

  const url = `https://fueleconomy.gov/ws/rest/vehicle/${encodeURIComponent(id)}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": UA, Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const v = (await res.json()) as EpaVehicle | null;
      if (!v) return null;
      const details: VehicleEpaDetails = {
        trim: (v.model ?? "").trim() || null,
        engine: formatEpaEngine(v.displ, v.cylinders),
        transmission: (v.trany ?? "").trim() || null,
        drivetrain: (v.drive ?? "").trim() || null,
        bodyClass: (v.VClass ?? "").trim() || null,
      };
      vehicleDetailsCache.set(id, details);
      return details;
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}
