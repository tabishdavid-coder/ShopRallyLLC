import "server-only";

import { SchemaType, type ResponseSchema } from "@google/generative-ai";
import { z } from "zod";

import { parseYmmSearch } from "@/lib/parse-ymm-search";
import { splitCompoundRepairDescription } from "@/lib/split-repair-requests";
import { formatPhoneInput } from "@/lib/phone";
import type {
  SmartRoIntakePayload,
  SmartRoStagingState,
  SmartRoVehicle,
} from "@/lib/smart-ro-intake-types";
import { createAiJsonMessage, isAiConfigured } from "@/server/services/ai/client";
import { recordDecodeUsage } from "@/server/services/decode-usage";
import {
  resolveLaborSuggestionWithFallback,
  type ResolvedLaborLookup,
} from "@/server/services/labor-guide-resolver";
import type { Vehicle } from "@/server/services/labor-guide";
import { decodeVinForShop, isValidVin, type DecodedVin } from "@/server/services/vin";

/**
 * System prompt wrapper for Gemini — precise parser + mechanical labor guide.
 * Returns ONLY labor hours (no currency/parts). Splits unrelated issues into distinct labor_lines.
 */
export const SMART_RO_INTAKE_SYSTEM_PROMPT = `You are a precise data parser and an AI Mechanical Labor Guide for an auto repair shop CRM.

Your job: analyze unstructured service-advisor intake text and return a single JSON object matching the required schema exactly.

ROLE RULES:
1. DATA PARSER — extract customer contact hints, vehicle identity, and distinct repair tasks from free-form text.
2. MECHANICAL LABOR GUIDE — for each repair task, estimate realistic industry book-time labor HOURS only.
   - Do NOT include parts, fluids, shop supplies, taxes, or dollar amounts.
   - Do NOT multiply hours by any labor rate.
   - Hours may be fractional (e.g. 0.5, 1.3, 2.0).

LABOR LINE SPLITTING:
- If the text mentions multiple unrelated issues (e.g. "oil change and check engine light"), create SEPARATE objects in labor_lines — one per independent job.
- Example: "water pump and battery replacement" → TWO labor_lines: "Remove and Replace Water Pump" AND "Remove and Replace Battery" (never one combined title/hours blob).
- Split when joined by "and", commas, "+", ";", or newlines for distinct systems — each line gets its own estimated_hours.
- Do not merge unrelated work into a single labor line.
- Do NOT split parts of ONE job: "brake pads and rotors", "shocks and struts", "inspect and advise", "remove and replace …".

TASK TITLES (replacement work):
- For remove-and-replace / R&R / replacement jobs, prefer task_title shaped as "Remove and Replace <Work>" (Title Case work phrase).
- Examples: "brake lines replacement" → "Remove and Replace Brake Lines"; "R&R front brakes" → "Remove and Replace Front Brakes".
- Do not rename non-replacement jobs (oil change, diagnosis, flush, inspection, alignment, etc.).
- If already titled "Remove and Replace …", leave that form.

CONFIDENCE SCORING (0–100 integer):
- vehicle.confidence_score: how confident you are in year/make/model/trim/engine extraction.
- labor_lines[].confidence_score: how confident you are in the task identification AND hour estimate.
- Assign confidence_score BELOW 70 when: vehicle YMM is vague or misspelled, trim/engine unknown, task ambiguous, or hours are a rough guess.
- Assign 70+ only when identification and hours are clear and standard for the described vehicle.

NULL HANDLING:
- Use null (not empty string) for unknown customer.name, customer.phone, customer.email.
- Use null for unknown vehicle year, make, model, trim, engine when not stated or not inferable.
- labor_lines must have at least one entry when any repair work is mentioned.

VEHICLE NORMALIZATION:
- Standardize makes (Honda, Toyota, Chevrolet, BMW).
- year must be a 4-digit integer or null.
- When a VERIFIED VEHICLE DECODE block is provided in the user message, treat it as ground truth for year/make/model/trim/engine — do not invent conflicting YMM. Use it to calibrate labor hours for that specific vehicle.
- Do not put year/make/model/VIN into task_title or description.

OUTPUT: Valid JSON only — no markdown, no commentary.`;

