import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { parseYmmSearch } from "@/lib/parse-ymm-search";
import { splitMergedRepairRequests } from "@/lib/split-repair-requests";
import type {
  FreeformCustomerHint,
  FreeformJobDraft,
  FreeformRoDraft,
  FreeformVehicleDraft,
} from "@/lib/freeform-ro-types";
import { prisma } from "@/db/client";
import { isAiConfigured } from "@/server/services/ai/client";
import {
  resolveLaborSuggestionWithFallback,
  type ResolvedLaborLookup,
} from "@/server/services/labor-guide-resolver";
import type { Vehicle } from "@/server/services/labor-guide";

const MODEL = process.env.FREEFORM_RO_INTAKE_MODEL || "claude-sonnet-4-6";

const FreeformParseSchema = z.object({
  customerHint: z
    .object({
      firstName: z.string().nullable().optional(),
      lastName: z.string().nullable().optional(),
      company: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  vehicle: z.object({
    year: z.number().int().nullable().optional(),
    make: z.string().nullable().optional(),
    model: z.string().nullable().optional(),
    trim: z.string().nullable().optional(),
    vin: z.string().nullable().optional(),
    plate: z.string().nullable().optional(),
    plateState: z.string().nullable().optional(),
    mileage: z.number().int().nullable().optional(),
  }),
  repairRequests: z
    .array(
      z.object({
        description: z.string().min(1),
        positionHint: z.string().nullable().optional(),
      }),
    )
    .min(1),
  concerns: z.array(z.string()).optional().default([]),
  notes: z.string().nullable().optional(),
  partHints: z
    .array(
      z.object({
        description: z.string().min(1),
        vendor: z.string().nullable().optional(),
        vendorPhone: z.string().nullable().optional(),
        partNumber: z.string().nullable().optional(),
        relatedRepair: z.string().nullable().optional(),
      }),
    )
    .optional()
    .default([]),
});

type ParsedFreeform = z.infer<typeof FreeformParseSchema>;

const SYSTEM_PROMPT = `You are an expert automotive service advisor parsing freeform repair-order intake for a shop CRM.

Extract structured data from the user's natural-language request. Examples:
- "2014 Honda Accord needs front brakes" → vehicle year/make/model + repair "front brake pads replacement"
- "Oil change for Sarah's 2020 Toyota Camry, 45k miles" → customer hint Sarah + vehicle + oil change

Rules:
- REPAIR SPLITTING (critical): each independent repair = its own repairRequests object with a focused description.
- Split when text lists multiple unrelated services joined by "and", commas, "+", ";", or newlines.
- Example: "water pump and battery replacement" → TWO items: "water pump replacement" AND "battery replacement" (never one combined title).
- Example: "oil change and tire rotation" → TWO items. "AC not cold, needs recharge" → ONE item (single system).
- Do NOT split parts of ONE job: "brake pads and rotors", "shocks and struts", "inspect and advise", "remove and replace …".
- Do NOT split "front and rear brake pads" into two jobs unless the customer clearly wants separate front/rear jobs.
- Use standard make names (Honda, Chevrolet, BMW).
- If year/make/model appear together, put them in vehicle fields.
- concerns = customer-stated symptoms or requests in their words (can mirror repairRequests).
- If no customer info, customerHint should be null.
- VIN must be 17 characters if present; plate is short alphanumeric.
- mileage only when explicitly stated.
- partHints: when the user mentions ordering parts, a vendor (AutoZone, O'Reilly, NAPA), vendor phone, or part numbers, add entries with description + vendor details. Link relatedRepair to the matching repair when possible.`;

function normalizeVehicle(parsed: ParsedFreeform["vehicle"]): FreeformVehicleDraft {
  let year = parsed.year ?? null;
  let make = parsed.make?.trim() || null;
  let model = parsed.model?.trim() || null;

  if ((!year || !make || !model) && (parsed.year || parsed.make || parsed.model)) {
    const ymmLine = [parsed.year, parsed.make, parsed.model].filter(Boolean).join(" ");
    const ymm = parseYmmSearch(ymmLine);
    if (ymm) {
      year = year ?? ymm.year;
      make = make ?? ymm.make;
      model = model ?? ymm.model;
    }
  }

  return {
    year,
    make,
    model,
    trim: parsed.trim?.trim() || null,
    vin: parsed.vin?.trim().toUpperCase() || null,
    plate: parsed.plate?.trim().toUpperCase() || null,
    plateState: parsed.plateState?.trim().toUpperCase() || null,
    mileage: parsed.mileage ?? null,
  };
}

function normalizeCustomerHint(
  raw: ParsedFreeform["customerHint"],
): FreeformCustomerHint | null {
  if (!raw) return null;
  const hint: FreeformCustomerHint = {
    firstName: raw.firstName?.trim() || null,
    lastName: raw.lastName?.trim() || null,
    company: raw.company?.trim() || null,
    phone: raw.phone?.trim() || null,
    email: raw.email?.trim() || null,
  };
  if (Object.values(hint).every((v) => !v)) return null;
  return hint;
}

function laborVehicleFromDraft(v: FreeformVehicleDraft): Vehicle {
  return {
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    engine: null,
  };
}

function totalLaborHours(lookup: ResolvedLaborLookup): number {
  const s = lookup.suggestion;
  if (s.unitLabel.toLowerCase() === "vehicle") return s.laborHoursPerUnit;
  return s.laborHoursPerUnit * s.unitsOnVehicle;
}

function lookupToJobDraft(
  repairRequest: string,
  lookup: ResolvedLaborLookup,
): FreeformJobDraft {
  const s = lookup.suggestion;
  const hours = Math.round(totalLaborHours(lookup) * 100) / 100;
  return {
    jobName: s.jobName,
    repairRequest,
    laborHours: hours,
    laborDescription: s.laborOperations.join("; ") || s.jobName,
    laborOperations: s.laborOperations,
    confidenceScore: s.confidenceScore,
    notes: s.notes,
    resolution: lookup.resolution,
  };
}

async function parseFreeformText(shopId: string, text: string): Promise<ParsedFreeform> {
  if (!isAiConfigured()) {
    throw new Error("AI is not configured on this platform.");
  }

  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text.trim() }],
    output_config: { format: zodOutputFormat(FreeformParseSchema) },
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("AI returned an empty response.");
  }

  const parsed = FreeformParseSchema.safeParse(JSON.parse(block.text));
  if (!parsed.success) {
    throw new Error("Could not parse the repair request. Try adding year, make, model, and the work needed.");
  }

  try {
    await prisma.aiUsageLog.create({
      data: {
        shopId,
        feature: "FREEFORM_RO_INTAKE",
        model: MODEL,
        inputTokens: response.usage?.input_tokens ?? null,
        outputTokens: response.usage?.output_tokens ?? null,
        totalTokens:
          response.usage?.input_tokens != null && response.usage?.output_tokens != null
            ? response.usage.input_tokens + response.usage.output_tokens
            : null,
      },
    });
  } catch {
    /* non-fatal */
  }

  return parsed.data;
}

