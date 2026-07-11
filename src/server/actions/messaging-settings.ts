"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { getAppUrl } from "@/lib/app-url";
import { DEFAULT_SMS_OPT_OUT_FOOTER, deriveShopSmsSetupStatus, type ShopSmsSetupStatus } from "@/lib/sms-constants";
import { getShopId } from "@/lib/shop";
import { normalizePhoneE164 } from "@/lib/phone";
import { canUseReleasedFeature } from "@/lib/subscription";
import { PLANS } from "@/lib/plans";
import { AgreementType } from "@/generated/prisma";
import { shopHasCurrentAgreement } from "@/server/legal";
import type { ShopActionResult } from "@/server/actions/shop";
import { listConversations, getCustomerMessageStub, type ConversationRow } from "@/server/messages-inbox";
import {
  listMessages as listMessagesService,
  markThreadRead,
} from "@/server/services/messaging";
import { twilioPlatformConfigured } from "@/server/services/sms";
import { getSmsWebhookUrl, getVoiceWebhookUrl } from "@/server/actions/platform-sms";
import { listShopVoiceCallLogs, type VoiceCallLogRow } from "@/server/voice-call-log";
import { gates } from "@/server/permission-gates";

const MessagingSettingsInput = z.object({
  landlineNumber: z.string().trim().max(30).optional(),
  twilioPhoneNumber: z.string().trim().max(20).optional(),
  twilioMessagingServiceSid: z.string().trim().max(40).optional(),
  smsOptOutFooter: z.string().trim().max(160).optional(),
  smsEnabled: z.boolean(),
  aiSmsAgentEnabled: z.boolean().optional(),
  aiVoiceAgentEnabled: z.boolean().optional(),
});

export type MessagingSettings = {
  landlineNumber: string | null;
  twilioPhoneNumber: string | null;
  twilioMessagingServiceSid: string | null;
  smsOptOutFooter: string | null;
  smsEnabled: boolean;
  smsConfiguredAt: Date | null;
  setupStatus: ShopSmsSetupStatus;
  platformTwilioConfigured: boolean;
  webhookUrl: string;
  voiceWebhookUrl: string;
  appUrl: string;
  smsAddendumAccepted: boolean;
  smsAddendumVersion: string | null;
  aiReceptionist: boolean;
  aiSmsAgentEnabled: boolean;
  aiVoiceAgentEnabled: boolean;
  voiceCallLogs: VoiceCallLogRow[];
};

export async function getMessagingSettings(): Promise<MessagingSettings> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) {
    return {
      landlineNumber: null,
      twilioPhoneNumber: null,
      twilioMessagingServiceSid: null,
      smsOptOutFooter: DEFAULT_SMS_OPT_OUT_FOOTER,
      smsEnabled: false,
      smsConfiguredAt: null,
      setupStatus: deriveShopSmsSetupStatus({
        landlineNumber: null,
        twilioPhoneNumber: null,
        smsEnabled: false,
      }),
      platformTwilioConfigured: twilioPlatformConfigured(),
      webhookUrl: "",
      voiceWebhookUrl: "",
      appUrl: getAppUrl(),
      smsAddendumAccepted: false,
      smsAddendumVersion: null,
      aiReceptionist: false,
      aiSmsAgentEnabled: false,
      aiVoiceAgentEnabled: false,
      voiceCallLogs: [],
    };
  }

  const [shop, webhookUrl, voiceWebhookUrl, smsAddendumAccepted, smsAddendumDoc, aiReceptionist, voiceCallLogs] =
    await Promise.all([
    prisma.shop.findFirst({
      where: { id: shopId },
      select: {
        landlineNumber: true,
        twilioPhoneNumber: true,
        twilioMessagingServiceSid: true,
        smsOptOutFooter: true,
        smsEnabled: true,
        smsConfiguredAt: true,
        aiSmsAgentEnabled: true,
        aiVoiceAgentEnabled: true,
      },
    }),
    getSmsWebhookUrl(),
    getVoiceWebhookUrl(),
    shopHasCurrentAgreement(shopId, AgreementType.SMS_ADDENDUM),
    prisma.agreementDocument.findFirst({
      where: { type: AgreementType.SMS_ADDENDUM, isCurrent: true },
      select: { version: true },
    }),
    canUseReleasedFeature(shopId, "ai_receptionist"),
    listShopVoiceCallLogs(25),
  ]);

  const row = {
    landlineNumber: shop?.landlineNumber ?? null,
    twilioPhoneNumber: shop?.twilioPhoneNumber ?? null,
    smsEnabled: shop?.smsEnabled ?? false,
  };

  return {
    landlineNumber: row.landlineNumber,
    twilioPhoneNumber: row.twilioPhoneNumber,
    twilioMessagingServiceSid: shop?.twilioMessagingServiceSid ?? null,
    smsOptOutFooter: shop?.smsOptOutFooter ?? DEFAULT_SMS_OPT_OUT_FOOTER,
    smsEnabled: row.smsEnabled,
    smsConfiguredAt: shop?.smsConfiguredAt ?? null,
    setupStatus: deriveShopSmsSetupStatus(row),
    platformTwilioConfigured: twilioPlatformConfigured(),
    webhookUrl,
    voiceWebhookUrl,
    appUrl: getAppUrl(),
    smsAddendumAccepted,
    smsAddendumVersion: smsAddendumDoc?.version ?? null,
    aiReceptionist,
    aiSmsAgentEnabled: shop?.aiSmsAgentEnabled ?? false,
    aiVoiceAgentEnabled: shop?.aiVoiceAgentEnabled ?? false,
    voiceCallLogs,
  };
}

