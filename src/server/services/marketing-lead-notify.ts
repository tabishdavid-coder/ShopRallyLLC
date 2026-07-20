import "server-only";

import { getAppUrl } from "@/lib/app-url";
import { BRAND } from "@/lib/brand";
import { resendPlatformConfigured } from "@/server/services/email";
import {
  platformOpsNotifyEmails,
  sendPlatformEmail,
} from "@/server/services/platform-email";

export type MarketingLeadNotifyInput = {
  formType: string;
  ticketId: string;
  subject: string;
  name: string;
  email: string;
  body: string;
  createdAt?: Date;
};

function buildOpsText(input: MarketingLeadNotifyInput): string {
  const when = (input.createdAt ?? new Date()).toISOString();
  const inboxUrl = `${getAppUrl()}/platform/leads?ticket=${input.ticketId}`;
  return [
    `New marketing lead — ${input.formType}`,
    "",
    `Form type: ${input.formType}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Ticket ID: ${input.ticketId}`,
    `Submitted: ${when}`,
    `Inbox: ${inboxUrl}`,
    "",
    "— Details —",
    input.body,
    "",
    `— ${BRAND.name} marketing lead notification`,
  ].join("\n");
}

/**
 * Notify ops inbox of a marketing-site lead. Never throws — lead is already in DB.
 * Requires Vercel/local: RESEND_API_KEY (+ EMAIL_FROM on a verified domain recommended).
 */
export async function notifyOpsOfMarketingLead(
  input: MarketingLeadNotifyInput,
): Promise<void> {
  const to = platformOpsNotifyEmails();
  const text = buildOpsText(input);
  try {
    const result = await sendPlatformEmail({
      to,
      subject: `[Lead] ${input.subject}`,
      text,
      replyTo: input.email,
      logTag: "marketing-lead-email",
    });
    if (result.mode === "live") {
      console.info(
        `[marketing-lead-email] Ops notified ticket=${input.ticketId} id=${result.id}`,
      );
    } else if (result.mode === "failed") {
      console.error(
        `[marketing-lead-email] Ops notification failed ticket=${input.ticketId}: ${result.error}`,
      );
    }
  } catch (err) {
    console.error(
      `[marketing-lead-email] Ops notification failed ticket=${input.ticketId}:`,
      err,
    );
  }
}

/**
 * Short confirmation to the submitter. Best-effort; never throws or blocks the form.
 */
export async function confirmMarketingLeadToSubmitter(
  input: Pick<MarketingLeadNotifyInput, "formType" | "ticketId" | "name" | "email">,
): Promise<void> {
  // Avoid a second "RESEND unset" warning — ops notify already logged clearly.
  if (!resendPlatformConfigured()) return;

  const first = input.name.trim().split(/\s+/)[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    `Thanks for contacting ${BRAND.name}. We received your ${input.formType.toLowerCase()} and will follow up shortly.`,
    "",
    `Reference: ${input.ticketId}`,
    "",
    `— ${BRAND.name}`,
    BRAND.url,
  ].join("\n");

  try {
    const result = await sendPlatformEmail({
      to: input.email,
      subject: `We got your request — ${BRAND.name}`,
      text,
      logTag: "marketing-lead-confirm",
    });
    if (result.mode === "live") {
      console.info(
        `[marketing-lead-confirm] Confirmation sent ticket=${input.ticketId}`,
      );
    }
  } catch (err) {
    console.error(
      `[marketing-lead-confirm] Confirmation failed ticket=${input.ticketId}:`,
      err,
    );
  }
}
