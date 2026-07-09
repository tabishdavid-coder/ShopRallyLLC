import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/db/client";
import { InvoiceStatus } from "@/generated/prisma";
import { getStripe, STRIPE_CHECKOUT_BRANDING } from "@/lib/stripe";
import { publicUrl } from "@/lib/app-url";
import { ShopAuditEventType } from "@/generated/prisma";
import { recordInvoicePayment } from "@/server/services/invoice-payments";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { getCheckoutStripeContext } from "@/server/services/stripe-connect";

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Create a Stripe Checkout Session for the invoice balance due. */
export async function createInvoiceCheckoutSession(
  shareToken: string,
  opts?: { auditActor?: { userId: string; email: string } | null },
): Promise<CheckoutResult> {
  const inv = await prisma.invoice.findUnique({
    where: { shareToken },
    select: {
      id: true,
      shopId: true,
      number: true,
      balanceCents: true,
      status: true,
      repairOrderId: true,
      repairOrder: {
        select: {
          number: true,
          customer: { select: { email: true } },
          vehicle: { select: { year: true, make: true, model: true } },
          shop: { select: { name: true } },
        },
      },
    },
  });

  if (!inv) return { ok: false, error: "Invoice not found." };
  if (inv.balanceCents <= 0 || inv.status === InvoiceStatus.PAID) {
    return { ok: false, error: "This invoice is already paid." };
  }

  const checkoutCtx = await getCheckoutStripeContext(inv.shopId);
  if (!checkoutCtx.canCheckout) {
    return { ok: false, error: checkoutCtx.error };
  }

  const ro = inv.repairOrder;
  const vehicleLabel =
    [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model].filter(Boolean).join(" ") || "Vehicle";
  const invoiceUrl = publicUrl(`/invoice/${shareToken}`);

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: ro.customer.email?.trim() || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: inv.balanceCents,
            product_data: {
              name: `Invoice #${inv.number} — ${ro.shop.name}`,
              description: `RO #${ro.number} · ${vehicleLabel}`,
            },
          },
        },
      ],
      metadata: {
        invoiceId: inv.id,
        shopId: inv.shopId,
        shareToken,
      },
      payment_intent_data: {
        metadata: {
          invoiceId: inv.id,
          shopId: inv.shopId,
          shareToken,
        },
      },
      success_url: `${invoiceUrl}?paid=1`,
      cancel_url: `${invoiceUrl}?cancelled=1`,
      branding_settings: {
        background_color: "#ffffff",
        button_color: STRIPE_CHECKOUT_BRANDING.primary,
        border_style: "rounded",
        font_family: "inter",
      },
    },
    checkoutCtx.stripeAccount ? { stripeAccount: checkoutCtx.stripeAccount } : undefined,
  );

  if (!session.url) {
    return { ok: false, error: "Could not start checkout. Try again." };
  }

  await recordShopAuditEventSafe({
    shopId: inv.shopId,
    eventType: ShopAuditEventType.PAYMENT_CHECKOUT_STARTED,
    repairOrderId: inv.repairOrderId,
    invoiceId: inv.id,
    summary: `Stripe Checkout started for invoice #${inv.number}`,
    metadata: { shareToken, sessionId: session.id, balanceCents: inv.balanceCents },
    actor: opts?.auditActor,
  });

  return { ok: true, url: session.url };
}

/** Idempotently record a successful Stripe payment against an invoice. */
export async function recordStripeInvoicePayment(opts: {
  invoiceId: string;
  shopId: string;
  amountCents: number;
  stripePaymentIntentId: string;
  stripeSessionId?: string;
}): Promise<{ created: boolean }> {
  const existing = await prisma.payment.findFirst({
    where: { stripePaymentIntentId: opts.stripePaymentIntentId },
    select: { id: true },
  });
  if (existing) return { created: false };

  const res = await recordInvoicePayment({
    invoiceId: opts.invoiceId,
    shopId: opts.shopId,
    amountCents: opts.amountCents,
    method: "CARD",
    reference: opts.stripeSessionId ?? "Stripe Checkout",
    stripePaymentIntentId: opts.stripePaymentIntentId,
    auditActor: null,
  });
  if (!res.ok) throw new Error(res.error);

  return { created: true };
}

/** Sum succeeded card payments for dashboard gross volume. */
export async function getGrossVolumeCents(shopId: string, since?: Date): Promise<number> {
  const agg = await prisma.payment.aggregate({
    where: {
      shopId,
      ...(since ? { paidAt: { gte: since } } : {}),
    },
    _sum: { amountCents: true },
  });
  return agg._sum.amountCents ?? 0;
}

/** Handle checkout.session.completed from Stripe webhook. */
export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const invoiceId = session.metadata?.invoiceId;
  const shopId = session.metadata?.shopId;
  if (!invoiceId || !shopId) {
    console.warn("[stripe webhook] checkout.session.completed missing metadata", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn("[stripe webhook] checkout.session.completed missing payment_intent", session.id);
    return;
  }

  const amountCents = session.amount_total ?? 0;
  if (amountCents <= 0) return;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, shopId },
    select: { id: true },
  });
  if (!invoice) {
    console.warn("[stripe webhook] invoice not found for metadata", { invoiceId, shopId, sessionId: session.id });
    return;
  }

  await recordStripeInvoicePayment({
    invoiceId,
    shopId,
    amountCents,
    stripePaymentIntentId: paymentIntentId,
    stripeSessionId: session.id,
  });
}
