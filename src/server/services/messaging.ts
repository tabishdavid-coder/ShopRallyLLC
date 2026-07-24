import "server-only";

import { prisma } from "@/db/client";
import { ROStatus } from "@/generated/prisma";
import type { MessageRow } from "@/lib/messaging-types";
import {
  DEFAULT_SMS_OPT_OUT_FOOTER,
  deriveShopSmsSetupStatus,
  isSmsStopKeyword,
  type ShopSmsSetupStatus,
} from "@/lib/sms-constants";
import { SMS_ENABLED } from "@/lib/features";
import { digitsOf, normalizePhoneE164, phoneMatchKey } from "@/lib/phone";
import { releasedFeatureDenied } from "@/lib/subscription";
import { appendOptOutFooter, getSms } from "@/server/services/sms";
import { ShopAuditEventType } from "@/generated/prisma";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type { MessageRow };

export type SendSmsOptions = {
  customerId?: string;
  repairOrderId?: string;
  /** Skip opt-out footer (e.g. customer already opted in to thread). */
  skipOptOutFooter?: boolean;
  /** Skip per-message audit (e.g. batched campaign sends). */
  skipAudit?: boolean;
};

export type SendSmsResult = {
  messageId: string;
  mode: "live" | "mock";
  status: string;
  sid?: string;
};

export type ShopSmsConfig = {
  smsEnabled: boolean;
  twilioPhoneNumber: string | null;
  twilioMessagingServiceSid: string | null;
  smsOptOutFooter: string | null;
};

export type ShopSmsStatus = ShopSmsConfig & {
  setupStatus: ShopSmsSetupStatus;
  landlineNumber: string | null;
  smsConfiguredAt: Date | null;
  lastMessageAt: Date | null;
};

async function getShopSmsConfig(shopId: string): Promise<ShopSmsConfig> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: {
      smsEnabled: true,
      twilioPhoneNumber: true,
      twilioMessagingServiceSid: true,
      smsOptOutFooter: true,
    },
  });
  return {
    smsEnabled: shop?.smsEnabled ?? false,
    twilioPhoneNumber: shop?.twilioPhoneNumber ?? null,
    twilioMessagingServiceSid: shop?.twilioMessagingServiceSid ?? null,
    smsOptOutFooter: shop?.smsOptOutFooter ?? null,
  };
}

