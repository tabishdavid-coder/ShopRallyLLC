import { z } from "zod";

import type { MaintenancePartCategory } from "@/lib/vehicle-maintenance-specs";

/**
 * Minimum confidence (0–1) before we persist or display an AI fluid value.
 * Raised after OEM-catalog comparisons showed LLM “verified” values were often wrong
 * (e.g. R-134a vs R-1234yf, VW 502.00 vs 508.00). Prefer empty over wrong.
 */
export const FLUIDS_ENRICH_CONFIDENCE_MIN = 0.88;

/** Bump to invalidate cached AI fluids after prompt / gate changes. */
export const FLUIDS_ENRICH_SCHEMA_VERSION = "v2";

/** Stored under Vehicle.maintenanceSpecs._fluidsEnrich (not advisor-editable fields). */
export const FLUIDS_ENRICH_META_KEY = "_fluidsEnrich" as const;

/** Fluid slots enriched on Specs open — maps to maintenanceSpecs override keys. */
export const FLUID_ENRICH_SLOT_KEYS = [
  "engineOil",
  "oilCapacity",
  "coolant",
  "transmissionFluid",
  "brakeFluid",
  "acRefrigerant",
  "battery",
] as const satisfies readonly MaintenancePartCategory[];

export type FluidEnrichSlotKey = (typeof FLUID_ENRICH_SLOT_KEYS)[number];

export const FluidEnrichFieldSchema = z.object({
  value: z.string().trim().min(1).max(200).nullable(),
  confidence: z.number().min(0).max(1),
  sourceNote: z.string().trim().max(240).nullable(),
});

export type FluidEnrichField = z.infer<typeof FluidEnrichFieldSchema>;

export const FluidsEnrichAiResponseSchema = z.object({
  engineOil: FluidEnrichFieldSchema.nullable().optional(),
  oilCapacity: FluidEnrichFieldSchema.nullable().optional(),
  coolant: FluidEnrichFieldSchema.nullable().optional(),
  transmissionFluid: FluidEnrichFieldSchema.nullable().optional(),
  brakeFluid: FluidEnrichFieldSchema.nullable().optional(),
  acRefrigerant: FluidEnrichFieldSchema.nullable().optional(),
  battery: FluidEnrichFieldSchema.nullable().optional(),
});

export type FluidsEnrichAiResponse = z.infer<typeof FluidsEnrichAiResponseSchema>;

export type FluidsEnrichFieldMeta = {
  confidence: number;
  sourceNote: string | null;
};

export type FluidsEnrichMeta = {
  identityKey: string;
  enrichedAt: string;
  /** Keys whose flat maintenanceSpecs values came from AI (advisor edit clears a key). */
  aiKeys: FluidEnrichSlotKey[];
  fields: Partial<Record<FluidEnrichSlotKey, FluidsEnrichFieldMeta>>;
};

export type FluidsEnrichStatus =
  | "skipped_cache"
  | "skipped_no_ymm"
  | "skipped_ai_gated"
  | "skipped_complete"
  | "enriched"
  | "partial"
  | "abstained"
  | "failed";

export type VehicleIdentityForFluids = {
  vin?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  trim?: string | null;
  engine?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  bodyClass?: string | null;
};

/** Stable fingerprint — re-run AI when identity changes. */
export function buildFluidsIdentityKey(vehicle: VehicleIdentityForFluids): string | null {
  const year = vehicle.year;
  const make = vehicle.make?.trim();
  const model = vehicle.model?.trim();
  if (!year || !make || !model) return null;

  const parts = [
    FLUIDS_ENRICH_SCHEMA_VERSION,
    String(year),
    make.toLowerCase(),
    model.toLowerCase(),
    vehicle.trim?.trim().toLowerCase() || "",
    vehicle.engine?.trim().toLowerCase() || "",
    vehicle.transmission?.trim().toLowerCase() || "",
    vehicle.drivetrain?.trim().toLowerCase() || "",
    vehicle.vin?.trim().toUpperCase() || "",
  ];
  return parts.join("|");
}

