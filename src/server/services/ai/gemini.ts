import "server-only";

import { GoogleGenerativeAI, type ResponseSchema } from "@google/generative-ai";

import { geminiApiKey } from "@/server/services/ai/provider";

export type GeminiGenerateResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
};

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fence?.[1]?.trim() ?? trimmed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Transient Google overload / quota — safe to retry or try another model. */
export function isRetryableGeminiError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /503|429|500|502|504|high demand|unavailable|overloaded|RESOURCE_EXHAUSTED|try again later/i.test(
    msg,
  );
}

/** Model id deprecated or blocked for this API key — try the next candidate. */
export function isUnavailableGeminiModelError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /404|not found|not supported|no longer available/i.test(msg);
}

/** Short user-facing message — hides SDK noise and long URLs. */
export function friendlyGeminiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/503|high demand|try again later/i.test(msg)) {
    return "Gemini is temporarily busy (high demand on Google's side). Wait a few seconds and tap Parse with AI again.";
  }
  if (/429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(msg)) {
    return "Gemini rate limit reached. Wait a minute and try again, or check quota in Google AI Studio.";
  }
  if (/401|403|API key|PERMISSION_DENIED|invalid.*key/i.test(msg)) {
    return "Gemini API key is missing or invalid. Check GEMINI_API_KEY in your server environment.";
  }
  if (/404|not found|not supported|no longer available/i.test(msg)) {
    return "Gemini model not available for this API key. Set GEMINI_DEFAULT_MODEL=gemini-3.1-flash-lite in .env.";
  }
  if (msg.length > 160) {
    return "AI parse failed. Try again in a moment or use manual intake.";
  }
  return msg;
}

async function geminiGenerateTextOnce(args: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  responseSchema?: ResponseSchema;
}): Promise<GeminiGenerateResult> {
  const key = geminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: args.model,
    systemInstruction: args.system,
    generationConfig: {
      maxOutputTokens: args.maxTokens ?? 1024,
      ...(args.json
        ? {
            responseMimeType: "application/json" as const,
            ...(args.responseSchema ? { responseSchema: args.responseSchema } : {}),
          }
        : {}),
    },
  });

  const result = await model.generateContent(args.user);
  const response = result.response;
  const text = stripJsonFences(response.text()?.trim() ?? "");

  const usage = response.usageMetadata;
  return {
    text,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
    model: args.model,
  };
}

export async function geminiGenerateText(args: {
  model: string;
  models?: string[];
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
  responseSchema?: ResponseSchema;
}): Promise<GeminiGenerateResult> {
  const candidates = args.models?.length
    ? args.models
    : [args.model];
  const maxAttemptsPerModel = 3;
  let lastErr: unknown;

  for (const model of candidates) {
    for (let attempt = 0; attempt < maxAttemptsPerModel; attempt++) {
      try {
        return await geminiGenerateTextOnce({
          model,
          system: args.system,
          user: args.user,
          maxTokens: args.maxTokens,
          json: args.json,
          responseSchema: args.responseSchema,
        });
      } catch (err) {
        lastErr = err;
        const retryable = isRetryableGeminiError(err);
        const unavailableModel = isUnavailableGeminiModelError(err);
        const hasMoreAttempts = attempt < maxAttemptsPerModel - 1;
        if (retryable && hasMoreAttempts) {
          await sleep(400 * 2 ** attempt);
          continue;
        }
        if (retryable || unavailableModel) break;
        throw err;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
