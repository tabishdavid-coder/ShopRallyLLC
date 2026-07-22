"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/db/client";
import { ShopAuditEventType } from "@/generated/prisma";
import { SMS_ENABLED } from "@/lib/features";
import { normalizePhoneE164 } from "@/lib/phone";
import { getShopId } from "@/lib/shop";
import { releasedFeatureDenied } from "@/lib/subscription";
import { requirePermission } from "@/server/permissions";
import { getSms, appendOptOutFooter } from "@/server/services/sms";
import { recordOutboundMessage } from "@/server/services/messaging";
import { buildMailtoUrl } from "@/server/services/email";
import { sendShopEmail } from "@/server/services/shop-email";
import { createApprovalLink } from "@/server/actions/job-board";
import { getInvoiceShareLink } from "@/server/invoice";
import {
  requireSmsAddendum,
  requireShopLegalCompliance,
  requireTransactionalSmsConsent,
} from "@/server/compliance-gates";
import { recordShopAuditEventSafe } from "@/server/shop-audit";

export type ShareMethod = "SMS" | "EMAIL";
export type SendChannel = "email" | "sms";

export type ShareResult =
  | { ok: true; mode: "live" | "mock" | "fallback"; fallbackUrl?: string }
  | { ok: false; error: string };

export type LinkResult = { ok: true; url: string } | { ok: false; error: string };

function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function smsUrl(to: string, body: string): string {
  const phone = normalizePhoneE164(to);
  return `sms:${phone}?&body=${encodeURIComponent(body)}`;
}

async function recordMessage(
  shopId: string,
  customerId: string,
  body: string,
  status: string,
  extra?: { twilioSid?: string; sentAt?: Date; repairOrderId?: string },
) {
  try {
    await recordOutboundMessage({
      shopId,
      customerId,
      body,
      status,
      twilioSid: extra?.twilioSid,
      sentAt: extra?.sentAt,
      repairOrderId: extra?.repairOrderId,
    });
  } catch (e) {
    // Message logging must not block estimate/invoice share flows.
    console.error("[share] failed to record outbound message:", e);
  }
}