export function parseFluidsEnrichMeta(raw: unknown): FluidsEnrichMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const identityKey = typeof o.identityKey === "string" ? o.identityKey.trim() : "";
  const enrichedAt = typeof o.enrichedAt === "string" ? o.enrichedAt : "";
  if (!identityKey || !enrichedAt) return null;

  const aiKeysRaw = Array.isArray(o.aiKeys) ? o.aiKeys : [];
  const aiKeys = aiKeysRaw.filter((k): k is FluidEnrichSlotKey =>
    typeof k === "string" && (FLUID_ENRICH_SLOT_KEYS as readonly string[]).includes(k),
  );

  const fields: FluidsEnrichMeta["fields"] = {};
  if (o.fields && typeof o.fields === "object" && !Array.isArray(o.fields)) {
    for (const key of FLUID_ENRICH_SLOT_KEYS) {
      const hit = (o.fields as Record<string, unknown>)[key];
      if (!hit || typeof hit !== "object" || Array.isArray(hit)) continue;
      const conf = (hit as { confidence?: unknown }).confidence;
      const note = (hit as { sourceNote?: unknown }).sourceNote;
      if (typeof conf !== "number" || conf < 0 || conf > 1) continue;
      fields[key] = {
        confidence: conf,
        sourceNote: typeof note === "string" ? note.trim() || null : null,
      };
    }
  }

  return { identityKey, enrichedAt, aiKeys, fields };
}

export function extractFluidsEnrichMetaFromMaintenanceSpecs(
  raw: unknown,
): FluidsEnrichMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return parseFluidsEnrichMeta((raw as Record<string, unknown>)[FLUIDS_ENRICH_META_KEY]);
}

/** Strip enrich meta before parsing advisor override fields. */
export function stripEnrichMetaFromMaintenanceSpecs(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const { [FLUIDS_ENRICH_META_KEY]: _meta, ...rest } = raw as Record<string, unknown>;
  return rest;
}

export function fluidsEnrichCacheValid(
  meta: FluidsEnrichMeta | null,
  identityKey: string,
): boolean {
  return Boolean(meta && meta.identityKey === identityKey);
}

/**
 * Reject known LLM failure modes that fail OEM-catalog comparisons.
 * Returns null when the value should not be shown.
 */
export function sanitizeFluidEnrichValue(
  key: FluidEnrichSlotKey,
  value: string,
  vehicle: VehicleIdentityForFluids,
): string | null {
  const v = value.trim();
  if (!v) return null;
  const year = vehicle.year ?? 0;
  const make = (vehicle.make ?? "").toLowerCase();
  const lower = v.toLowerCase();

  // Most US light vehicles from ~2017+ use R-1234yf, not R-134a.
  if (key === "acRefrigerant" && year >= 2017) {
    if (/\br-?134a\b/.test(lower) && !/\b1234yf\b|\br-?1234/.test(lower)) {
      return null;
    }
  }

  // VW/Audi modern 0W-20 is typically 508 00 — not legacy 502 00.
  if (
    key === "engineOil" &&
    year >= 2019 &&
    (make.includes("volkswagen") || make.includes("vw") || make.includes("audi"))
  ) {
    if (/\b502\.?\s*00\b/.test(lower) && !/\b508\.?\s*00\b/.test(lower)) {
      return null;
    }
  }

  return v;
}

export function acceptFluidEnrichField(
  field: FluidEnrichField | null | undefined,
  key: FluidEnrichSlotKey,
  vehicle: VehicleIdentityForFluids,
): { value: string; confidence: number; sourceNote: string | null } | null {
  if (!field?.value?.trim()) return null;
  if (field.confidence < FLUIDS_ENRICH_CONFIDENCE_MIN) return null;
  const sanitized = sanitizeFluidEnrichValue(key, field.value, vehicle);
  if (!sanitized) return null;
  return {
    value: sanitized,
    confidence: field.confidence,
    sourceNote: field.sourceNote?.trim() || null,
  };
}

/** Never claim OEM verification — AI values are suggestions until catalog-backed. */
export function fluidEnrichSourceLabel(confidence: number): string {
  if (confidence >= 0.95) return "AI · suggested · check OEM";
  if (confidence >= FLUIDS_ENRICH_CONFIDENCE_MIN) return "AI · suggested";
  return "AI";
}
