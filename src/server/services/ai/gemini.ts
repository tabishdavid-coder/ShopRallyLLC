import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { geminiApiKey } from "@/server/services/ai/provider";

export type GeminiGenerateResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
};

function stripJsonFences(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fence?.[1]?.trim() ?? trimmed;
}

export async function geminiGenerateText(args: {
  model: string;
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}): Promise<GeminiGenerateResult> {
  const key = geminiApiKey();
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");

  const client = new GoogleGenerativeAI(key);
  const model = client.getGenerativeModel({
    model: args.model,
    systemInstruction: args.system,
    generationConfig: {
      maxOutputTokens: args.maxTokens ?? 1024,
      ...(args.json ? { responseMimeType: "application/json" as const } : {}),
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
  };
}