/** Gemini responseSchema — without this, JSON mode returns ad-hoc shapes that fail Zod. */
export const SMART_RO_GEMINI_RESPONSE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    customer: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, nullable: true },
        phone: { type: SchemaType.STRING, nullable: true },
        email: { type: SchemaType.STRING, nullable: true },
      },
      required: ["name", "phone", "email"],
    },
    vehicle: {
      type: SchemaType.OBJECT,
      properties: {
        year: { type: SchemaType.INTEGER, nullable: true },
        make: { type: SchemaType.STRING, nullable: true },
        model: { type: SchemaType.STRING, nullable: true },
        trim: { type: SchemaType.STRING, nullable: true },
        engine: { type: SchemaType.STRING, nullable: true },
        confidence_score: { type: SchemaType.INTEGER },
      },
      required: ["year", "make", "model", "trim", "engine", "confidence_score"],
    },
    labor_lines: {
      type: SchemaType.ARRAY,
      minItems: 1,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          task_title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          estimated_hours: { type: SchemaType.NUMBER },
          confidence_score: { type: SchemaType.INTEGER },
        },
        required: ["task_title", "description", "estimated_hours", "confidence_score"],
      },
    },
  },
  required: ["customer", "vehicle", "labor_lines"],
};

const SmartRoGeminiSchema = z.object({
  customer: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
  }),
  vehicle: z.object({
    year: z.number().int().nullable(),
    make: z.string().nullable(),
    model: z.string().nullable(),
    trim: z.string().nullable(),
    engine: z.string().nullable(),
    confidence_score: z.number().int().min(0).max(100),
  }),
  labor_lines: z
    .array(
      z.object({
        task_title: z.string().min(1),
        description: z.string().min(1),
        estimated_hours: z.number().positive(),
        confidence_score: z.number().int().min(0).max(100),
      }),
    )
    .min(1),
});

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const RR_PREFIX_RE = /^remove\s+and\s+replace\b/i;
const RR_SHORT_PREFIX_RE = /^(?:r\s*&\s*r|r\s+and\s+r|remove\s*&\s*replace)\b[\s:.-]*/i;
const REPLACE_PREFIX_RE = /^replace(?:ment)?\b[\s:.-]*/i;
const REPLACEMENT_SUFFIX_RE =
  /\b(?:r\s*&\s*r|r\s+and\s+r|remove\s+and\s+replace|remove\s*&\s*replace|replacement|replace)\s*$/i;