async function dispatchOutbound(opts: {
  channel: SendChannel;
  to: string;
  subject: string;
  body: string;
  shopId: string;
  customerId: string;
  repairOrderId?: string;
}): Promise<ShareResult> {
  const to = opts.to.trim();
  if (!to) {
    return {
      ok: false,
      error: opts.channel === "sms" ? "Enter a phone number." : "Enter an email address.",
    };
  }
  if (opts.channel === "email" && !to.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (opts.channel === "sms" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  if (opts.channel === "sms") {
    const planDenied = await releasedFeatureDenied(opts.shopId, "sms");
    if (planDenied) {
      return {
        ok: false,
        error:
          planDenied === "This feature is not included in your plan."
            ? "Two-way SMS is not available on this shop's plan. Share via email, or contact support."
            : planDenied,
      };
    }
  }

  if (opts.channel === "sms") {
    const legal = await requireShopLegalCompliance(opts.shopId);
    if (legal) return legal;

    const addendum = await requireSmsAddendum(opts.shopId);
    if (addendum) return addendum;

    const customer = await prisma.customer.findFirst({
      where: { id: opts.customerId, shopId: opts.shopId },
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
  }

  if (opts.channel === "sms") {
    const shop = await prisma.shop.findFirst({
      where: { id: opts.shopId },
      select: {
        smsEnabled: true,
        twilioPhoneNumber: true,
        twilioMessagingServiceSid: true,
        smsOptOutFooter: true,
      },
    });
    const smsBody = appendOptOutFooter(opts.body, shop?.smsOptOutFooter);
    const provider = getSms({
      twilioPhoneNumber: shop?.smsEnabled ? shop.twilioPhoneNumber : null,
      twilioMessagingServiceSid: shop?.twilioMessagingServiceSid,
    });
    if (provider.mode === "live") {
      try {
        const res = await provider.send(to, smsBody);
        await recordMessage(opts.shopId, opts.customerId, smsBody, res.status, {
          twilioSid: res.sid,
          repairOrderId: opts.repairOrderId,
        });
        return { ok: true, mode: "live" };
      } catch (e) {
        await recordMessage(opts.shopId, opts.customerId, smsBody, "failed", {
          repairOrderId: opts.repairOrderId,
        });
        return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
      }
    }

    // Mock Twilio — log + record, and offer native SMS as fallback.
    try {
      const res = await provider.send(to, smsBody);
      await recordMessage(opts.shopId, opts.customerId, smsBody, res.status, {
        twilioSid: res.sid,
        repairOrderId: opts.repairOrderId,
      });
    } catch {
      await recordMessage(opts.shopId, opts.customerId, smsBody, "failed", {
        repairOrderId: opts.repairOrderId,
      });
    }
    return { ok: true, mode: "mock", fallbackUrl: smsUrl(to, smsBody) };
  }

  // Email — per-shop from address via sendShopEmail
  try {
    const res = await sendShopEmail({
      shopId: opts.shopId,
      to,
      subject: opts.subject,
      body: opts.body,
    });

    if (res.mode === "live") {
      await recordMessage(
        opts.shopId,
        opts.customerId,
        `[email → ${to}] ${opts.body}`,
        res.status,
      );
      return { ok: true, mode: "live" };
    }

    if (res.mode === "mock") {
      await recordMessage(
        opts.shopId,
        opts.customerId,
        `[email → ${to}] ${opts.body}`,
        res.status,
      );
      return { ok: true, mode: "mock", fallbackUrl: res.fallbackUrl };
    }

    await recordMessage(
      opts.shopId,
      opts.customerId,
      `[email → ${to}] ${opts.body}`,
      "fallback",
    );
    return {
      ok: true,
      mode: "fallback",
      fallbackUrl: res.fallbackUrl ?? buildMailtoUrl(to, opts.subject, opts.body),
    };
  } catch (e) {
    await recordMessage(opts.shopId, opts.customerId, `[email → ${to}] ${opts.body}`, "failed");
    return { ok: false, error: e instanceof Error ? e.message : "Send failed." };
  }
}

/** Shared outbound dispatch for estimate, invoice, and deposit links. */
export const dispatchCustomerShare = dispatchOutbound;

/** Ensure the estimate has an approval token and return the absolute share link. */
export async function getEstimateLink(roId: string): Promise<LinkResult> {
  return createApprovalLink(roId);
}

/** Share an estimate with the customer via SMS or email (dialog flow). */
export async function shareEstimate(input: {
  roId: string;
  method: ShareMethod;
  to: string;
  message: string;
}): Promise<ShareResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, error: "Message is empty." };
  if (input.method === "SMS" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "estimate.approve");
  if (!perm.ok) return { ok: false, error: perm.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: input.roId, shopId },
    select: { customerId: true, number: true },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  await prisma.repairOrder.updateMany({
    where: { id: input.roId, shopId },
    data: { approvalSentAt: new Date() },
  });

  const channel: SendChannel = input.method === "SMS" ? "sms" : "email";
  const res = await dispatchOutbound({
    channel,
    to: input.to,
    subject: `Your estimate for RO #${ro.number}`,
    body: message,
    shopId,
    customerId: ro.customerId,
    repairOrderId: input.roId,
  });

  if (res.ok) {
    await recordShopAuditEventSafe({
      shopId,
      repairOrderId: input.roId,
      eventType: ShopAuditEventType.ESTIMATE_LINK_CREATED,
      summary: `Estimate shared with customer via ${input.method === "SMS" ? "SMS" : "email"}`,
      metadata: { channel, action: "share_estimate" },
    });
    revalidatePath(`/repair-orders/${input.roId}`);
    revalidatePath(`/repair-orders/${input.roId}/estimate`);
  }
  return res;
}

/** Generate the customer estimate-approval link and send via email or SMS. */
export async function sendEstimateLink(
  repairOrderId: string,
  channel: SendChannel,
): Promise<ShareResult> {
  if (channel === "sms" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "estimate.approve");
  if (!perm.ok) return { ok: false, error: perm.error };

  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: {
      number: true,
      customerId: true,
      customer: { select: { phone: true, email: true, firstName: true } },
      shop: { select: { name: true } },
    },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  const link = await createApprovalLink(repairOrderId);
  if (!link.ok) return { ok: false, error: link.error };

  const greeting = ro.customer.firstName?.trim() || "there";
  const body = `Hello ${greeting}, your estimate from ${ro.shop.name} for RO #${ro.number} is ready. Review the work, acknowledge the shop terms, and approve here: ${link.url}`;
  const to =
    channel === "sms"
      ? (ro.customer.phone?.trim() ?? "")
      : (ro.customer.email?.trim() ?? "");

  if (!to) {
    return {
      ok: false,
      error:
        channel === "sms"
          ? "This customer has no phone number on file."
          : "This customer has no email on file.",
    };
  }

  const res = await dispatchOutbound({
    channel,
    to,
    subject: `Your estimate from ${ro.shop.name} — RO #${ro.number}`,
    body,
    shopId,
    customerId: ro.customerId,
    repairOrderId,
  });

  if (res.ok) {
    await recordShopAuditEventSafe({
      shopId,
      repairOrderId,
      eventType: ShopAuditEventType.ESTIMATE_LINK_CREATED,
      summary: `Estimate approval link sent via ${channel === "sms" ? "SMS" : "email"}`,
      metadata: { channel, action: "send_estimate_link" },
    });
    revalidatePath(`/repair-orders/${repairOrderId}`);
    revalidatePath("/job-board");
  }
  return res;
}

/** Mint (or reuse) the public invoice link for a repair order. */
export async function getInvoiceLink(repairOrderId: string): Promise<LinkResult & { invoiceId?: string }> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "payments.view");
  if (!perm.ok) return { ok: false, error: perm.error };
  const res = await getInvoiceShareLink({ shopId, repairOrderId });
  if (!res.ok) return res;
  return { ok: true, url: res.url, invoiceId: res.invoiceId };
}

