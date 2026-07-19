"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/db/client";
import { PaymentMethod, ShopAuditEventType } from "@/generated/prisma";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { getShopId } from "@/lib/shop";
import { getCurrentUser } from "@/lib/platform";
import { rateLimitAction } from "@/lib/rate-limit";
import { ensureInvoiceForRepairOrder, getInvoiceShareLink } from "@/server/invoice";
import { requirePermission } from "@/server/permissions";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { recordInvoicePayment } from "@/server/services/invoice-payments";
import { reconcileOrphanDepositsForRo } from "@/server/services/deposit-payments";
import { isStripeEnabled } from "@/lib/stripe";
import { createInvoiceCheckoutSession } from "@/server/services/stripe-payments";

export type InvoiceCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type PaymentActionResult = { ok: true } | { ok: false; error: string };

const ManualPaymentInput = z.object({
  repairOrderId: z.string().min(1),
  method: z.enum(["CASH", "CHECK", "CARD", "OTHER"]),
  amountCents: z.number().int().positive("Amount must be greater than zero."),
  reference: z.string().trim().max(120).optional(),
});

/** Public action — start Stripe Checkout for an invoice share token. */
export async function startInvoiceCheckout(shareToken: string): Promise<InvoiceCheckoutResult> {
  const token = shareToken.trim();
  if (!token) return { ok: false, error: "Invalid invoice link." };
  return createInvoiceCheckoutSession(token, { auditActor: null });
}

/** Staff action — start Stripe Checkout from the RO payment tab. */
export async function startStaffInvoiceCheckout(repairOrderId: string): Promise<InvoiceCheckoutResult> {
  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const user = await getCurrentUser();
  const link = await getInvoiceShareLink({ shopId, repairOrderId });
  if (!link.ok) return { ok: false, error: link.error };
  const token = link.url.split("/invoice/")[1];
  if (!token) return { ok: false, error: "Could not resolve invoice link." };
  return createInvoiceCheckoutSession(token, {
    auditActor: { userId: user.id, email: user.email },
  });
}

/** Record an in-shop manual payment (cash, check, card, other). */
export async function recordManualPayment(raw: z.input<typeof ManualPaymentInput>): Promise<PaymentActionResult> {
  const parsed = ManualPaymentInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payment." };
  }

  const shopId = await getShopId();
  const user = await getCurrentUser();
  const limited = rateLimitAction("record-manual-payment", user.id, 20, 60_000);
  if (!limited.ok) return { ok: false, error: "Too many payment attempts. Try again shortly." };

  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const { repairOrderId, method, amountCents, reference } = parsed.data;

  await reconcileOrphanDepositsForRo({
    shopId,
    repairOrderId,
    auditActor: { userId: user.id, email: user.email },
  });

  const ro = await prisma.repairOrder.findFirst({
    where: { id: repairOrderId, shopId },
    select: {
      invoice: { select: { id: true, balanceCents: true } },
    },
  });
  if (!ro) return { ok: false, error: "Repair order not found." };

  let invoice = ro.invoice;
  if (!invoice) {
    const created = await ensureInvoiceForRepairOrder(repairOrderId, shopId, {
      forPaymentCollection: true,
    });
    if (!created) return { ok: false, error: "Invoice is not available for this repair order." };
    invoice = { id: created.id, balanceCents: created.balanceCents };
  }

  const res = await recordInvoicePayment({
    invoiceId: invoice.id,
    shopId,
    amountCents,
    method: method as PaymentMethod,
    reference: reference ?? null,
    auditActor: { userId: user.id, email: user.email },
  });

  if (res.ok) {
    for (const path of revalidateEstimatePaths(repairOrderId)) {
      revalidatePath(path);
    }
    revalidatePath("/dashboard");
  }

  return res;
}

/** Stub — guides staff to Stripe Dashboard until Refunds API is wired. */
export async function requestStripeRefund(paymentId: string): Promise<PaymentActionResult> {
  const id = paymentId.trim();
  if (!id) return { ok: false, error: "Invalid payment." };

  const shopId = await getShopId();
  const perm = await requirePermission(shopId, "payments.collect");
  if (!perm.ok) return { ok: false, error: perm.error };

  const payment = await prisma.payment.findFirst({
    where: { id, shopId },
    select: {
      stripePaymentIntentId: true,
      amountCents: true,
      reference: true,
      invoice: { select: { repairOrderId: true, id: true } },
    },
  });

  if (!payment) return { ok: false, error: "Payment not found." };
  if (!payment.stripePaymentIntentId) {
    return {
      ok: false,
      error: "Only Stripe Checkout payments can be refunded online. Use a manual adjustment for cash or check.",
    };
  }

  const pi = payment.stripePaymentIntentId;
  const dashUrl = `https://dashboard.stripe.com/test/payments/${pi}`;

  if (!isStripeEnabled()) {
    return {
      ok: false,
      error: `Stripe is not configured. Refund ${formatRefundAmount(payment.amountCents)} in the Stripe Dashboard when keys are set.`,
    };
  }

  await recordShopAuditEventSafe({
    shopId,
    eventType: ShopAuditEventType.PAYMENT_REFUND_REQUESTED,
    repairOrderId: payment.invoice.repairOrderId,
    invoiceId: payment.invoice.id,
    paymentId: id,
    summary: `Refund requested for ${formatRefundAmount(payment.amountCents)} (Stripe Dashboard)`,
    metadata: { stripePaymentIntentId: pi, amountCents: payment.amountCents },
  });

  return {
    ok: false,
    error: `In-app refunds coming soon. Refund ${formatRefundAmount(payment.amountCents)} in Stripe Dashboard → Payments (${pi}). Open: ${dashUrl}`,
  };
}

function formatRefundAmount(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