function titleCaseWorkPhrase(phrase: string): string {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^[A-Z0-9]+$/.test(word) && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Normalize replacement-style job titles to "Remove and Replace <Work>".
 * Non-replacement titles are returned unchanged (trimmed).
 */
export function normalizeReplacementTaskTitle(title: string): string {
  const trimmed = title.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;

  // Already in canonical form — leave unchanged.
  if (RR_PREFIX_RE.test(trimmed)) return trimmed;

  let work: string | null = null;
  if (RR_SHORT_PREFIX_RE.test(trimmed)) {
    work = trimmed.replace(RR_SHORT_PREFIX_RE, "").trim();
  } else if (REPLACE_PREFIX_RE.test(trimmed) && !/^replacement\b/i.test(trimmed)) {
    work = trimmed.replace(REPLACE_PREFIX_RE, "").trim();
  } else if (REPLACEMENT_SUFFIX_RE.test(trimmed)) {
    work = trimmed.replace(REPLACEMENT_SUFFIX_RE, "").trim();
  }

  if (!work) return trimmed;
  return `Remove and Replace ${titleCaseWorkPhrase(work)}`;
}

function normalizePhoneForStaging(phone: string | null): string | null {
  if (!phone?.trim()) return null;
  const formatted = formatPhoneInput(phone);
  return formatted || null;
}

/** First valid 17-char VIN found in free-form intake notes. */
export function extractVinFromIntakeText(text: string): string | null {
  const matches = text.toUpperCase().match(/\b[A-HJ-NPR-Z0-9]{17}\b/g);
  if (!matches) return null;
  for (const m of matches) {
    if (isValidVin(m)) return m;
  }
  return null;
}

function formatDecodedVehicleBlock(vin: string, decoded: DecodedVin): string {
  const lines = [
    `VIN: ${vin}`,
    decoded.year != null ? `Year: ${decoded.year}` : null,
    decoded.make ? `Make: ${decoded.make}` : null,
    decoded.model ? `Model: ${decoded.model}` : null,
    decoded.trim ? `Trim: ${decoded.trim}` : null,
    decoded.engine ? `Engine: ${decoded.engine}` : null,
    decoded.transmission ? `Transmission: ${decoded.transmission}` : null,
    decoded.drivetrain ? `Drivetrain: ${decoded.drivetrain}` : null,
    decoded.bodyClass ? `Body: ${decoded.bodyClass}` : null,
  ].filter(Boolean);
  return [
    "VERIFIED VEHICLE DECODE (NHTSA / shop VIN provider — ground truth for YMM and labor hour calibration):",
    ...lines,
    "Use this vehicle identity when estimating labor hours for the repair tasks below.",
  ].join("\n");
}

function mergeDecodedVehicle(
  aiVehicle: SmartRoIntakePayload["vehicle"],
  vin: string,
  decoded: DecodedVin,
): SmartRoVehicle {
  const year = decoded.year ?? aiVehicle.year;
  const make = decoded.make?.trim() || aiVehicle.make;
  const model = decoded.model?.trim() || aiVehicle.model;
  const trim = decoded.trim?.trim() || aiVehicle.trim;
  const engine = decoded.engine?.trim() || aiVehicle.engine;
  const hasYmm = year != null && !!make && !!model;
  return {
    vin,
    year: year ?? null,
    make: make?.trim() || null,
    model: model?.trim() || null,
    trim: trim?.trim() || null,
    engine: engine?.trim() || null,
    transmission: decoded.transmission?.trim() || null,
    drivetrain: decoded.drivetrain?.trim() || null,
    bodyClass: decoded.bodyClass?.trim() || null,
    confidence_score: hasYmm
      ? Math.max(clampScore(aiVehicle.confidence_score), 92)
      : clampScore(aiVehicle.confidence_score),
    vinDecoded: true,
  };
}

function normalizeVehicle(
  raw: SmartRoIntakePayload["vehicle"],
): SmartRoIntakePayload["vehicle"] {
  let year = raw.year;
  let make = raw.make?.trim() || null;
  let model = raw.model?.trim() || null;

  if ((!year || !make || !model) && (year || make || model)) {
    const ymmLine = [year, make, model].filter(Boolean).join(" ");
    const ymm = parseYmmSearch(ymmLine);
    if (ymm) {
      year = year ?? ymm.year;
      make = make ?? ymm.make;
      model = model ?? ymm.model;
    }
  }

  return {
    year: year ?? null,
    make,
    model,
    trim: raw.trim?.trim() || null,
    engine: raw.engine?.trim() || null,
    confidence_score: clampScore(raw.confidence_score),
  };
}

function normalizePayload(data: z.infer<typeof SmartRoGeminiSchema>): SmartRoIntakePayload {
  return {
    customer: {
      name: data.customer.name?.trim() || null,
      phone: normalizePhoneForStaging(data.customer.phone),
      email: data.customer.email?.trim() || null,
    },
    vehicle: normalizeVehicle(data.vehicle),
    labor_lines: data.labor_lines.map((line) => ({
      task_title: normalizeReplacementTaskTitle(line.task_title),
      description: line.description.trim(),
      estimated_hours: Math.round(line.estimated_hours * 100) / 100,
      confidence_score: clampScore(line.confidence_score),
    })),
  };
}

function laborVehicleFromSmartRo(vehicle: SmartRoVehicle): Vehicle {
  return {
    vin: vehicle.vin ?? null,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    engine: vehicle.engine,
  };
}

function totalLaborHours(lookup: ResolvedLaborLookup): number {
  const s = lookup.suggestion;
  if (s.unitLabel.toLowerCase() === "vehicle") return s.laborHoursPerUnit;
  return s.laborHoursPerUnit * s.unitsOnVehicle;
}

/** Safety net when Gemini merges independent repairs into one labor line. */
async function expandMergedLaborLines(
  lines: SmartRoIntakePayload["labor_lines"],
  vehicle: SmartRoVehicle,
): Promise<SmartRoIntakePayload["labor_lines"]> {
  const vehicleForLabor = laborVehicleFromSmartRo(vehicle);
  const expanded: SmartRoIntakePayload["labor_lines"] = [];

  for (const line of lines) {
    const source = line.description.trim() || line.task_title.trim();
    const parts = splitCompoundRepairDescription(source);
    if (parts.length <= 1) {
      expanded.push(line);
      continue;
    }

    for (const part of parts) {
      const lookup = await resolveLaborSuggestionWithFallback(vehicleForLabor, part);
      const hours = Math.round(totalLaborHours(lookup) * 100) / 100;
      expanded.push({
        task_title: normalizeReplacementTaskTitle(lookup.suggestion.jobName || part),
        description: part,
        estimated_hours: hours > 0 ? hours : line.estimated_hours / parts.length,
        confidence_score: clampScore(
          Math.min(line.confidence_score, lookup.suggestion.confidenceScore ?? 65),
        ),
      });
    }
  }

  return expanded.length > 0 ? expanded : lines;
}

/** Parse free-form intake text via Gemini (or Anthropic fallback) into staging payload. */
export async function parseSmartRoIntakeText(
  shopId: string,
  rawText: string,
): Promise<SmartRoStagingState> {
  const text = rawText.trim();
  if (text.length < 8) {
    throw new Error("Describe the customer, vehicle, and work needed (at least a few words).");
  }
  if (!isAiConfigured()) {
    throw new Error("AI is not configured. Set GEMINI_API_KEY on the server.");
  }

  const vin = extractVinFromIntakeText(text);
  let decoded: DecodedVin | null = null;
  if (vin) {
    try {
      decoded = await decodeVinForShop(shopId, vin);
      if (decoded) {
        await recordDecodeUsage(shopId, "VIN").catch(() => undefined);
      }
    } catch {
      decoded = null;
    }
  }

  const decodeBlock =
    vin && decoded ? `\n\n${formatDecodedVehicleBlock(vin, decoded)}\n` : "";

  const { data } = await createAiJsonMessage({
    shopId,
    feature: "FREEFORM_RO_INTAKE",
    system: SMART_RO_INTAKE_SYSTEM_PROMPT,
    userContent: `Parse this repair order intake:\n\n${text}${decodeBlock}`,
    maxTokens: 4096,
    schema: SmartRoGeminiSchema,
    responseSchema: SMART_RO_GEMINI_RESPONSE_SCHEMA,
  });

  const payload = normalizePayload(data);
  const vehicle: SmartRoVehicle =
    vin && decoded
      ? mergeDecodedVehicle(payload.vehicle, vin, decoded)
      : vin
        ? { ...payload.vehicle, vin, vinDecoded: false }
        : payload.vehicle;

  const laborLines = await expandMergedLaborLines(payload.labor_lines, vehicle);

  return {
    rawText: text,
    customer: payload.customer,
    vehicle,
    laborLines,
    suggestedCustomerIds: [],
  };
}