/** Full SMS status for settings UI and platform admin. */
export async function getShopSmsStatus(shopId: string): Promise<ShopSmsStatus | null> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: {
      smsEnabled: true,
      twilioPhoneNumber: true,
      twilioMessagingServiceSid: true,
      smsOptOutFooter: true,
      landlineNumber: true,
      smsConfiguredAt: true,
    },
  });
  if (!shop) return null;

  const lastMsg = await prisma.message.findFirst({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  return {
    smsEnabled: shop.smsEnabled,
    twilioPhoneNumber: shop.twilioPhoneNumber,
    twilioMessagingServiceSid: shop.twilioMessagingServiceSid,
    smsOptOutFooter: shop.smsOptOutFooter,
    landlineNumber: shop.landlineNumber,
    smsConfiguredAt: shop.smsConfiguredAt,
    lastMessageAt: lastMsg?.createdAt ?? null,
    setupStatus: deriveShopSmsSetupStatus(shop),
  };
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Resolve the outbound From number for a shop.
 * Production requires per-shop twilioPhoneNumber (or messaging service SID).
 * Dev may fall back to TWILIO_FROM_NUMBER with a console warning.
 */
function resolveFromNumber(config: ShopSmsConfig): {
  fromNumber: string | null;
  messagingServiceSid: string | null;
} {
  const messagingServiceSid =
    config.twilioMessagingServiceSid?.trim() ||
    process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() ||
    null;

  if (config.smsEnabled && config.twilioPhoneNumber?.trim()) {
    return { fromNumber: config.twilioPhoneNumber.trim(), messagingServiceSid };
  }

  if (config.smsEnabled && messagingServiceSid) {
    return { fromNumber: null, messagingServiceSid };
  }

  if (isProduction()) {
    return { fromNumber: null, messagingServiceSid: null };
  }

  const devFallback = process.env.TWILIO_FROM_NUMBER?.trim() ?? null;
  if (devFallback) {
    console.warn(
      "[sms] Using TWILIO_FROM_NUMBER dev fallback — configure per-shop twilioPhoneNumber for production.",
    );
  }
  return { fromNumber: devFallback, messagingServiceSid: devFallback ? messagingServiceSid : null };
}

/** Throws when the shop cannot send live SMS (used before Twilio API calls). */
export function assertShopSmsReady(config: ShopSmsConfig): void {
  const { fromNumber, messagingServiceSid } = resolveFromNumber(config);
  if (fromNumber || messagingServiceSid) return;

  if (!config.smsEnabled) {
    throw new Error("SMS is disabled for this shop. Enable it in Settings → Phone & SMS.");
  }
  if (isProduction()) {
    throw new Error(
      "Shop SMS is not configured. Assign a Twilio number in Settings → Phone & SMS before sending.",
    );
  }
  throw new Error(
    "Shop SMS is not configured. Set a Twilio SMS number in Settings → Phone & SMS, or TWILIO_FROM_NUMBER for local dev.",
  );
}

const ACTIVE_RO_STATUSES: ROStatus[] = [
  ROStatus.ESTIMATE,
  ROStatus.APPROVED,
  ROStatus.IN_PROGRESS,
];

export async function listMessages(filters: {
  shopId: string;
  customerId?: string;
  repairOrderId?: string;
}): Promise<MessageRow[]> {
  if (filters.repairOrderId && !filters.customerId) {
    const ro = await prisma.repairOrder.findFirst({
      where: { id: filters.repairOrderId, shopId: filters.shopId },
      select: { customerId: true },
    });
    if (!ro) return [];
    return loadThread(filters.shopId, ro.customerId);
  }

  if (!filters.customerId) return [];

  return loadThread(filters.shopId, filters.customerId);
}

async function loadThread(shopId: string, customerId: string): Promise<MessageRow[]> {
  return prisma.message.findMany({
    where: { shopId, customerId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      direction: true,
      body: true,
      status: true,
      createdAt: true,
      repairOrderId: true,
    },
  });
}

/** Resolve a customer in a shop by inbound caller ID (phone or altPhone). */
export async function findCustomerByPhone(shopId: string, fromPhone: string) {
  const key = phoneMatchKey(fromPhone);
  if (key.length < 7) return null;

  const byDigits = await prisma.customer.findMany({
    where: { shopId, phoneDigits: { contains: key } },
    select: {
      id: true,
      phone: true,
      altPhone: true,
      marketingOptIn: true,
      firstName: true,
      lastName: true,
    },
  });
  const digitMatch = byDigits.find((c) => phonesMatchCustomer(c, fromPhone));
  if (digitMatch) return digitMatch;

  const withPhones = await prisma.customer.findMany({
    where: { shopId, OR: [{ phone: { not: null } }, { altPhone: { not: null } }] },
    select: {
      id: true,
      phone: true,
      altPhone: true,
      marketingOptIn: true,
      firstName: true,
      lastName: true,
    },
  });

  return withPhones.find((c) => phonesMatchCustomer(c, fromPhone)) ?? null;
}

function phonesMatchCustomer(
  c: { phone: string | null; altPhone: string | null },
  incoming: string,
): boolean {
  const key = phoneMatchKey(incoming);
  const p = phoneMatchKey(c.phone);
  const a = phoneMatchKey(c.altPhone);
  return key === p || key === a;
}

/** Pick the most recently updated open RO for threading inbound replies. */
export async function findActiveRepairOrderId(
  shopId: string,
  customerId: string,
): Promise<string | null> {
  const ro = await prisma.repairOrder.findFirst({
    where: {
      shopId,
      customerId,
      status: { in: ACTIVE_RO_STATUSES },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  return ro?.id ?? null;
}

/** Find shop for inbound Twilio SMS or Voice by matching the To number. */
export async function resolveShopForInbound(toPhone: string): Promise<string | null> {
  const toKey = phoneMatchKey(toPhone);
  if (toKey.length < 7) return null;

  const shops = await prisma.shop.findMany({
    where: { twilioPhoneNumber: { not: null } },
    select: { id: true, twilioPhoneNumber: true },
  });

  for (const shop of shops) {
    if (shop.twilioPhoneNumber && phoneMatchKey(shop.twilioPhoneNumber) === toKey) {
      return shop.id;
    }
  }

  // Dev-only fallback: single shared TWILIO_FROM_NUMBER → demo shop or first active shop.
  if (isProduction()) return null;

  const configured = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!configured) return null;

  const fromKey = digitsOf(configured);
  if (toKey !== fromKey && !toKey.endsWith(fromKey.slice(-10))) {
    return null;
  }

  console.warn("[sms inbound] Dev fallback routing via TWILIO_FROM_NUMBER — use per-shop numbers in production.");

  const demo = await prisma.shop.findFirst({
    where: { id: "shop_demo", status: "ACTIVE" },
    select: { id: true },
  });
  if (demo) return demo.id;

  const shop = await prisma.shop.findFirst({
    where: { status: { in: ["ACTIVE", "TRIAL"] } },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return shop?.id ?? null;
}

async function recordSmsSentAudit(
  shopId: string,
  opts: SendSmsOptions,
  messageId: string,
) {
  if (opts.skipAudit) return;
  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.SMS_SENT,
    summary: "Outbound SMS sent",
    repairOrderId: opts.repairOrderId ?? null,
    metadata: {
      customerId: opts.customerId,
      messageId,
    },
  });
}

/**
 * Send SMS for a shop — always uses the shop's twilioPhoneNumber (or messaging service).
 * Appends STOP opt-out footer when missing. Fails clearly when SMS is not configured.
 */
export async function sendShopSms(
  shopId: string,
  to: string,
  body: string,
  opts: SendSmsOptions = {},
): Promise<SendSmsResult> {
  if (!SMS_ENABLED) throw new Error("Text messaging is disabled.");

  const releaseDenied = await releasedFeatureDenied(shopId, "sms");
  if (releaseDenied) throw new Error(releaseDenied);

  const trimmed = body.trim();
  if (!trimmed) throw new Error("Message is empty.");

  const toE164 = normalizePhoneE164(to);
  if (digitsOf(toE164).length < 10) throw new Error("Enter a valid phone number.");

  const smsConfig = await getShopSmsConfig(shopId);
  assertShopSmsReady(smsConfig);

  const { fromNumber, messagingServiceSid } = resolveFromNumber(smsConfig);
  const finalBody = opts.skipOptOutFooter
    ? trimmed
    : appendOptOutFooter(trimmed, smsConfig.smsOptOutFooter ?? DEFAULT_SMS_OPT_OUT_FOOTER);

  const provider = getSms({
    twilioPhoneNumber: fromNumber,
    twilioMessagingServiceSid: messagingServiceSid,
  });

  let customerId = opts.customerId;
  if (customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, shopId },
      select: { phone: true, altPhone: true },
    });
    if (!customer) throw new Error("Customer not found.");
  }

  const toE164Norm = normalizePhoneE164(to);

  const base = {
    shopId,
    customerId: customerId!,
    repairOrderId: opts.repairOrderId ?? null,
    direction: "OUTBOUND" as const,
    body: finalBody,
    fromNumber: fromNumber ? normalizePhoneE164(fromNumber) : null,
    toNumber: toE164Norm,
  };

  if (!customerId) {
    throw new Error("customerId is required to record outbound messages.");
  }

  if (provider.mode === "live") {
    try {
      const res = await provider.send(toE164, finalBody);
      const msg = await prisma.message.create({
        data: {
          ...base,
          status: res.status,
          twilioSid: res.sid,
          sentAt: new Date(),
        },
      });
      await recordSmsSentAudit(shopId, opts, msg.id);
      return { messageId: msg.id, mode: "live", status: res.status, sid: res.sid };
    } catch (e) {
      await prisma.message.create({
        data: { ...base, status: "failed" },
      });
      throw e instanceof Error ? e : new Error("Send failed.");
    }
  }

  const res = await provider.send(toE164, finalBody);
  const msg = await prisma.message.create({
    data: {
      ...base,
      status: res.status,
      twilioSid: res.sid,
      sentAt: new Date(),
    },
  });
  await recordSmsSentAudit(shopId, opts, msg.id);
  return { messageId: msg.id, mode: "mock", status: res.status, sid: res.sid };
}

/** @deprecated Prefer sendShopSms — kept as alias for existing callers. */
export const sendSms = sendShopSms;

/** Record and link an inbound SMS from the Twilio webhook. */
export async function recordInboundSms(params: {
  shopId: string;
  from: string;
  to: string;
  body: string;
  twilioSid?: string;
}): Promise<{ messageId: string; customerId: string } | null> {
  const customer = await findCustomerByPhone(params.shopId, params.from);
  if (!customer) {
    console.warn(`[sms inbound] No customer for ${params.from} in shop ${params.shopId}`);
    return null;
  }

  const bodyTrim = params.body.trim();
  if (isSmsStopKeyword(bodyTrim) && customer.marketingOptIn) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { marketingOptIn: false },
    });
  }

  const repairOrderId = await findActiveRepairOrderId(params.shopId, customer.id);

  const msg = await prisma.message.create({
    data: {
      shopId: params.shopId,
      customerId: customer.id,
      repairOrderId,
      direction: "INBOUND",
      body: bodyTrim,
      status: "received",
      twilioSid: params.twilioSid,
      fromNumber: normalizePhoneE164(params.from),
      toNumber: normalizePhoneE164(params.to),
      sentAt: new Date(),
    },
  });

  return { messageId: msg.id, customerId: customer.id };
}

/** Mark all inbound messages from a customer as read. */
export async function markThreadRead(shopId: string, customerId: string) {
  await prisma.message.updateMany({
    where: { shopId, customerId, direction: "INBOUND", readAt: null },
    data: { readAt: new Date() },
  });
}

/** Persist outbound message (used by share/email flows that already composed body). */
export async function recordOutboundMessage(opts: {
  shopId: string;
  customerId: string;
  body: string;
  status: string;
  repairOrderId?: string;
  twilioSid?: string;
  sentAt?: Date;
}) {
  return prisma.message.create({
    data: {
      shopId: opts.shopId,
      customerId: opts.customerId,
      repairOrderId: opts.repairOrderId ?? null,
      direction: "OUTBOUND",
      body: opts.body,
      status: opts.status,
      twilioSid: opts.twilioSid,
      sentAt: opts.sentAt ?? new Date(),
    },
  });
}
