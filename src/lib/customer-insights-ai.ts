import { z } from "zod";

export const CustomerInsightsActionTypeSchema = z.enum([
  "book",
  "call",
  "win_back",
  "follow_up",
  "none",
]);

export type CustomerInsightsActionType = z.infer<typeof CustomerInsightsActionTypeSchema>;

export type CustomerInsightsResult = {
  bullets: string[];
  suggestedAction: {
    type: CustomerInsightsActionType;
    label: string;
    rationale: string;
  };
};

export type CustomerInsightsCache = CustomerInsightsResult & {
  generatedAt: string;
};

const CustomerInsightsOutputSchema = z.object({
  bullets: z.array(z.string().trim().min(1).max(280)).min(1).max(6),
  suggestedAction: z.object({
    type: CustomerInsightsActionTypeSchema,
    label: z.string().trim().min(1).max(80),
    rationale: z.string().trim().min(1).max(240),
  }),
});

export function parseCustomerInsightsAiResponse(raw: string): CustomerInsightsResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid customer insights JSON.");
  }

  let parsed: z.infer<typeof CustomerInsightsOutputSchema>;
  try {
    parsed = CustomerInsightsOutputSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    throw new Error("AI returned invalid customer insights format.");
  }

  return {
    bullets: parsed.bullets.map((b) => b.slice(0, 280)),
    suggestedAction: {
      type: parsed.suggestedAction.type,
      label: parsed.suggestedAction.label.slice(0, 80),
      rationale: parsed.suggestedAction.rationale.slice(0, 240),
    },
  };
}

export function parseCustomerInsightsCache(raw: unknown): CustomerInsightsCache | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.generatedAt !== "string") return null;

  try {
    const result = CustomerInsightsOutputSchema.parse({
      bullets: o.bullets,
      suggestedAction: o.suggestedAction,
    });
    return {
      generatedAt: o.generatedAt,
      bullets: result.bullets,
      suggestedAction: result.suggestedAction,
    };
  } catch {
    return null;
  }
}

export const INSIGHTS_CACHE_TTL_MS = 86_400_000;

export function isInsightsCacheFresh(
  generatedAt: string,
  ttlMs = INSIGHTS_CACHE_TTL_MS,
): boolean {
  const ts = Date.parse(generatedAt);
  if (!Number.isFinite(ts)) return false;
  return Date.now() - ts < ttlMs;
}
