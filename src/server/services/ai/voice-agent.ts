import "server-only";

import type { SmsAgentLeadDraft } from "@/lib/sms-agent-ai";
import { parseSmsAgentAiResponse } from "@/lib/sms-agent-ai";
import { createAiMessage } from "@/server/services/ai/client";

export type VoiceAgentShopContext = {
  shopName: string;
  shopPhone: string | null;
  bookingSlug: string | null;
  onlineBookingEnabled: boolean;
  services: string[];
};

export type VoiceAgentTurnInput = {
  inboundSpeech: string;
  priorLead: SmsAgentLeadDraft;
  recentTranscript: string;
  shop: VoiceAgentShopContext;
};

export async function suggestVoiceAgentReply(
  shopId: string,
  input: VoiceAgentTurnInput,
): Promise<ReturnType<typeof parseSmsAgentAiResponse>> {
  const bookingHint = input.shop.onlineBookingEnabled
    ? `Online booking slug: ${input.shop.bookingSlug ?? "n/a"}`
    : "Online booking is off — collect preferred date/time for staff to confirm.";

  const servicesBlock =
    input.shop.services.length > 0
      ? input.shop.services.join(", ")
      : "General auto repair";

  const leadBlock = JSON.stringify(input.priorLead);

  const { text: raw } = await createAiMessage({
    shopId,
    feature: "VOICE_RECEPTIONIST",
    maxTokens: 768,
    system:
      "You are the after-hours phone receptionist for an independent auto repair shop. " +
      "Be warm, concise, and speak naturally (replies will be read aloud — under 220 characters when possible). " +
      "Collect: first name, last name, service concern, preferred appointment date (YYYY-MM-DD), " +
      "and preferred time (HH:mm 24h). One question at a time when info is missing. " +
      "Do not invent shop hours, prices, or appointments. " +
      "When you have all fields, set readyToBook true and confirm the details. " +
      "If the caller only wants to leave a message, capture concern + name and set readyToBook false. " +
      "Do not mention AI. Respond with JSON only.",
    userContent:
      `Shop: ${input.shop.shopName}\n` +
      `Shop phone: ${input.shop.shopPhone ?? "on file"}\n` +
      `${bookingHint}\n` +
      `Services: ${servicesBlock}\n` +
      `Known lead draft: ${leadBlock}\n` +
      `Recent conversation:\n${input.recentTranscript || "(new call)"}\n\n` +
      `Caller said: ${input.inboundSpeech}\n\n` +
      `JSON: {"reply":"...","lead":{"firstName":"","lastName":"","concern":"","preferredDate":"YYYY-MM-DD","preferredTime":"HH:mm"},"readyToBook":false}`,
  });

  return parseSmsAgentAiResponse(raw);
}
