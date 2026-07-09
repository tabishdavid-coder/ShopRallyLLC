import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import {
  LABOR_GUIDE_PROMPT_VERSION,
  LABOR_GUIDE_RETRY_SYSTEM_PROMPT,
  LABOR_GUIDE_SYSTEM_PROMPT,
} from "@/lib/labor-guide-prompt";
import { applyLaborHoursFloor } from "@/lib/labor-hours-calibration";
import type { MotorRagExample } from "@/server/services/motor/motor-ai-context";

/**
 * AI Smart Labor Guide — given a VIN-decoded vehicle and a requested repair,
 * Claude returns the standard labor operation and an estimated flat-rate hours
 * value derived from first principles (not commercial guide recall).
 *
 * Model defaults to claude-sonnet-4-6; override with LABOR_GUIDE_MODEL.
 */

const MODEL = process.env.LABOR_GUIDE_MODEL || "claude-sonnet-4-6";

export const LaborSuggestionSchema = z.object({
  jobName: z.string().describe("Short job title, e.g. 'Strut assembly replacement'"),
  unitLabel: z
    .string()
    .describe(
      "Singular noun for ONE unit of this job, e.g. 'strut', 'wheel', 'axle', " +
        "'caliper'. Use 'vehicle' for jobs done once regardless of count (e.g. an oil change).",
    ),
  unitsOnVehicle: z
    .number()
    .int()
    .describe(
      "How many of this unit the specific vehicle has, e.g. 4 struts, 2 front " +
        "calipers, 1 water pump. Use 1 for whole-vehicle jobs.",
    ),
  laborHoursPerUnit: z
    .number()
    .describe(
      "Industry book-time flat-rate hours to do ONE unit, e.g. 1.5-2.5 per strut or 2.2-2.7 per front hub/bearing corner.",
    ),
  laborOperations: z
    .array(z.string())
    .describe("The labor operations performed, one per line"),
  notes: z.string().describe("Caveats, assumptions, or recommended related work"),
  confidenceScore: z
    .number()
    .min(0)
    .max(1)
    .describe("0–1 confidence in this estimate for this vehicle configuration"),
  reasoningSummary: z
    .string()
    .describe(
      "Brief first-principles rationale (step count, access factors). No commercial guide references.",
    ),
});

export type LaborSuggestion = z.infer<typeof LaborSuggestionSchema>;

export type Vehicle = {
  vin?: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  engine: string | null;
  drivetrain?: string | null;
};

export type SuggestLaborJobOptions = {
  /** Similar cached rows injected as few-shot context (internal RAG). */
  ragExamples?: LaborSuggestion[];
  /** MOTOR application metadata few-shot (licensed, no rawJson). */
  motorRagExamples?: MotorRagExample[];
  /** Structured MOTOR taxonomy block (System/Group/SubGroup names + IDs). */
  motorTaxonomyBlock?: string;
  /** Target operation hint when scoped to a SubGroup browse path. */
  targetOperation?: string;
  positionHint?: string;
};

export { LABOR_GUIDE_PROMPT_VERSION };