/** Fallback when structured output fails — regex YMM + whole text as one repair. */
function fallbackParse(text: string): ParsedFreeform {
  const trimmed = text.trim();
  const ymm = parseYmmSearch(trimmed);
  return {
    vehicle: ymm
      ? { year: ymm.year, make: ymm.make, model: ymm.model }
      : { year: null, make: null, model: null },
    repairRequests: [{ description: trimmed }],
    concerns: [trimmed],
    notes: null,
    partHints: [],
  };
}

/**
 * Parse freeform intake and resolve labor hours per repair request.
 * Never throws on labor lookup — always returns usable job drafts.
 */
export async function buildFreeformRoDraft(
  shopId: string,
  rawText: string,
): Promise<FreeformRoDraft> {
  const text = rawText.trim();
  if (text.length < 8) {
    throw new Error("Describe the vehicle and work needed (at least a few words).");
  }

  let parsed: ParsedFreeform;
  try {
    parsed = await parseFreeformText(shopId, text);
  } catch {
    parsed = fallbackParse(text);
  }

  parsed = {
    ...parsed,
    repairRequests: splitMergedRepairRequests(parsed.repairRequests),
  };

  const vehicle = normalizeVehicle(parsed.vehicle);
  const customerHint = normalizeCustomerHint(parsed.customerHint);
  const vehicleForLabor = laborVehicleFromDraft(vehicle);

  const jobs: FreeformJobDraft[] = [];
  for (const req of parsed.repairRequests) {
    const request = [req.description, req.positionHint].filter(Boolean).join(" — ");
    const lookup = await resolveLaborSuggestionWithFallback(vehicleForLabor, request);
    jobs.push(lookupToJobDraft(request, lookup));
  }

  const concerns =
    parsed.concerns?.filter((c) => c.trim()).map((c) => c.trim()) ??
    parsed.repairRequests.map((r) => r.description.trim());

  return {
    rawText: text,
    vehicle,
    customerHint,
    concerns,
    notes: parsed.notes?.trim() || null,
    jobs,
    partHints: (parsed.partHints ?? []).map((p) => ({
      description: p.description.trim(),
      vendor: p.vendor?.trim() || null,
      vendorPhone: p.vendorPhone?.trim() || null,
      partNumber: p.partNumber?.trim() || null,
      relatedRepair: p.relatedRepair?.trim() || null,
    })),
    suggestedCustomerIds: [],
  };
}
