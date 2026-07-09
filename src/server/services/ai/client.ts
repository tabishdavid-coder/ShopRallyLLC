import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/db/client";
import type { AiFeature } from "@/generated/prisma";

export type { AiFeature };

const DEFAULT_MODEL = "claude-haiku-4-5";

const FEATURE_MODEL_ENV: Record<AiFeature, readonly string[]> = {
  REVIEW_REPLY: ["REVIEW_REPLY_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  CAMPAIGN_DRAFT: ["CAMPAIGN_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  SEO_CONTENT: ["SEO_CONTENT_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  CUSTOMER_INSIGHTS: ["CUSTOMER_INSIGHTS_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  SMS_AFTER_HOURS: ["SMS_AGENT_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  VOICE_RECEPTIONIST: ["VOICE_AGENT_AI_MODEL", "SMS_AGENT_AI_MODEL", "AI_DEFAULT_MODEL", "SUPPORT_AI_MODEL"],
  SUPPORT_FAQ: ["SUPPORT_AI_MODEL", "AI_DEFAULT_MODEL"],
  LABOR_GUIDE: ["LABOR_GUIDE_MODEL", "AI_DEFAULT_MODEL"],
};

/** True when Anthropic API key is present — all Overdrive AI features depend on this. */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function resolveAiModel(feature: AiFeature): string {
  for (const key of FEATURE_MODEL_ENV[feature]) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return DEFAULT_MODEL;
}

function dailyLimitPerShop(): number {
  const raw = process.env.AI_DAILY_LIMIT_PER_SHOP?.trim();
  if (!raw) return 200;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 200;
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Throws when shop exceeds daily AI call cap (UTC day). */
export async function assertShopAiRateLimit(shopId: string): Promise<void> {
  const limit = dailyLimitPerShop();
  const count = await prisma.aiUsageLog.count({
    where: {
      shopId,
      createdAt: { gte: startOfUtcDay() },
    },
  });
  if (count >= limit) {
    throw new Error(
      `Daily AI limit reached (${limit} requests per shop). Try again tomorrow or contact support.`,
    );
  }
}

async function logAiUsage(args: {
  shopId: string | null;
  feature: AiFeature;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}): Promise<void> {
  const totalTokens =
    args.inputTokens != null && args.outputTokens != null
      ? args.inputTokens + args.outputTokens
      : null;

  try {
    await prisma.aiUsageLog.create({
      data: {
        shopId: args.shopId,
        feature: args.feature,
        model: args.model,
        inputTokens: args.inputTokens,
        outputTokens: args.outputTokens,
        totalTokens,
      },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[ai-usage-log]", err);
    }
  }
}

export type CreateAiMessageInput = {
  shopId?: string | null;
  feature: AiFeature;
  system: string;
  userContent: string;
  maxTokens?: number;
};

export type CreateAiMessageResult = {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/** Shared Anthropic call — rate limit, usage log, and model routing. */
export async function createAiMessage(input: CreateAiMessageInput): Promise<CreateAiMessageResult> {
  if (!isAiConfigured()) {
    throw new Error("AI is not configured on this platform.");
  }

  if (input.shopId) {
    await assertShopAiRateLimit(input.shopId);
  }

  const model = resolveAiModel(input.feature);
  const client = new Anthropic();

  const response = await client.messages.create({
    model,
    max_tokens: input.maxTokens ?? 1024,
    system: input.system,
    messages: [{ role: "user", content: input.userContent }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  const inputTokens = response.usage?.input_tokens ?? null;
  const outputTokens = response.usage?.output_tokens ?? null;

  await logAiUsage({
    shopId: input.shopId ?? null,
    feature: input.feature,
    model,
    inputTokens,
    outputTokens,
  });

  return {
    text,
    model,
    inputTokens: inputTokens ?? 0,
    outputTokens: outputTokens ?? 0,
  };
}
