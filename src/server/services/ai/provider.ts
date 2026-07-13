import "server-only";

import type { AiFeature } from "@/generated/prisma";

export type AiProvider = "gemini" | "anthropic";

const ANTHROPIC_DEFAULT = "claude-haiku-4-5";
const GEMINI_DEFAULT = "gemini-flash-latest";

const FEATURE_MODEL_ENV: Record<AiFeature, readonly string[]> = {
  REVIEW_REPLY: ["REVIEW_REPLY_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  CAMPAIGN_DRAFT: ["CAMPAIGN_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  SEO_CONTENT: ["SEO_CONTENT_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  CUSTOMER_INSIGHTS: ["CUSTOMER_INSIGHTS_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  SMS_AFTER_HOURS: ["SMS_AGENT_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  VOICE_RECEPTIONIST: ["VOICE_AGENT_AI_MODEL", "SMS_AGENT_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  SUPPORT_FAQ: ["SUPPORT_AI_MODEL", "AI_DEFAULT_MODEL"],
  LABOR_GUIDE: ["LABOR_GUIDE_MODEL", "AI_DEFAULT_MODEL"],
  FREEFORM_RO_INTAKE: ["FREEFORM_RO_INTAKE_MODEL", "SMART_RO_INTAKE_MODEL", "GEMINI_DEFAULT_MODEL", "AI_DEFAULT_MODEL"],
};

/** Google Gemini API key — primary AI provider for ShopRally. */
export function geminiApiKey(): string | null {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    null
  );
}

export function anthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

/** Active provider: Gemini when keyed (default), else Anthropic. Override with AI_PROVIDER=gemini|anthropic. */
export function resolveAiProvider(): AiProvider | null {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced === "gemini") return geminiApiKey() ? "gemini" : null;
  if (forced === "anthropic") return anthropicApiKey() ? "anthropic" : null;
  if (geminiApiKey()) return "gemini";
  if (anthropicApiKey()) return "anthropic";
  return null;
}

export function isAnyAiProviderConfigured(): boolean {
  return resolveAiProvider() !== null;
}

function envModel(...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

function isGeminiModelName(model: string): boolean {
  return model.startsWith("gemini");
}

function isAnthropicModelName(model: string): boolean {
  return model.startsWith("claude");
}

/** Resolve model id for the active provider (maps Claude env vars → Gemini default when on Gemini). */
export function resolveAiModel(feature: AiFeature, provider: AiProvider): string {
  const fromEnv =
    envModel(...FEATURE_MODEL_ENV[feature]) ??
    (provider === "gemini"
      ? envModel("GEMINI_DEFAULT_MODEL", "AI_DEFAULT_MODEL")
      : envModel("AI_DEFAULT_MODEL"));

  if (provider === "gemini") {
    if (fromEnv && isGeminiModelName(fromEnv)) return fromEnv;
    return envModel("GEMINI_DEFAULT_MODEL") ?? GEMINI_DEFAULT;
  }

  if (fromEnv && isAnthropicModelName(fromEnv)) return fromEnv;
  if (fromEnv && !isGeminiModelName(fromEnv)) return fromEnv;
  return ANTHROPIC_DEFAULT;
}
