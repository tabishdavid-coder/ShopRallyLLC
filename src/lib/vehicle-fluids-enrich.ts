import { z } from "zod";

import type { MaintenancePartCategory } from "@/lib/vehicle-maintenance-specs";

/** Minimum confidence (0–1) before we persist or display an AI fluid value. */
export const FLUIDS_ENRICH_CONFIDENCE_MIN = 0.75;

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

export function acceptFluidEnrichField(
  field: FluidEnrichField | null | undefined,
): { value: string; confidence: number; sourceNote: string | null } | null {
  if (!field?.value?.trim()) return null;
  if (field.confidence < FLUIDS_ENRICH_CONFIDENCE_MIN) return null;
  return {
    value: field.value.trim(),
    confidence: field.confidence,
    sourceNote: field.sourceNote?.trim() || null,
  };
}

export function fluidEnrichSourceLabel(confidence: number): string {
  if (confidence >= 0.9) return "AI · high confidence";
  if (confidence >= FLUIDS_ENRICH_CONFIDENCE_MIN) return "AI · verified";
  return "AI";
}
