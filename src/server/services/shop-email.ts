import "server-only";

import { prisma } from "@/db/client";
import {
  buildMailtoUrl,
  resendPlatformConfigured,
  sendViaResend,
} from "@/server/services/email";

export type ShopEmailConfig = {
  name: string;
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  emailEnabled: boolean;
  emailConfiguredAt: Date | null;
};

export type ShopEmailStatus = {
  configured: boolean;
  live: boolean;
  platformResendConfigured: boolean;
  emailEnabled: boolean;
  fromAddress: string | null;
  fromName: string | null;
  replyTo: string | null;
  setupStatus: "not_configured" | "ready" | "disabled";
};

export type SendShopEmailResult = {
  mode: "live" | "mock" | "fallback";
  id?: string;
  status: string;
  fallbackUrl?: string;
};

export async function getShopEmailConfig(shopId: string): Promise<ShopEmailConfig> {
  const shop = await prisma.shop.findFirst({
    where: { id: shopId },
    select: {
      name: true,
      emailFromName: true,
      emailFromAddress: true,
      emailReplyTo: true,
      emailEnabled: true,
      emailConfiguredAt: true,
    },
  });
  if (!shop) throw new Error("Shop not found.");
  return shop;
}

/** RFC-style From header: "Shop Name <service@shop.com>" */
export function formatShopFromHeader(config: {
  name: string;
  emailFromName: string | null;
  emailFromAddress: string | null;
}): string | null {
  const addr = config.emailFromAddress?.trim();
  if (!addr) return null;
  const name = config.emailFromName?.trim() || config.name;
  return `${name} <${addr}>`;
}

export function isShopEmailReady(config: {
  emailEnabled: boolean;
  emailFromAddress: string | null;
}): boolean {
  return Boolean(
    config.emailEnabled &&
      config.emailFromAddress?.trim() &&
      resendPlatformConfigured(),
  );
}

export async function getShopEmailStatus(shopId: string): Promise<ShopEmailStatus> {
  const config = await getShopEmailConfig(shopId);
  const platformResendConfigured = resendPlatformConfigured();
  const fromAddress = config.emailFromAddress?.trim() || null;
  const configured = isShopEmailReady(config);

  let setupStatus: ShopEmailStatus["setupStatus"] = "not_configured";
  if (fromAddress && config.emailEnabled && platformResendConfigured) setupStatus = "ready";
  else if (fromAddress && !config.emailEnabled) setupStatus = "disabled";
  else setupStatus = "not_configured";

  return {
    configured,
    live: configured,
    platformResendConfigured,
    emailEnabled: config.emailEnabled,
    fromAddress,
    fromName: config.emailFromName?.trim() || config.name,
    replyTo: config.emailReplyTo?.trim() || null,
    setupStatus,
  };
}

/**
 * Send email from the shop's configured from address.
 * Live when shop email is enabled + from address set + RESEND_API_KEY present.
 * Falls back to mailto when Resend is configured but shop email is not set up.
 * Mock + mailto when Resend is not configured (dev).
 */
export async function sendShopEmail(opts: {
  shopId: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
}): Promise<SendShopEmailResult> {
  const to = opts.to.trim();
  if (!to.includes("@")) throw new Error("Enter a valid email address.");

  const config = await getShopEmailConfig(opts.shopId);
  const from = formatShopFromHeader(config);
  const replyTo = opts.replyTo?.trim() || config.emailReplyTo?.trim() || undefined;
  const mailto = buildMailtoUrl(to, opts.subject, opts.body);

  if (isShopEmailReady(config) && from) {
    const res = await sendViaResend({
      from,
      to,
      subject: opts.subject,
      text: opts.body,
      html: opts.html,
      replyTo,
    });
    return { mode: "live", id: res.id, status: res.status };
  }

  if (resendPlatformConfigured()) {
    return {
      mode: "fallback",
      status: "fallback",
      fallbackUrl: mailto,
    };
  }

  console.log(`[mock shop email] shop=${opts.shopId} → ${to} | ${opts.subject}\n${opts.body}`);
  return {
    mode: "mock",
    status: "mock",
    fallbackUrl: mailto,
  };
}
