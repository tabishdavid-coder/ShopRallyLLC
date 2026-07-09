"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { deriveShopEmailSetupStatus, type ShopEmailSetupStatus } from "@/lib/email-constants";
import { getCurrentUser } from "@/lib/platform";
import { getShopId } from "@/lib/shop";
import type { ShopActionResult } from "@/server/actions/shop";
import { resendPlatformConfigured } from "@/server/services/email";
import {
  getShopEmailConfig,
  getShopEmailStatus,
  isShopEmailReady,
  sendShopEmail,
} from "@/server/services/shop-email";
import { gates } from "@/server/permission-gates";

const EmailSettingsInput = z.object({
  emailFromName: z.string().trim().max(120).optional(),
  emailFromAddress: z.string().trim().email("Enter a valid from email address.").optional().or(z.literal("")),
  emailReplyTo: z.string().trim().email("Enter a valid reply-to email.").optional().or(z.literal("")),
  emailEnabled: z.boolean(),
});

export type EmailSettings = {
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  emailEnabled: boolean;
  emailConfiguredAt: Date | null;
  shopName: string;
  shopEmail: string | null;
  setupStatus: ShopEmailSetupStatus;
  platformResendConfigured: boolean;
};

export async function getEmailSettings(): Promise<EmailSettings> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) throw new Error(denied.error);
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: {
      name: true,
      email: true,
      emailFromName: true,
      emailFromAddress: true,
      emailReplyTo: true,
      emailEnabled: true,
      emailConfiguredAt: true,
    },
  });

  const platformResendConfigured = resendPlatformConfigured();
  const row = {
    emailFromAddress: shop?.emailFromAddress ?? null,
    emailEnabled: shop?.emailEnabled ?? false,
    platformResendConfigured,
  };

  return {
    emailFromName: shop?.emailFromName ?? null,
    emailFromAddress: shop?.emailFromAddress ?? null,
    emailReplyTo: shop?.emailReplyTo ?? null,
    emailEnabled: row.emailEnabled,
    emailConfiguredAt: shop?.emailConfiguredAt ?? null,
    shopName: shop?.name ?? "Shop",
    shopEmail: shop?.email ?? null,
    setupStatus: deriveShopEmailSetupStatus(row),
    platformResendConfigured,
  };
}

export async function updateEmailSettings(
  input: z.infer<typeof EmailSettingsInput>,
): Promise<ShopActionResult> {
  const parsed = EmailSettingsInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const fromAddress = parsed.data.emailFromAddress?.trim() || null;
  const replyTo = parsed.data.emailReplyTo?.trim() || null;
  const fromName = parsed.data.emailFromName?.trim() || null;

  if (parsed.data.emailEnabled && !fromAddress) {
    return { ok: false, error: "Set a from email address before enabling shop email." };
  }

  const existing = await prisma.shop.findFirst({
    where: { id: shopId },
    select: { emailConfiguredAt: true },
  });
  if (!existing) return { ok: false, error: "Shop not found." };

  const nowConfigured = Boolean(fromAddress && parsed.data.emailEnabled);
  const emailConfiguredAt =
    nowConfigured && !existing.emailConfiguredAt ? new Date() : existing.emailConfiguredAt;

  await prisma.shop.updateMany({
    where: { id: shopId },
    data: {
      emailFromName: fromName,
      emailFromAddress: fromAddress,
      emailReplyTo: replyTo,
      emailEnabled: parsed.data.emailEnabled,
      emailConfiguredAt,
    },
  });

  revalidatePath("/settings/communications/email");
  return { ok: true };
}

export type ShopTestEmailResult =
  | { ok: true; mode: "live" | "mock" }
  | { ok: false; error: string };

/** Send a test email to verify shop from-address configuration. */
export async function sendShopTestEmail(input: {
  toEmail?: string;
}): Promise<ShopTestEmailResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const user = await getCurrentUser();
  const to = (input.toEmail?.trim() || user.email?.trim() || "").trim();

  if (!to.includes("@")) {
    return { ok: false, error: "Enter a valid email address for the test send." };
  }

  const config = await getShopEmailConfig(shopId);
  if (!isShopEmailReady(config)) {
    if (!config.emailFromAddress?.trim()) {
      return { ok: false, error: "Set a from email address in Settings → Email." };
    }
    if (!config.emailEnabled) {
      return { ok: false, error: "Enable shop email before sending a test." };
    }
    if (!resendPlatformConfigured()) {
      return {
        ok: false,
        error: "Resend is not configured — check RESEND_API_KEY in .env (platform admin).",
      };
    }
  }

  try {
    const res = await sendShopEmail({
      shopId,
      to,
      subject: `Test email from ${config.name}`,
      body: [
        `This is a test email from ${config.name} via ShopRally.`,
        "",
        "If you received this, your shop email is configured correctly.",
        "Customer-facing emails (estimates, invoices, maintenance plans) will send from this address.",
      ].join("\n"),
    });

    if (res.mode === "live") return { ok: true, mode: "live" };
    if (res.mode === "mock") return { ok: true, mode: "mock" };
    return {
      ok: false,
      error: "Shop email is not fully configured. Save settings and verify your domain in Resend.",
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Test send failed." };
  }
}

/** Client-safe status for share dialogs and banners. */
export async function getShopEmailSendStatus() {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) throw new Error(denied.error);
  return getShopEmailStatus(shopId);
}
