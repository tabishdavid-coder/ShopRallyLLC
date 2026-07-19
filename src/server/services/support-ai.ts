import "server-only";

import { BRAND } from "@/lib/brand";
import { createAiMessage, isAiConfigured } from "@/server/services/ai/client";

export type SupportAiAnswer = {
  answer: string;
  source: "ai" | "keyword";
  relatedSlugs: string[];
};

export function isSupportAiEnabled(): boolean {
  return isAiConfigured();
}

export async function askSupportAi(
  question: string,
  faqContext: string,
): Promise<SupportAiAnswer> {
  const { text } = await createAiMessage({
    feature: "SUPPORT_FAQ",
    maxTokens: 768,
    system:
      "You are ShopRally product support. Answer shop owners' questions about using " +
      "the auto repair shop CRM. Be concise, accurate, and friendly. Use ONLY the FAQ " +
      "context provided — if the answer is not in the context, say so and suggest contacting " +
      `${BRAND.supportEmail}. Do not invent features. Format with short paragraphs or bullets.`,
    userContent: `FAQ knowledge base:\n\n${faqContext}\n\n---\n\nUser question: ${question.trim()}`,
  });

  return {
    answer: text || `I couldn't find an answer. Please contact ${BRAND.supportEmail}.`,
    source: "ai",
    relatedSlugs: [],
  };
}
