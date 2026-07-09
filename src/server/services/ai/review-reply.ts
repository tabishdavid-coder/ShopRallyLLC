import "server-only";

import type { ReviewReplyTone, ReviewReplyVariant } from "@/lib/review-reply-tone";
import { reviewReplyToneInstruction, reviewReplyVariantInstruction } from "@/lib/review-reply-tone";
import { createAiMessage, isAiConfigured } from "@/server/services/ai/client";

export type ReviewReplyContext = {
  shopName: string;
  city: string | null;
  state: string | null;
  reviewerName: string;
  starRating: number;
  comment: string | null;
  tone?: ReviewReplyTone;
  variant?: ReviewReplyVariant;
  currentDraft?: string;
};

/** @deprecated Use isAiConfigured from ai/client */
export function isReviewReplyAiConfigured(): boolean {
  return isAiConfigured();
}

export async function suggestGoogleReviewReply(
  shopId: string,
  ctx: ReviewReplyContext,
): Promise<string> {
  const place = [ctx.city, ctx.state].filter(Boolean).join(", ");
  const locationHint = place ? ` in ${place}` : "";
  const tone = ctx.tone ?? "friendly";
  const variantHint = reviewReplyVariantInstruction(ctx.variant ?? "default");

  const { text } = await createAiMessage({
    shopId,
    feature: "REVIEW_REPLY",
    maxTokens: 512,
    system:
      "You write public Google Business Profile review replies for an independent auto repair shop. " +
      reviewReplyToneInstruction(tone) +
      " Be concise (2–4 sentences, under 450 characters when possible). " +
      "Use the reviewer's first name when natural. Never invent visit details, prices, or promises. " +
      "For low ratings: apologize sincerely, take responsibility, and invite them to contact the shop " +
      "to make it right — include the shop phone only if provided. For high ratings: thank them and " +
      "invite them back. For rating-only reviews (no comment): thank them briefly for the stars. " +
      "Do not mention AI. Output only the reply text — no quotes or labels.",
    userContent:
      `Shop: ${ctx.shopName}${locationHint}\n` +
      `Reviewer: ${ctx.reviewerName}\n` +
      `Star rating: ${ctx.starRating} out of 5\n` +
      `Review text: ${ctx.comment?.trim() || "(No written review — rating only)"}\n` +
      (ctx.currentDraft?.trim() ? `Current draft to refine:\n${ctx.currentDraft.trim()}\n` : "") +
      (variantHint ? `${variantHint}\n` : "") +
      "\nWrite the shop owner's reply:",
  });

  if (!text) {
    throw new Error("AI did not return a reply. Try again or write one manually.");
  }

  return text.slice(0, 4096);
}
