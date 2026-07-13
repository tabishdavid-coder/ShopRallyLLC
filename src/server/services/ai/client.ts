import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

import { prisma } from "@/db/client";
import type { AiFeature } from "@/generated/prisma";
import {
  anthropicApiKey,
  geminiModelCandidates,
  isAnyAiProviderConfigured,
  resolveAiModel,
  resolveAiProvider,
  type AiProvider,
} from "@/server/services/ai/provider";
import { friendlyGeminiError, geminiGenerateText, type GeminiGenerateResult } from "@/server/services/ai/gemini";

export type { AiFeature };
export type { AiProvider };
export { resolveAiProvider, geminiApiKey, anthropicApiKey } from "@/server/services/ai/provider";

/** True when Gemini or Anthropic API key is present. */
export function isAiConfigured(): boolean {
  return isAnyAiProviderConfigured();
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
  provider: AiProvider;
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
        model: `${args.provider}:${args.model}`,
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
  provider: AiProvider;
  inputTokens: number;
  outputTokens: number;
};

async function callAnthropicText(
  input: CreateAiMessageInput,
  model: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const client = new Anthropic({ apiKey: anthropicApiKey() ?? undefined });
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

  return {
    text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}

/** Shared AI call — Gemini (preferred) or Anthropic, with rate limit + usage log. */
export async function createAiMessage(input: CreateAiMessageInput): Promise<CreateAiMessageResult> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new Error("AI is not configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.");
  }

  if (input.shopId) {
    await assertShopAiRateLimit(input.shopId);
  }

  const model = resolveAiModel(input.feature, provider);

  try {
    const result =
      provider === "gemini"
        ? await geminiGenerateText({
            model,
            models: geminiModelCandidates(input.feature),
            system: input.system,
            user: input.userContent,
            maxTokens: input.maxTokens,
          })
        : await callAnthropicText(input, model);

    const usedModel =
      provider === "gemini" ? (result as GeminiGenerateResult).model : model;

    await logAiUsage({
      shopId: input.shopId ?? null,
      feature: input.feature,
      model: usedModel,
      provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    return {
      text: result.text,
      model: usedModel,
      provider,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  } catch (err) {
    if (provider === "gemini") throw new Error(friendlyGeminiError(err));
    throw err;
  }
}

export type CreateAiJsonMessageInput<T extends z.ZodType> = CreateAiMessageInput & {
  schema: T;
};

/** Structured JSON output — Zod-validated; uses native JSON mode on Gemini. */
export async function createAiJsonMessage<T extends z.ZodType>(
  input: CreateAiJsonMessageInput<T>,
): Promise<{ data: z.infer<T>; model: string; provider: AiProvider }> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new Error("AI is not configured. Set GEMINI_API_KEY or ANTHROPIC_API_KEY.");
  }

  if (input.shopId) {
    await assertShopAiRateLimit(input.shopId);
  }

  const model = resolveAiModel(input.feature, provider);

  if (provider === "gemini") {
    try {
      const gemini = await geminiGenerateText({
        model,
        models: geminiModelCandidates(input.feature),
        system: `${input.system}\n\nRespond with valid JSON only. No markdown.`,
        user: input.userContent,
        maxTokens: input.maxTokens ?? 2048,
        json: true,
      });

      await logAiUsage({
        shopId: input.shopId ?? null,
        feature: input.feature,
        model: gemini.model ?? model,
        provider,
        inputTokens: gemini.inputTokens,
        outputTokens: gemini.outputTokens,
      });

      const parsed = input.schema.safeParse(JSON.parse(gemini.text));
      if (!parsed.success) {
        throw new Error("AI returned JSON that did not match the expected schema.");
      }
      return { data: parsed.data, model: gemini.model ?? model, provider };
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("AI returned JSON")) throw err;
      throw new Error(friendlyGeminiError(err));
    }
  }

  const client = new Anthropic({ apiKey: anthropicApiKey() ?? undefined });
  const response = await client.messages.parse({
    model,
    max_tokens: input.maxTokens ?? 2048,
    system: input.system,
    messages: [{ role: "user", content: input.userContent }],
    output_config: { format: zodOutputFormat(input.schema) },
  });

  await logAiUsage({
    shopId: input.shopId ?? null,
    feature: input.feature,
    model,
    provider,
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  });

  if (!response.parsed_output) {
    throw new Error("AI returned no structured output.");
  }

  return { data: response.parsed_output as z.infer<T>, model, provider };
}
