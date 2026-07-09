export type ReviewReplyTone = "friendly" | "formal";

export type ReviewReplyVariant = "default" | "shorter" | "longer";

export const REVIEW_REPLY_TONES: { value: ReviewReplyTone; label: string; description: string }[] = [
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, conversational — great for most independent shops.",
  },
  {
    value: "formal",
    label: "Formal",
    description: "Professional and polished — best for luxury or corporate brands.",
  },
];

export function parseReviewReplyTone(raw: string | null | undefined): ReviewReplyTone {
  return raw === "formal" ? "formal" : "friendly";
}

export function reviewReplyToneInstruction(tone: ReviewReplyTone): string {
  if (tone === "formal") {
    return (
      "Use a formal, professional tone — courteous but not overly casual. " +
      "Avoid slang and exclamation marks unless thanking for a 5-star review."
    );
  }
  return (
    "Use a warm, friendly tone — conversational and approachable, like a trusted neighborhood shop. " +
    "Sound human, not corporate."
  );
}

export function reviewReplyVariantInstruction(variant: ReviewReplyVariant): string {
  if (variant === "shorter") {
    return "Make this version shorter — 1–2 sentences, under 220 characters when possible.";
  }
  if (variant === "longer") {
    return "Make this version slightly longer — up to 4 sentences with a bit more warmth or detail.";
  }
  return "";
}