export async function updateMessagingSettings(
  input: z.infer<typeof MessagingSettingsInput>,
): Promise<ShopActionResult> {
  const parsed = MessagingSettingsInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const landline = parsed.data.landlineNumber?.trim() || null;
  let twilio = parsed.data.twilioPhoneNumber?.trim() || null;
  const messagingSid = parsed.data.twilioMessagingServiceSid?.trim() || null;
  const optOutFooter = parsed.data.smsOptOutFooter?.trim() || DEFAULT_SMS_OPT_OUT_FOOTER;

  if (twilio) {
    const normalized = normalizePhoneE164(twilio);
    const digits = normalized.replace(/\D/g, "");
    if (digits.length < 10) {
      return { ok: false, error: "Enter a valid E.164 SMS number (e.g. +15551234567)." };
    }
    twilio = normalized;
  }

  const isProd = process.env.NODE_ENV === "production";
  if (parsed.data.smsEnabled && !twilio && !messagingSid) {
    if (isProd) {
      return {
        ok: false,
        error: "Set a Twilio SMS number before enabling SMS for this shop.",
      };
    }
    if (!process.env.TWILIO_FROM_NUMBER?.trim()) {
      return {
        ok: false,
        error: "Set a Twilio SMS number before enabling SMS (or TWILIO_FROM_NUMBER for local dev only).",
      };
    }
  }

  if (twilio) {
    const taken = await prisma.shop.findFirst({
      where: { twilioPhoneNumber: twilio, id: { not: shopId } },
      select: { name: true },
    });
    if (taken) {
      return { ok: false, error: `That SMS number is already assigned to ${taken.name}.` };
    }
  }

  if (parsed.data.smsEnabled) {
    const smsAddendumAccepted = await shopHasCurrentAgreement(
      shopId,
      AgreementType.SMS_ADDENDUM,
    );
    if (!smsAddendumAccepted) {
      return {
        ok: false,
        error: "Accept the SMS & Messaging Addendum and TCPA acknowledgment before enabling SMS.",
      };
    }
  }

  const configuredNow = Boolean(parsed.data.smsEnabled && twilio);
  const existing = await prisma.shop.findFirst({
    where: { id: shopId },
    select: { smsConfiguredAt: true, twilioPhoneNumber: true },
  });

  if (parsed.data.aiSmsAgentEnabled === true) {
    const allowed = await canUseReleasedFeature(shopId, "ai_receptionist");
    if (!allowed) {
      return {
        ok: false,
        error: `AI SMS after-hours agent requires ${PLANS.ENTERPRISE.name} (AI receptionist).`,
      };
    }
  }

  if (parsed.data.aiVoiceAgentEnabled === true) {
    const allowed = await canUseReleasedFeature(shopId, "ai_receptionist");
    if (!allowed) {
      return {
        ok: false,
        error: `AI voice receptionist requires ${PLANS.ENTERPRISE.name} (AI receptionist).`,
      };
    }
    const voiceNumber = twilio ?? existing?.twilioPhoneNumber;
    if (!voiceNumber) {
      return {
        ok: false,
        error: "Configure a Twilio phone number before enabling the voice receptionist.",
      };
    }
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      landlineNumber: landline,
      twilioPhoneNumber: twilio,
      twilioMessagingServiceSid: messagingSid,
      smsOptOutFooter: optOutFooter,
      smsEnabled: parsed.data.smsEnabled,
      ...(parsed.data.aiSmsAgentEnabled !== undefined
        ? { aiSmsAgentEnabled: parsed.data.aiSmsAgentEnabled }
        : {}),
      ...(parsed.data.aiVoiceAgentEnabled !== undefined
        ? { aiVoiceAgentEnabled: parsed.data.aiVoiceAgentEnabled }
        : {}),
      ...(configuredNow && !existing?.smsConfiguredAt ? { smsConfiguredAt: new Date() } : {}),
    },
  });

  revalidatePath("/settings/communications/phone-sms");
  revalidatePath("/messages");
  revalidatePath("/platform/shops");
  return { ok: true };
}

export async function getInboxConversations(): Promise<ConversationRow[]> {
  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return [];
  return listConversations(shopId);
}

/** Inbox list with optional deep-link customer prepended when they have no thread yet. */
export async function getInboxConversationsForCustomer(
  customerId?: string | null,
): Promise<ConversationRow[]> {
  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return [];
  const conversations = await listConversations(shopId);
  if (!customerId || conversations.some((c) => c.customerId === customerId)) {
    return conversations;
  }
  const stub = await getCustomerMessageStub(shopId, customerId);
  return stub ? [stub, ...conversations] : conversations;
}

export async function openConversation(customerId: string) {
  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return [];

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: { id: true },
  });
  if (!customer) return [];
  await markThreadRead(shopId, customerId);
  revalidatePath("/messages");
  return listMessagesService({ shopId, customerId });
}