/** Share an invoice with the customer via SMS or email (dialog flow). */
export async function shareInvoice(input: {
  invoiceId: string;
  method: ShareMethod;
  to: string;
  message: string;
}): Promise<ShareResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, error: "Message is empty." };
  if (input.method === "SMS" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const inv = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, shopId },
    select: {
      number: true,
      repairOrderId: true,
      repairOrder: { select: { customerId: true } },
    },
  });
  if (!inv) return { ok: false, error: "Invoice not found." };

  await prisma.invoice.updateMany({
    where: { id: input.invoiceId, shopId },
    data: { shareSentAt: new Date() },
  });

  const channel: SendChannel = input.method === "SMS" ? "sms" : "email";
  const res = await dispatchOutbound({
    channel,
    to: input.to,
    subject: `Invoice #${inv.number}`,
    body: message,
    shopId,
    customerId: inv.repairOrder.customerId,
    repairOrderId: inv.repairOrderId,
  });

  if (res.ok) {
    await recordShopAuditEventSafe({
      shopId,
      repairOrderId: inv.repairOrderId,
      invoiceId: input.invoiceId,
      eventType: ShopAuditEventType.INVOICE_LINK_CREATED,
      summary: `Invoice shared with customer via ${input.method === "SMS" ? "SMS" : "email"}`,
      metadata: { channel, action: "share_invoice" },
    });
    revalidatePath(`/repair-orders/${inv.repairOrderId}`);
    revalidatePath(`/repair-orders/${inv.repairOrderId}/payment`);
  }
  return res;
}

/** Generate the invoice share link and send via email or SMS. */
export async function sendInvoiceLink(
  invoiceId: string,
  channel: SendChannel,
): Promise<ShareResult> {
  if (channel === "sms" && !SMS_ENABLED) {
    return { ok: false, error: "Text messaging is disabled." };
  }

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const inv = await prisma.invoice.findFirst({
    where: { id: invoiceId, shopId },
    select: {
      number: true,
      repairOrderId: true,
      repairOrder: {
        select: {
          customerId: true,
          customer: { select: { phone: true, email: true, firstName: true } },
          shop: { select: { name: true } },
        },
      },
    },
  });
  if (!inv) return { ok: false, error: "Invoice not found." };

  const link = await getInvoiceShareLink({ shopId, invoiceId });
  if (!link.ok) return { ok: false, error: link.error };

  const ro = inv.repairOrder;
  const greeting = ro.customer.firstName?.trim() || "there";
  const body = `Hello ${greeting}, your invoice from ${ro.shop.name} (#${inv.number}) is ready. View the invoice and customer acknowledgment here: ${link.url}`;
  const to =
    channel === "sms"
      ? (ro.customer.phone?.trim() ?? "")
      : (ro.customer.email?.trim() ?? "");

  if (!to) {
    return {
      ok: false,
      error:
        channel === "sms"
          ? "This customer has no phone number on file."
          : "This customer has no email on file.",
    };
  }

  const res = await dispatchOutbound({
    channel,
    to,
    subject: `Invoice from ${ro.shop.name} — #${inv.number}`,
    body,
    shopId,
    customerId: ro.customerId,
    repairOrderId: inv.repairOrderId,
  });

  if (res.ok) {
    await recordShopAuditEventSafe({
      shopId,
      repairOrderId: inv.repairOrderId,
      invoiceId,
      eventType: ShopAuditEventType.INVOICE_LINK_CREATED,
      summary: `Invoice payment link sent via ${channel === "sms" ? "SMS" : "email"}`,
      metadata: { channel, action: "send_invoice_link" },
    });
    revalidatePath(`/repair-orders/${inv.repairOrderId}`);
    revalidatePath(`/repair-orders/${inv.repairOrderId}/payment`);
  }
  return res;
}
