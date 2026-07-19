import "server-only";

import { SchemaType, type ResponseSchema } from "@google/generative-ai";

import {
  FluidsEnrichAiResponseSchema,
  type FluidsEnrichAiResponse,
  type VehicleIdentityForFluids,
} from "@/lib/vehicle-fluids-enrich";
import { createAiJsonMessage, isAiConfigured } from "@/server/services/ai/client";

export const VEHICLE_FLUIDS_ENRICH_SYSTEM_PROMPT = `You are an OEM fluids reference for US-market light vehicles in independent repair shops.

Return factory-typical fluid specs ONLY when you would stake a shop's liability on them. Wrong specs are worse than empty cells.

HARD RULES:
1. Never invent. If unsure for a field, value=null and confidence≤0.4.
2. Match the EXACT year/make/model/trim/engine. Do not blend a sibling engine or prior generation.
3. Prefer OEM approval codes and part-style names when known (e.g. VW 508 00 / SEO91, G 055 529 A2, G13).
4. Format values like shop catalogs (Tekmetric / AllData style):
   - Engine oil: "0W-20 (VW 508 00 / SEO91)" — include OEM oil standard
   - Oil capacity: "4.5 qt w/ filter" (also ok "4.3 L / 4.5 qt w/ filter")
   - Coolant: type + capacity "OAT (VW G13) · 10.6 qt"
   - Transmission: "ATF · VW G 055 529 A2" (+ capacity only if drain/refill is well known)
   - Brake fluid: "DOT 4" (or OEM DOT label)
   - A/C: "R-1234yf · 16.8 oz" (include compressor variants only if charges differ)
   - Battery: group + CCA only when typical for that US market vehicle
5. Era rules (US market):
   - Model year ≥ 2017: A/C is almost always R-1234yf — NEVER return R-134a unless you are certain that exact vehicle stayed on 134a.
   - VW/Audi 0W-20 from ~2019+: prefer VW 508 00 (not legacy 502 00) unless the engine is documented for 502 00 only.
6. confidence 0.0–1.0. Use ≥ 0.88 ONLY for fields you treat as OEM-standard for this exact configuration. Capacities and A/C charge are often lower confidence — omit rather than guess.
7. sourceNote: short basis (e.g. "VW Taos 1.5 TSI US OEM fluids") — no URLs, never say "verified".
8. US market only. JSON only — no markdown.`;

const FLUID_FIELD_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    value: { type: SchemaType.STRING, nullable: true },
    confidence: { type: SchemaType.NUMBER },
    sourceNote: { type: SchemaType.STRING, nullable: true },
  },
  required: ["value", "confidence", "sourceNote"],
};

export const VEHICLE_FLUIDS_GEMINI_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    engineOil: { ...FLUID_FIELD_SCHEMA, nullable: true },
    oilCapacity: { ...FLUID_FIELD_SCHEMA, nullable: true },
    coolant: { ...FLUID_FIELD_SCHEMA, nullable: true },
    transmissionFluid: { ...FLUID_FIELD_SCHEMA, nullable: true },
    brakeFluid: { ...FLUID_FIELD_SCHEMA, nullable: true },
    acRefrigerant: { ...FLUID_FIELD_SCHEMA, nullable: true },
    battery: { ...FLUID_FIELD_SCHEMA, nullable: true },
  },
};

function formatIdentityBlock(vehicle: VehicleIdentityForFluids, decodedSnippets?: string | null): string {
  const lines = [
    vehicle.year != null ? `Year: ${vehicle.year}` : null,
    vehicle.make ? `Make: ${vehicle.make}` : null,
    vehicle.model ? `Model: ${vehicle.model}` : null,
    vehicle.trim ? `Trim: ${vehicle.trim}` : null,
    vehicle.engine ? `Engine: ${vehicle.engine}` : null,
    vehicle.transmission ? `Transmission: ${vehicle.transmission}` : null,
    vehicle.drivetrain ? `Drivetrain: ${vehicle.drivetrain}` : null,
    vehicle.bodyClass ? `Body: ${vehicle.bodyClass}` : null,
    vehicle.vin ? `VIN: ${vehicle.vin}` : null,
  ].filter(Boolean);

  const blocks = [
    "VEHICLE IDENTITY (ground truth — do not substitute a different YMM or engine):",
    ...lines,
  ];

  if (decodedSnippets?.trim()) {
    blocks.push("", "DECODED DATA SNIPPETS:", decodedSnippets.trim());
  }

  return blocks.join("\n");
}

function extractDecodedSnippets(decodedData: unknown): string | null {
  if (!decodedData || typeof decodedData !== "object" || Array.isArray(decodedData)) return null;
  const raw = decodedData as Record<string, unknown>;
  const picks = [
    raw.DisplacementL != null ? `Displacement: ${raw.DisplacementL}L` : null,
    raw.EngineCylinders != null ? `Cylinders: ${raw.EngineCylinders}` : null,
    raw.FuelTypePrimary ? `Fuel: ${raw.FuelTypePrimary}` : null,
    raw.EngineModel ? `Engine code: ${raw.EngineModel}` : null,
    raw.TransmissionStyle ? `Trans style: ${raw.TransmissionStyle}` : null,
    raw.DriveType ? `Drive: ${raw.DriveType}` : null,
  ].filter(Boolean);
  return picks.length ? picks.join("\n") : null;
}

export async function lookupVehicleFluidsWithAi(
  shopId: string,
  vehicle: VehicleIdentityForFluids,
  decodedData?: unknown,
): Promise<FluidsEnrichAiResponse> {
  if (!isAiConfigured()) {
    throw new Error("AI is not configured. Set GEMINI_API_KEY on the server.");
  }

  const identityBlock = formatIdentityBlock(vehicle, extractDecodedSnippets(decodedData));

  const { data } = await createAiJsonMessage({
    shopId,
    feature: "FREEFORM_RO_INTAKE",
    system: VEHICLE_FLUIDS_ENRICH_SYSTEM_PROMPT,
    userContent:
      `${identityBlock}\n\n` +
      "Return US-market OEM fluid specs for this exact vehicle. " +
      "Leave value null whenever capacity, refrigerant, or OEM oil code is uncertain. " +
      "Wrong refrigerant or oil approval codes are unacceptable.",
    maxTokens: 2048,
    schema: FluidsEnrichAiResponseSchema,
    responseSchema: VEHICLE_FLUIDS_GEMINI_RESPONSE_SCHEMA,
  });

  return data;
}
