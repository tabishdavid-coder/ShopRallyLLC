"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { SMS_ENABLED } from "@/lib/features";
import { getShopId } from "@/lib/shop";
import { releasedFeatureDenied } from "@/lib/subscription";
import type { MessageRow, SendResult } from "@/lib/messaging-types";
import {
  listMessages as listMessagesService,
  sendSms as sendSmsService,
} from "@/server/services/messaging";
import { sendEstimateLink as sendEstimateLinkAction, type SendChannel } from "@/server/actions/share";
import { prisma } from "@/db/client";
import { getSms } from "@/server/services/sms";
import { gates } from "@/server/permission-gates";
import {
  requireSmsAddendum,
  requireShopLegalCompliance,
  requireTransactionalSmsConsent,
} from "@/server/compliance-gates";

const sendTextSchema = z.object({
  customerId: z.string().min(1),
  body: z.string().min(1).max(1600),
  repairOrderId: z.string().optional(),
});

/** Reload a customer's message thread (for the messaging panel). */
export async function getMessages(
  customerId: string,
  repairOrderId?: string,
): Promise<MessageRow[]> {
  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return [];
  return listMessagesService({ shopId, customerId, repairOrderId });
}

/** Send a free-form text to a customer and record it. */
export async function sendText(
  customerId: string,
  body: string,
  repairOrderId?: string,
): Promise<SendResult> {
  if (!SMS_ENABLED) return { ok: false, error: "Text messaging is disabled." };

  const parsed = sendTextSchema.safeParse({ customerId, body, repairOrderId });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const releaseDenied = await releasedFeatureDenied(shopId, "sms");
  if (releaseDenied) return { ok: false, error: releaseDenied };

  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;

  const legal = await requireShopLegalCompliance(shopId);
  if (legal) return legal;

  const addendum = await requireSmsAddendum(shopId);
  if (addendum) return addendum;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, shopId },
    select: {
      phone: true,
      altPhone: true,
      marketingOptIn: true,
      transactionalSmsConsent: true,
      marketingEmailConsent: true,
      deletedAt: true,
      anonymizedAt: true,
    },
  });
  if (!customer) return { ok: false, error: "Customer not found." };

  const consentGate = requireTransactionalSmsConsent(customer);
  if (consentGate) return consentGate;

  const phone = customer.phone?.trim() || customer.altPhone?.trim();
  if (!phone) {
    return { ok: false, error: "This customer has no phone number on file." };
  }

  const provider = getSms();
  try {
    await sendSmsService(shopId, phone, body, { customerId, repairOrderId });
    const messages = await listMessagesService({ shopId, customerId, repairOrderId });
    if (repairOrderId) revalidatePath(`/repair-orders/${repairOrderId}`);
    return {
      ok: true,
      mode: provider.mode,
      messages,
      ...(provider.mode === "mock"
        ? {
            fallbackUrl: `sms:${phone}?&body=${encodeURIComponent(body.trim())}`,
          }
        : {}),
    };
  } catch (e) {
    const messages = await listMessagesService({ shopId, customerId, repairOrderId });
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Send failed.",
      messages,
    };
  }
}

/** Generate the customer estimate-approval link and send via SMS (default) or email. */
export async function sendEstimateLink(
  roId: string,
  channel: SendChannel = "sms",
): Promise<SendResult> {
  if (channel === "sms" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const ro = await prisma.repairOrder.findFirst({
    where: { id: roId, shopId },
    select: { customerId: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const res = await sendEstimateLinkAction(roId, channel);
  const messages = await listMessagesService({ shopId, customerId: ro.customerId, repairOrderId: roId });
  if (!res.ok) return { ok: false, error: res.error, messages };
  return { ok: true, mode: res.mode, messages, fallbackUrl: res.fallbackUrl };
}
