import "server-only";

import { BRAND } from "@/lib/brand";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/support";
import {
  resendPlatformConfigured,
  sendViaResend,
  type EmailResult,
} from "@/server/services/email";

export type PlatformEmailSendResult =
  | { mode: "live"; id: string; status: string }
  | { mode: "skipped"; reason: string }
  | { mode: "failed"; error: string };

/** From address for platform/ops mail (not shop-owned CRM sends). */
export function platformEmailFromAddress(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  return `${BRAND.name} <${PLATFORM_CONTACT_EMAIL}>`;
}

/**
 * Ops inbox for marketing lead + platform notifications.
 * Override with PLATFORM_LEAD_NOTIFY_EMAIL or PLATFORM_CONTACT_EMAIL (comma-separated ok).
 */
export function platformOpsNotifyEmails(): string[] {
  const raw =
    process.env.PLATFORM_LEAD_NOTIFY_EMAIL?.trim() ||
    process.env.PLATFORM_CONTACT_EMAIL?.trim() ||
    PLATFORM_CONTACT_EMAIL;
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
  return list.length > 0 ? list : [PLATFORM_CONTACT_EMAIL.toLowerCase()];
}

/**
 * Send platform/ops email via Resend.
 * If RESEND_API_KEY is unset: logs clearly and returns skipped (never throws for missing config).
 */
export async function sendPlatformEmail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Log tag for server console */
  logTag?: string;
}): Promise<PlatformEmailSendResult> {
  const tag = opts.logTag ?? "platform-email";
  const recipients = (Array.isArray(opts.to) ? opts.to : [opts.to])
    .map((e) => e.trim())
    .filter((e) => e.includes("@"));

  if (recipients.length === 0) {
    console.warn(`[${tag}] No valid recipients — skipped: ${opts.subject}`);
    return { mode: "skipped", reason: "no recipients" };
  }

  if (!resendPlatformConfigured()) {
    console.warn(
      `[${tag}] RESEND_API_KEY not configured — email not sent (form/ticket still saved). Subject: ${opts.subject} → ${recipients.join(", ")}`,
    );
    return { mode: "skipped", reason: "RESEND_API_KEY unset" };
  }

  const from = platformEmailFromAddress();
  let last: EmailResult | null = null;
  const errors: string[] = [];
  for (const to of recipients) {
    try {
      last = await sendViaResend({
        from,
        to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        replyTo: opts.replyTo,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[${tag}] Resend send failed → ${to}:`, message);
      errors.push(`${to}: ${message}`);
    }
  }

  if (!last) {
    return {
      mode: "failed",
      error: errors.join("; ") || "Email send failed.",
    };
  }

  return { mode: "live", id: last.id, status: last.status };
}
