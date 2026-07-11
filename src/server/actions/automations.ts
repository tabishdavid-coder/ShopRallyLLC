"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { applyAutomationMergeFields } from "@/lib/automations";
import { getShopId } from "@/lib/shop";
import { PLANS } from "@/lib/plans";
import { canUseReleasedFeature } from "@/lib/subscription";
import {
  getAutomation,
  isAutomationNameUnique,
} from "@/server/automations";
import { gates } from "@/server/permission-gates";
import { getCampaignContext } from "@/server/campaigns";
import { getShopEmailConfig, isShopEmailReady, sendShopEmail } from "@/server/services/shop-email";
import { sendShopSms } from "@/server/services/messaging";
import type {
  AutomationTriggerUnit,
  CampaignChannel,
} from "@/generated/prisma";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const UpdateAutomationInput = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  triggerAmount: z.number().int().min(0).max(365).nullable().optional(),
  triggerUnit: z.enum(["HOURS", "DAYS", "MONTHS"]).nullable().optional(),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
  smsMessage: z.string().trim().min(1).max(1600),
  emailSubject: z.string().trim().max(200).optional(),
  emailBody: z.string().trim().max(8000).optional(),
  includeBusinessCustomers: z.boolean(),
  limitOnePerCustomer: z.boolean(),
  includeBookingLinkCta: z.boolean(),
});

async function requireAutomationsAccess(shopId: string): Promise<ActionResult | null> {
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;
  const allowed = await canUseReleasedFeature(shopId, "marketing_campaigns");
  if (!allowed) {
    return {
      ok: false,
      error: `Marketing automations require ${PLANS.PROFESSIONAL.name} plan or higher.`,
    };
  }
  return null;
}

export async function updateAutomation(
  raw: z.infer<typeof UpdateAutomationInput>,
): Promise<ActionResult> {
  const parsed = UpdateAutomationInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Please check the form and try again." };

  const shopId = await getShopId();
  const gate = await requireAutomationsAccess(shopId);
  if (gate) return gate;

  const data = parsed.data;
  const existing = await prisma.marketingAutomation.findFirst({
    where: { id: data.id, shopId },
  });
  if (!existing) return { ok: false, error: "Automation not found." };

  const unique = await isAutomationNameUnique(shopId, data.name, data.id);
  if (!unique) {
    return {
      ok: false,
      error:
        "This automation name is already in use by another automation. Please choose a unique name to provide more accurate reporting.",
    };
  }

  await prisma.marketingAutomation.update({
    where: { id: data.id },
    data: {
      name: data.name,
      triggerAmount: data.triggerAmount ?? null,
      triggerUnit: (data.triggerUnit as AutomationTriggerUnit) ?? null,
      emailEnabled: data.emailEnabled,
      smsEnabled: data.smsEnabled,
      smsMessage: data.smsMessage,
      emailSubject: data.emailSubject ?? null,
      emailBody: data.emailBody ?? null,
      includeBusinessCustomers: data.includeBusinessCustomers,
      limitOnePerCustomer: data.limitOnePerCustomer,
      includeBookingLinkCta: data.includeBookingLinkCta,
      configured: true,
    },
  });

  revalidatePath("/marketing/automations");
  return { ok: true };
}

export async function toggleAutomationChannel(
  id: string,
  channel: "email" | "sms",
  enabled: boolean,
): Promise<ActionResult> {
  const shopId = await getShopId();
  const gate = await requireAutomationsAccess(shopId);
  if (gate) return gate;

  const existing = await prisma.marketingAutomation.findFirst({
    where: { id, shopId },
  });
  if (!existing) return { ok: false, error: "Automation not found." };

  await prisma.marketingAutomation.update({
    where: { id },
    data: channel === "email" ? { emailEnabled: enabled } : { smsEnabled: enabled },
  });

  revalidatePath("/marketing/automations");
  return { ok: true };
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  const shopId = await getShopId();
  const gate = await requireAutomationsAccess(shopId);
  if (gate) return gate;

  const existing = await prisma.marketingAutomation.findFirst({
    where: { id, shopId },
  });
  if (!existing) return { ok: false, error: "Automation not found." };

  await prisma.marketingAutomation.delete({ where: { id } });

  revalidatePath("/marketing/automations");
  return { ok: true };
}

export async function sendTestAutomation(
  automationId: string,
  channel: CampaignChannel,
  testPhone?: string,
  testEmail?: string,
): Promise<ActionResult> {
  const shopId = await getShopId();
  const gate = await requireAutomationsAccess(shopId);
  if (gate) return gate;

  const automation = await prisma.marketingAutomation.findFirst({
    where: { id: automationId, shopId },
  });
  if (!automation) return { ok: false, error: "Automation not found." };

  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      name: true,
      phone: true,
      email: true,
      twilioPhoneNumber: true,
      smsEnabled: true,
    },
  });

  const ctx = await getCampaignContext(shopId);
  const vars = {
    first_name: "Henry",
    customer_name: "Henry Johnson",
    shop_name: ctx.shopName,
    shop_phone: ctx.shopPhone || shop.phone || "our shop",
    booking_link: ctx.bookingLink,
    review_link: ctx.reviewLink,
    appointment_date: "01/01/2025",
    appointment_time: "12:00 PM",
    vehicle_make_model: "Ford Explorer",
  };

  const sendSms = channel === "SMS" || channel === "BOTH";
  const sendEmail = channel === "EMAIL" || channel === "BOTH";

  if (sendSms) {
    const phone = testPhone?.trim() || shop.phone;
    if (!phone) return { ok: false, error: "Enter a phone number or set shop phone in Settings." };
    const body = applyAutomationMergeFields(automation.smsMessage, vars);
    const recordCustomer = await prisma.customer.findFirst({
      where: { shopId },
      select: { id: true },
    });
    if (!recordCustomer) {
      return { ok: false, error: "Add at least one customer before sending a test SMS." };
    }
    try {
      await sendShopSms(shopId, phone, body, { customerId: recordCustomer.id });
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "SMS test failed." };
    }
  }

  if (sendEmail) {
    const email = testEmail?.trim() || shop.email;
    if (!email) return { ok: false, error: "Enter an email or set shop email in Settings." };
    const emailConfig = await getShopEmailConfig(shopId);
    if (!isShopEmailReady(emailConfig)) {
      return {
        ok: false,
        error: "Configure and enable shop email at Settings → Email before sending.",
      };
    }
    const subject = applyAutomationMergeFields(
      automation.emailSubject ?? `Message from ${ctx.shopName}`,
      vars,
    );
    const body = applyAutomationMergeFields(automation.emailBody ?? automation.smsMessage, vars);
    try {
      const res = await sendShopEmail({ shopId, to: email, subject, body });
      if (res.mode !== "live") {
        return { ok: false, error: "Shop email send did not complete — check Settings → Email." };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Email test failed." };
    }
  }

  return { ok: true };
}

export async function getAutomationDetailAction(
  id: string,
): Promise<ActionResult<import("@/server/automations").AutomationDetail>> {
  const shopId = await getShopId();
  const denied = await gates.customersMessage(shopId);
  if (denied) return denied;
  const detail = await getAutomation(shopId, id);
  if (!detail) return { ok: false, error: "Automation not found." };
  return { ok: true, data: detail };
}
