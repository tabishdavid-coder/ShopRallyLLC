import "server-only";

import { z } from "zod";

import type { CampaignChannel, CampaignType } from "@/generated/prisma";
import { getCampaignTemplate, MERGE_FIELDS } from "@/lib/campaigns";
import { createAiMessage, isAiConfigured } from "@/server/services/ai/client";

export type CampaignDraftContext = {
  shopName: string;
  city: string | null;
  state: string | null;
  campaignName: string;
  campaignType: CampaignType;
  channel: CampaignChannel;
  currentMessage?: string;
  currentEmailSubject?: string;
};

export type CampaignDraftResult = {
  message: string;
  emailSubject?: string;
};

const DraftOutputSchema = z.object({
  message: z.string().min(1),
  emailSubject: z.string().optional(),
});

/** @deprecated Use isAiConfigured from ai/client */
export function isCampaignAiConfigured(): boolean {
  return isAiConfigured();
}

function campaignTypeLabel(type: CampaignType, name: string): string {
  if (type === "CUSTOM") return name || "Custom campaign";
  return getCampaignTemplate(type)?.name ?? type.replaceAll("_", " ");
}

function campaignTypeDescription(type: CampaignType): string {
  if (type === "CUSTOM") {
    return "A one-off promotional or informational message to customers.";
  }
  return getCampaignTemplate(type)?.description ?? "";
}

export async function suggestCampaignMessage(
  shopId: string,
  ctx: CampaignDraftContext,
): Promise<CampaignDraftResult> {
  const place = [ctx.city, ctx.state].filter(Boolean).join(", ");
  const locationHint = place ? ` in ${place}` : "";
  const mergeTokens = MERGE_FIELDS.map((f) => f.token).join(", ");
  const needsEmailSubject = ctx.channel === "EMAIL" || ctx.channel === "BOTH";
  const smsLike = ctx.channel === "SMS" || ctx.channel === "BOTH";

  const { text: raw } = await createAiMessage({
    shopId,
    feature: "CAMPAIGN_DRAFT",
    maxTokens: 1024,
    system:
      "You write marketing copy for an independent auto repair shop's customer outreach campaigns. " +
      "Use the provided merge tokens exactly as written (e.g. {customer_name}) — do not replace them " +
      "with sample names. Be friendly and professional, not pushy. Comply with TCPA-style opt-in " +
      "messaging (no false urgency). Do not mention AI. " +
      (smsLike
        ? "For SMS: keep the message under 300 characters when possible, one short paragraph."
        : "For email body: 2–4 short sentences.") +
      (needsEmailSubject ? " Also provide a concise email subject line when email is used." : ""),
    userContent:
      `Shop: ${ctx.shopName}${locationHint}\n` +
      `Campaign: ${ctx.campaignName}\n` +
      `Type: ${campaignTypeLabel(ctx.campaignType, ctx.campaignName)}\n` +
      `Purpose: ${campaignTypeDescription(ctx.campaignType)}\n` +
      `Channel: ${ctx.channel}\n` +
      `Merge tokens available: ${mergeTokens}\n` +
      (ctx.currentMessage?.trim()
        ? `Current draft to improve (optional):\n${ctx.currentMessage.trim()}\n`
        : "") +
      (ctx.currentEmailSubject?.trim()
        ? `Current email subject (optional):\n${ctx.currentEmailSubject.trim()}\n`
        : "") +
      `\nRespond with JSON only: {"message":"...","emailSubject":"..."}` +
      (needsEmailSubject ? "" : ' — omit emailSubject or set to ""'),
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI did not return a valid draft. Try again or edit manually.");
  }

  let parsed: z.infer<typeof DraftOutputSchema>;
  try {
    parsed = DraftOutputSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    throw new Error("AI returned an invalid draft format. Try again.");
  }

  const message = parsed.message.trim().slice(0, 1600);
  const emailSubject = parsed.emailSubject?.trim().slice(0, 200);

  if (!message) {
    throw new Error("AI returned an empty message.");
  }

  return {
    message,
    ...(needsEmailSubject && emailSubject ? { emailSubject } : {}),
  };
}
