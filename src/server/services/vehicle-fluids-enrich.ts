import "server-only";

import { SchemaType, type ResponseSchema } from "@google/generative-ai";

import {
  FluidsEnrichAiResponseSchema,
  type FluidsEnrichAiResponse,
  type VehicleIdentityForFluids,
} from "@/lib/vehicle-fluids-enrich";
import { createAiJsonMessage, isAiConfigured } from "@/server/services/ai/client";

export const VEHICLE_FLUIDS_ENRICH_SYSTEM_PROMPT = `You are an OEM maintenance reference assistant for US-market passenger vehicles in auto repair shops.

Your job: return typical factory fluid and battery specifications for the EXACT vehicle identity provided.

RULES:
1. Use only well-established OEM / industry-standard specs for the given year, make, model, trim, and engine variant.
2. NEVER invent capacities, viscosities, DOT ratings, refrigerant types, or CCA values. If you are not confident for a field, set value to null and confidence below 0.5.
3. Prefer the specific engine variant when engine is provided — do not mix specs from a different engine on the same model year.
4. Include units in every value string:
   - Engine oil: viscosity + API/ILSAC/OEM spec when known (e.g. "0W-20 (API SP, ILSAC GF-6A)")
   - Oil capacity: quarts with filter when typical (e.g. "4.4 qt w/ filter")
   - Coolant: type + capacity when known (e.g. "Toyota Super Long Life · 6.4 qt")
   - Transmission fluid: spec name + capacity when known (e.g. "Toyota WS · 4.0 qt drain/refill")
   - Brake fluid: DOT rating (e.g. "DOT 3" or "DOT 4")
   - A/C refrigerant: type + charge when known (e.g. "R-134a · 19 oz")
   - Battery: group size and/or CCA when typical (e.g. "Group 35 · 640 CCA")
5. confidence is 0.0–1.0 (decimal). Use ≥ 0.85 only when you are highly confident this is the correct US-market spec for this exact configuration. Use 0.75–0.84 when reasonably typical but trim/engine ambiguity remains. Below 0.75 → set value null.
6. sourceNote: brief plain-English basis (e.g. "Toyota OEM 2019 Camry 2.5L" or "Typical US-spec Honda Accord V6") — no URLs.
7. US market only. Return JSON matching the schema exactly — no markdown.`;

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
      "Return typical US-market OEM fluid and battery specs for this vehicle. " +
      "Omit any field you cannot support with high confidence — use null value and low confidence.",
    maxTokens: 2048,
    schema: FluidsEnrichAiResponseSchema,
    responseSchema: VEHICLE_FLUIDS_GEMINI_RESPONSE_SCHEMA,
  });

  return data;
}
