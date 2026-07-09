import { z } from "zod";

export type SmsAgentLeadDraft = {
  firstName?: string;
  lastName?: string;
  concern?: string;
  preferredDate?: string;
  preferredTime?: string;
};

export type SmsAgentTurnResult = {
  reply: string;
  lead: SmsAgentLeadDraft;
  readyToBook: boolean;
};

const LeadDraftSchema = z.object({
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  concern: z.string().trim().max(500).optional(),
  preferredDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  preferredTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
});

const SmsAgentOutputSchema = z.object({
  reply: z.string().trim().min(1).max(480),
  lead: LeadDraftSchema.default({}),
  readyToBook: z.boolean().default(false),
});

export function parseSmsAgentAiResponse(raw: string): SmsAgentTurnResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid SMS agent JSON.");
  }

  let parsed: z.infer<typeof SmsAgentOutputSchema>;
  try {
    parsed = SmsAgentOutputSchema.parse(JSON.parse(jsonMatch[0]));
  } catch {
    throw new Error("AI returned invalid SMS agent format.");
  }

  return {
    reply: parsed.reply.slice(0, 480),
    lead: parsed.lead ?? {},
    readyToBook: parsed.readyToBook,
  };
}

export function leadReadyToBook(lead: SmsAgentLeadDraft): boolean {
  return Boolean(
    lead.firstName?.trim() &&
      lead.lastName?.trim() &&
      lead.concern?.trim() &&
      lead.preferredDate?.trim() &&
      lead.preferredTime?.trim(),
  );
}
