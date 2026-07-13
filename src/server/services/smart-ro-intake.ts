import "server-only";

import { z } from "zod";

import { parseYmmSearch } from "@/lib/parse-ymm-search";
import type { SmartRoIntakePayload, SmartRoStagingState } from "@/lib/smart-ro-intake-types";
import { createAiJsonMessage, isAiConfigured } from "@/server/services/ai/client";

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
- Do not merge unrelated work into a single labor line.

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

OUTPUT: Valid JSON only — no markdown, no commentary.`;

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
      phone: data.customer.phone?.trim() || null,
      email: data.customer.email?.trim() || null,
    },
    vehicle: normalizeVehicle(data.vehicle),
    labor_lines: data.labor_lines.map((line) => ({
      task_title: line.task_title.trim(),
      description: line.description.trim(),
      estimated_hours: Math.round(line.estimated_hours * 100) / 100,
      confidence_score: clampScore(line.confidence_score),
    })),
  };
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

  const { data } = await createAiJsonMessage({
    shopId,
    feature: "FREEFORM_RO_INTAKE",
    system: SMART_RO_INTAKE_SYSTEM_PROMPT,
    userContent: `Parse this repair order intake:\n\n${text}`,
    maxTokens: 4096,
    schema: SmartRoGeminiSchema,
  });

  const payload = normalizePayload(data);

  return {
    rawText: text,
    customer: payload.customer,
    vehicle: payload.vehicle,
    laborLines: payload.labor_lines,
    suggestedCustomerIds: [],
  };
}
