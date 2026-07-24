import { z } from "zod";

/**
 * Zod mirror of the Python IntentFitmentResult JSON schema.
 * Application boundary: validate LLM output before any DB resolution.
 * Money / hours fields are intentionally absent.
 */
export const intentFitmentResultSchema = z.object({
  vehicle: z.object({
    year: z.number().int().min(1980).max(2100).nullable(),
    make: z.string().nullable(),
    model: z.string().nullable(),
    engineConfiguration: z.string().nullable().optional(),
    // Accept snake_case from Python middleware
    engine_configuration: z.string().nullable().optional(),
    trim: z.string().nullable(),
    driveType: z.string().nullable().optional(),
    drive_type: z.string().nullable().optional(),
  }),
  targetOperationKeys: z.array(z.string()).optional(),
  target_operation_keys: z.array(z.string()).optional(),
  partsVariantFlags: z.array(z.string()).optional(),
  parts_variant_flags: z.array(z.string()).optional(),
  positionHints: z.array(z.string()).optional(),
  position_hints: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
  unresolvedTokens: z.array(z.string()).optional(),
  unresolved_tokens: z.array(z.string()).optional(),
});

export type RawIntentFitment = z.infer<typeof intentFitmentResultSchema>;

/** Normalize Python snake_case or TS camelCase into IntentFitmentResult. */
export function normalizeIntentFitment(raw: unknown) {
  const parsed = intentFitmentResultSchema.parse(raw);
  const v = parsed.vehicle;
  return {
    vehicle: {
      year: v.year,
      make: v.make,
      model: v.model,
      engineConfiguration: v.engineConfiguration ?? v.engine_configuration ?? null,
      trim: v.trim,
      driveType: v.driveType ?? v.drive_type ?? null,
    },
    targetOperationKeys: parsed.targetOperationKeys ?? parsed.target_operation_keys ?? [],
    partsVariantFlags: parsed.partsVariantFlags ?? parsed.parts_variant_flags ?? [],
    positionHints: (parsed.positionHints ?? parsed.position_hints ?? []).map((p) =>
      p.toUpperCase(),
    ),
    confidence: parsed.confidence,
    unresolvedTokens: parsed.unresolvedTokens ?? parsed.unresolved_tokens ?? [],
  };
}

/** Drop any operation keys not present in the DB allow-list (defense in depth). */
export function gateOperationKeys(
  keys: string[],
  allowList: readonly string[],
): { kept: string[]; rejected: string[] } {
  const allowed = new Set(allowList);
  const kept: string[] = [];
  const rejected: string[] = [];
  for (const key of keys) {
    if (allowed.has(key)) kept.push(key);
    else rejected.push(key);
  }
  return { kept, rejected };
}