function buildVehiclePrompt(
  vehicle: Vehicle,
  request: string,
  opts: Pick<SuggestLaborJobOptions, "motorTaxonomyBlock" | "targetOperation" | "positionHint"> = {},
): string {
  const vehicleLine =
    [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") ||
    "an unspecified vehicle";
  const vinLine = vehicle.vin?.trim() ? `VIN: ${vehicle.vin.trim()}` : null;
  const specs = [
    vinLine,
    vehicle.engine ? `Engine: ${vehicle.engine}` : null,
    vehicle.drivetrain ? `Drivetrain: ${vehicle.drivetrain}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const lines = [`Vehicle: ${vehicleLine}${specs ? ` (${specs})` : ""}`];
  if (opts.motorTaxonomyBlock) {
    lines.push("", opts.motorTaxonomyBlock);
  }
  const target = opts.targetOperation?.trim() || request;
  lines.push(`Target operation: ${target}`);
  if (opts.positionHint?.trim()) {
    lines.push(`Position hint: ${opts.positionHint.trim()}`);
  } else if (opts.targetOperation?.trim() && opts.targetOperation.trim() !== request.trim()) {
    lines.push(`Requested repair: ${request}`);
  } else if (!opts.motorTaxonomyBlock) {
    lines.push(`Requested repair: ${request}`);
  }
  return lines.join("\n");
}

function formatRagBlock(examples: LaborSuggestion[]): string {
  if (!examples.length) return "";
  const lines = examples.slice(0, 3).map((ex, i) => {
    const hours =
      ex.unitLabel.toLowerCase() === "vehicle"
        ? ex.laborHoursPerUnit
        : ex.laborHoursPerUnit * ex.unitsOnVehicle;
    return (
      `Example ${i + 1}: "${ex.jobName}" — ${hours.toFixed(2)} hrs total, ` +
      `${ex.laborOperations.length} op(s), unit=${ex.unitLabel}×${ex.unitsOnVehicle}`
    );
  });
  return `\n\nSimilar jobs already in our internal guide (match structure, adjust hours for this vehicle):\n${lines.join("\n")}`;
}

function formatMotorRagBlock(examples: MotorRagExample[]): string {
  if (!examples.length) return "";
  const lines = examples.slice(0, 3).map((ex, i) => {
    const parts = [
      `"${ex.literalName}" — ${ex.estimatedHours.toFixed(2)} hrs`,
      ex.positionQualifier ? `position=${ex.positionQualifier}` : null,
      ex.operationType ? `type=${ex.operationType}` : null,
    ].filter(Boolean);
    return `MOTOR example ${i + 1}: ${parts.join(", ")}`;
  });
  return `\n\nLicensed MOTOR application examples for this vehicle (use as hour anchors; adjust for scope):\n${lines.join("\n")}`;
}

function correctionPrompt(
  basePrompt: string,
  parsed: LaborSuggestion,
  raisedFrom: number,
  floorLabel: string,
): string {
  const total =
    parsed.unitLabel.toLowerCase() === "vehicle"
      ? parsed.laborHoursPerUnit
      : parsed.laborHoursPerUnit * parsed.unitsOnVehicle;
  return `${basePrompt}

Your previous estimate was ${raisedFrom.toFixed(2)} hr/unit (${total.toFixed(2)} total) for "${parsed.jobName}", which is below ShopRally's internal book-time calibration for ${floorLabel}.

Regenerate the same operation as realistic industry book time. Do not simply return a safety-floor note; revise the laborHoursPerUnit, unitLabel, unitsOnVehicle, operations, confidence, and reasoning so the estimate reflects full R&R access and the requested vehicle/scope. Return JSON only.`;
}

async function callLaborModel(
  system: string,
  userContent: string,
): Promise<LaborSuggestion | null> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userContent }],
    output_config: { format: zodOutputFormat(LaborSuggestionSchema) },
  });
  return response.parsed_output ?? null;
}

export async function suggestLaborJob(
  vehicle: Vehicle,
  request: string,
  options: SuggestLaborJobOptions = {},
): Promise<LaborSuggestion> {
  const basePrompt = buildVehiclePrompt(vehicle, request, {
    motorTaxonomyBlock: options.motorTaxonomyBlock,
    targetOperation: options.targetOperation,
    positionHint: options.positionHint,
  });
  const motorRagBlock = formatMotorRagBlock(options.motorRagExamples ?? []);
  const ragBlock = formatRagBlock(options.ragExamples ?? []);
  const userContent = `${basePrompt}${motorRagBlock}${ragBlock}`;

  let parsed = await callLaborModel(LABOR_GUIDE_SYSTEM_PROMPT, userContent);

  if (!parsed) {
    parsed = await callLaborModel(
      LABOR_GUIDE_RETRY_SYSTEM_PROMPT,
      `${basePrompt}\n\nReturn a single assembly job when appropriate.`,
    );
  }

  if (!parsed) throw new Error("The Labor Book returned no result.");

  const firstCalibration = applyLaborHoursFloor(parsed);
  if (firstCalibration.applied) {
    const corrected = await callLaborModel(
      LABOR_GUIDE_RETRY_SYSTEM_PROMPT,
      correctionPrompt(
        basePrompt,
        parsed,
        firstCalibration.raisedFrom ?? parsed.laborHoursPerUnit,
        firstCalibration.applied.typicalLabel,
      ),
    );
    if (corrected) {
      return applyLaborHoursFloor(corrected).suggestion;
    }
  }

  return firstCalibration.suggestion;
}
