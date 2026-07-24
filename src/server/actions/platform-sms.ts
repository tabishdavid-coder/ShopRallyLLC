"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import { isPlatformAdmin } from "@/lib/platform";
import { normalizePhoneE164 } from "@/lib/phone";
import { isSmsSeedPlaceholderNumber } from "@/lib/sms-constants";
import { getShopId } from "@/lib/shop";
import type { ShopActionResult } from "@/server/actions/shop";
import { getShopSmsStatus, sendShopSms } from "@/server/services/messaging";
import {
  provisionTwilioNumber,
  syncTwilioNumberWebhooks,
  twilioPlatformConfigured,
} from "@/server/services/sms";
import { gates } from "@/server/permission-gates";

export type PlatformSmsActionResult =
  | { ok: true; phoneNumber?: string }
  | { ok: false; error: string };

const ProvisionInput = z.object({
  shopId: z.string().min(1),
  areaCode: z.string().trim().max(3).optional(),
});

/**
 * Platform admin: search + buy a Twilio local number, configure webhook, assign to shop.
 * Requires TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN.
 */
export async function provisionShopSmsNumber(
  input: z.infer<typeof ProvisionInput>,
): Promise<PlatformSmsActionResult> {
  if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = ProvisionInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input." };

  if (!twilioPlatformConfigured()) {
    return { ok: false, error: "Twilio platform credentials are not configured in .env." };
  }

  const shop = await prisma.shop.findFirst({
    where: { id: parsed.data.shopId },
    select: { id: true, name: true, twilioPhoneNumber: true, state: true },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  if (shop.twilioPhoneNumber && !isSmsSeedPlaceholderNumber(shop.twilioPhoneNumber)) {
    return {
      ok: false,
      error: `${shop.name} already has ${shop.twilioPhoneNumber}. Clear it first to provision a new number.`,
    };
  }

  try {
    const areaCode = parsed.data.areaCode || shop.state?.replace(/\D/g, "").slice(0, 3) || undefined;
    const phoneNumber = await provisionTwilioNumber(areaCode);
    const normalized = normalizePhoneE164(phoneNumber);

    const taken = await prisma.shop.findFirst({
      where: { twilioPhoneNumber: normalized, id: { not: shop.id } },
      select: { name: true },
    });
    if (taken) {
      return { ok: false, error: `Number ${normalized} is already assigned to ${taken.name}.` };
    }

    await prisma.shop.update({
      where: { id: shop.id },
      data: {
        twilioPhoneNumber: normalized,
        smsEnabled: true,
        smsConfiguredAt: new Date(),
        smsSetupRequestedAt: null,
      },
    });

    revalidatePath("/platform/shops");
    revalidatePath("/settings/communications/phone-sms");
    return { ok: true, phoneNumber: normalized };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Provisioning failed." };
  }
}

const AssignInput = z.object({
  shopId: z.string().min(1),
  twilioPhoneNumber: z.string().trim().min(10).max(20),
  smsEnabled: z.boolean().optional(),
});

/** Platform admin: manually assign an existing Twilio number (e.g. after port completes). */
export async function assignShopSmsNumber(
  input: z.infer<typeof AssignInput>,
): Promise<PlatformSmsActionResult> {
  if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }

  const parsed = AssignInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid phone number." };

  const normalized = normalizePhoneE164(parsed.data.twilioPhoneNumber);
  if (normalized.replace(/\D/g, "").length < 10) {
    return { ok: false, error: "Enter a valid E.164 number." };
  }

  const taken = await prisma.shop.findFirst({
    where: { twilioPhoneNumber: normalized, id: { not: parsed.data.shopId } },
    select: { name: true },
  });
  if (taken) {
    return { ok: false, error: `That number is already assigned to ${taken.name}.` };
  }

  await prisma.shop.update({
    where: { id: parsed.data.shopId },
    data: {
      twilioPhoneNumber: normalized,
      smsEnabled: parsed.data.smsEnabled ?? true,
      smsConfiguredAt: new Date(),
      smsSetupRequestedAt: null,
    },
  });

  try {
    await syncTwilioNumberWebhooks(normalized);
  } catch (e) {
    console.warn("[platform-sms] webhook sync after assign failed:", e);
  }

  revalidatePath("/platform/shops");
  revalidatePath("/settings/communications/phone-sms");
  return { ok: true, phoneNumber: normalized };
}

const TestSmsInput = z.object({
  toPhone: z.string().trim().min(10).max(20),
  shopId: z.string().optional(),
});

/** Send a test SMS to verify shop outbound configuration. */
export async function sendShopTestSms(
  input: z.infer<typeof TestSmsInput>,
): Promise<ShopActionResult & { mode?: "live" | "mock" }> {
  const parsed = TestSmsInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid phone number." };

  const callerShopId = await getShopId();
  const shopId = parsed.data.shopId ?? callerShopId;
  if (shopId === callerShopId) {
    const denied = await gates.employeesManage(shopId);
    if (denied) return denied;
  } else if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }
  const to = normalizePhoneE164(parsed.data.toPhone);

  const status = await getShopSmsStatus(shopId);
  if (!status?.twilioPhoneNumber && process.env.NODE_ENV === "production") {
    return { ok: false, error: "Configure a shop Twilio number before sending a test." };
  }

  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: { name: true },
  });

  const body = `ShopRally test from ${shop?.name ?? "your shop"}. Two-way SMS is working.`;

  let testCustomer = await prisma.customer.findFirst({
    where: { shopId, phone: to },
    select: { id: true },
  });

  if (!testCustomer) {
    testCustomer = await prisma.customer.create({
      data: {
        shopId,
        firstName: "SMS",
        lastName: "Test",
        phone: to,
        phoneDigits: to.replace(/\D/g, ""),
      },
      select: { id: true },
    });
  }

  try {
    const res = await sendShopSms(shopId, to, body, {
      customerId: testCustomer.id,
      skipOptOutFooter: true,
    });
    return { ok: true, mode: res.mode };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Test send failed." };
  }
}

/** Webhook URL shown in settings (canonical APP_URL). */
export async function getSmsWebhookUrl(): Promise<string> {
  return publicUrl("/api/webhooks/twilio/sms");
}

export async function getVoiceWebhookUrl(): Promise<string> {
  return publicUrl("/api/webhooks/twilio/voice");
}

/** Push canonical SMS + Voice webhooks to the shop's Twilio number. */
export async function syncShopTwilioWebhooks(input?: {
  shopId?: string;
}): Promise<ShopActionResult> {
  const callerShopId = await getShopId();
  const targetShopId = input?.shopId ?? callerShopId;

  if (targetShopId === callerShopId) {
    const denied = await gates.employeesManage(callerShopId);
    if (denied) return denied;
  } else if (!(await isPlatformAdmin())) {
    return { ok: false, error: "Platform admin access required." };
  }

  if (!twilioPlatformConfigured()) {
    return { ok: false, error: "Twilio platform credentials are not configured." };
  }

  const shop = await prisma.shop.findFirst({
    where: { id: targetShopId },
    select: { twilioPhoneNumber: true },
  });
  if (!shop?.twilioPhoneNumber) {
    return { ok: false, error: "This shop has no Twilio number to sync." };
  }

  try {
    await syncTwilioNumberWebhooks(shop.twilioPhoneNumber);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Twilio webhook sync failed.",
    };
  }

  revalidatePath("/settings/communications/phone-sms");
  revalidatePath("/platform/shops");
  return { ok: true };
}
