import { z } from "zod";

/** Advisor overrides stored on Vehicle.maintenanceSpecs */
export const VehicleMaintenanceOverridesSchema = z.object({
  engineOil: z.string().trim().max(120).optional().nullable(),
  oilCapacity: z.string().trim().max(40).optional().nullable(),
  coolant: z.string().trim().max(80).optional().nullable(),
  oilFilter: z.string().trim().max(120).optional().nullable(),
  airFilter: z.string().trim().max(120).optional().nullable(),
  cabinFilter: z.string().trim().max(120).optional().nullable(),
  fuelFilter: z.string().trim().max(120).optional().nullable(),
  wiperFront: z.string().trim().max(40).optional().nullable(),
  wiperRear: z.string().trim().max(40).optional().nullable(),
  battery: z.string().trim().max(120).optional().nullable(),
});

export type VehicleMaintenanceOverrides = z.infer<typeof VehicleMaintenanceOverridesSchema>;

export type MaintenanceSpecSource = "manual" | "history";

export type MaintenanceSpecRow = {
  key: keyof VehicleMaintenanceOverrides;
  label: string;
  value: string | null;
  source: MaintenanceSpecSource | null;
  roNumber?: number;
  roDate?: string;
};

export type VehicleMaintenanceMemoryView = {
  fluids: MaintenanceSpecRow[];
  filters: MaintenanceSpecRow[];
  batteries: MaintenanceSpecRow[];
  overrides: VehicleMaintenanceOverrides;
  hasHistory: boolean;
};

const FLUID_KEYS: (keyof VehicleMaintenanceOverrides)[] = [
  "engineOil",
  "oilCapacity",
  "coolant",
];
const FILTER_KEYS: (keyof VehicleMaintenanceOverrides)[] = [
  "oilFilter",
  "airFilter",
  "cabinFilter",
  "fuelFilter",
  "wiperFront",
  "wiperRear",
];
const BATTERY_KEYS: (keyof VehicleMaintenanceOverrides)[] = ["battery"];

const LABELS: Record<keyof VehicleMaintenanceOverrides, string> = {
  engineOil: "Engine oil",
  oilCapacity: "Oil capacity",
  coolant: "Coolant",
  oilFilter: "Oil filter",
  airFilter: "Air filter",
  cabinFilter: "Cabin filter",
  fuelFilter: "Fuel filter",
  wiperFront: "Wiper (front)",
  wiperRear: "Wiper (rear)",
  battery: "Battery",
};

export type MaintenancePartCategory = keyof VehicleMaintenanceOverrides;

type HistoryHit = {
  key: MaintenancePartCategory;
  value: string;
  roNumber: number;
  roDate: string;
};

export function parseMaintenanceOverrides(raw: unknown): VehicleMaintenanceOverrides {
  const parsed = VehicleMaintenanceOverridesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : {};
}

function formatPartValue(opts: {
  description: string;
  partNumber?: string | null;
  brand?: string | null;
  quantity?: number;
}): string {
  const parts = [
    opts.brand?.trim(),
    opts.description.trim(),
    opts.partNumber?.trim() ? `#${opts.partNumber.trim()}` : null,
    opts.quantity && opts.quantity > 1 ? `×${opts.quantity}` : null,
  ].filter(Boolean);
  return parts.join(" ");
}

/** Classify a part line or job context into a maintenance spec bucket. */
export function classifyMaintenanceText(text: string): MaintenancePartCategory | null {
  const t = text.toLowerCase();

  if (/\boil\s*filter\b/.test(t)) return "oilFilter";
  if (/\b(cabin\s*air\s*filter|hvac\s*filter|a\/c\s*filter|cabin\s*filter)\b/.test(t)) {
    return "cabinFilter";
  }
  if (/\b(engine\s*)?air\s*filter\b/.test(t) && !/\bcabin\b/.test(t)) return "airFilter";
  if (/\bfuel\s*filter\b/.test(t)) return "fuelFilter";
  if (/\b(group\s*\d+|\d+\s*cca|battery)\b/.test(t) && /\b(battery|group|cca)\b/.test(t)) {
    return "battery";
  }
  if (/\bwiper\b/.test(t)) {
    if (/\brear\b/.test(t)) return "wiperRear";
    return "wiperFront";
  }
  if (/\b(coolant|antifreeze)\b/.test(t)) return "coolant";
  if (/\b(\d+\.?\d*\s*(qt|quart|l|liter|gal|gallon)|\d+w-\d+|motor\s*oil|engine\s*oil|synthetic)\b/.test(t)) {
    return "engineOil";
  }
  if (/\b(capacity|oil\s*cap)\b/.test(t) && /\b(qt|quart|l|liter)\b/.test(t)) return "oilCapacity";

  return null;
}

export function classifyPartLine(part: {
  description: string;
  partNumber?: string | null;
  brand?: string | null;
  quantity?: number;
  jobName?: string | null;
}): MaintenancePartCategory | null {
  const blob = [part.description, part.partNumber, part.brand, part.jobName]
    .filter(Boolean)
    .join(" ");
  return classifyMaintenanceText(blob);
}

/** Pick the most recent RO hit per category from shop history. */
export function buildHistoryHits(
  ros: Array<{
    number: number;
    updatedAt: Date;
    jobs: Array<{
      name: string;
      partLines: Array<{
        description: string;
        partNumber: string | null;
        brand: string | null;
        quantity: number;
      }>;
    }>;
  }>,
): Map<MaintenancePartCategory, HistoryHit> {
  const hits = new Map<MaintenancePartCategory, HistoryHit>();

  for (const ro of ros) {
    for (const job of ro.jobs) {
      for (const part of job.partLines) {
        const key = classifyPartLine({
          description: part.description,
          partNumber: part.partNumber,
          brand: part.brand,
          quantity: part.quantity,
          jobName: job.name,
        });
        if (!key || hits.has(key)) continue;

        hits.set(key, {
          key,
          value: formatPartValue(part),
          roNumber: ro.number,
          roDate: ro.updatedAt.toISOString(),
        });
      }
    }
  }

  return hits;
}

function rowForKey(
  key: keyof VehicleMaintenanceOverrides,
  overrides: VehicleMaintenanceOverrides,
  history: Map<MaintenancePartCategory, HistoryHit>,
): MaintenanceSpecRow {
  const manual = overrides[key]?.trim() || null;
  if (manual) {
    return { key, label: LABELS[key], value: manual, source: "manual" };
  }

  const hit = history.get(key);
  if (hit) {
    return {
      key,
      label: LABELS[key],
      value: hit.value,
      source: "history",
      roNumber: hit.roNumber,
      roDate: hit.roDate,
    };
  }

  return { key, label: LABELS[key], value: null, source: null };
}

export function buildMaintenanceMemoryView(
  overrides: VehicleMaintenanceOverrides,
  history: Map<MaintenancePartCategory, HistoryHit>,
): VehicleMaintenanceMemoryView {
  return {
    fluids: FLUID_KEYS.map((key) => rowForKey(key, overrides, history)),
    filters: FILTER_KEYS.map((key) => rowForKey(key, overrides, history)),
    batteries: BATTERY_KEYS.map((key) => rowForKey(key, overrides, history)),
    overrides,
    hasHistory: history.size > 0,
  };
}

export function maintenanceSectionHasData(rows: MaintenanceSpecRow[]): boolean {
  return rows.some((r) => Boolean(r.value));
}
