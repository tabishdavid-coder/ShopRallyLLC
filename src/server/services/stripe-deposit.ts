import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/db/client";
import { DepositRequestStatus, PaymentMethod, ShopAuditEventType } from "@/generated/prisma";
import { getStripe, STRIPE_CHECKOUT_BRANDING } from "@/lib/stripe";
import { publicUrl } from "@/lib/app-url";
import { recordShopAuditEventSafe } from "@/server/shop-audit";
import { getCheckoutStripeContext } from "@/server/services/stripe-connect";
import { revalidateEstimatePaths } from "@/lib/estimate-revalidate";
import { revalidatePath } from "next/cache";

export type DepositCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Create Stripe Checkout for an estimate deposit request. */
export async function createDepositCheckoutSession(
  shareToken: string,
  opts?: { auditActor?: { userId: string; email: string } | null },
): Promise<DepositCheckoutResult> {
  const dep = await prisma.depositRequest.findUnique({
    where: { shareToken },
    select: {
      id: true,
      shopId: true,
      amountCents: true,
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

  if (!dep) return { ok: false, error: "Deposit request not found." };
  if (dep.status !== DepositRequestStatus.PENDING) {
    return { ok: false, error: "This deposit has already been paid or cancelled." };
  }
  if (dep.amountCents <= 0) {
    return { ok: false, error: "Invalid deposit amount." };
  }

  const checkoutCtx = await getCheckoutStripeContext(dep.shopId);
  if (!checkoutCtx.canCheckout) {
    return { ok: false, error: checkoutCtx.error };
  }

  const ro = dep.repairOrder;
  const vehicleLabel =
    [ro.vehicle?.year, ro.vehicle?.make, ro.vehicle?.model].filter(Boolean).join(" ") || "Vehicle";
  const depositUrl = publicUrl(`/deposit/${shareToken}`);

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
            unit_amount: dep.amountCents,
            product_data: {
              name: `Deposit — ${ro.shop.name}`,
              description: `RO #${ro.number} · ${vehicleLabel}`,
            },
          },
        },
      ],
      metadata: {
        checkoutKind: "estimate_deposit",
        depositRequestId: dep.id,
        shopId: dep.shopId,
        shareToken,
      },
      payment_intent_data: {
        metadata: {
          checkoutKind: "estimate_deposit",
          depositRequestId: dep.id,
          shopId: dep.shopId,
          shareToken,
        },
      },
      success_url: `${depositUrl}?paid=1`,
      cancel_url: `${depositUrl}?cancelled=1`,
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
    shopId: dep.shopId,
    eventType: ShopAuditEventType.PAYMENT_CHECKOUT_STARTED,
    repairOrderId: dep.repairOrderId,
    summary: `Stripe Checkout started for estimate deposit (${formatUsd(dep.amountCents)})`,
    metadata: { shareToken, sessionId: session.id, depositRequestId: dep.id },
    actor: opts?.auditActor,
  });

  return { ok: true, url: session.url };
}

/** Mark deposit paid from Stripe webhook (idempotent). */
export async function handleDepositCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const depositRequestId = session.metadata?.depositRequestId;
  const shopId = session.metadata?.shopId;
  if (!depositRequestId || !shopId) {
    console.warn("[stripe webhook] deposit checkout missing metadata", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.warn("[stripe webhook] deposit checkout missing payment_intent", session.id);
    return;
  }

  const amountCents = session.amount_total ?? 0;
  if (amountCents <= 0) return;

  const existing = await prisma.depositRequest.findFirst({
    where: { id: depositRequestId, shopId, stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });
  if (existing) return;

  const dep = await prisma.depositRequest.findFirst({
    where: { id: depositRequestId, shopId },
    select: { id: true, status: true, repairOrderId: true, amountCents: true },
  });
  if (!dep || dep.status !== DepositRequestStatus.PENDING) return;

  await prisma.depositRequest.update({
    where: { id: dep.id },
    data: {
      status: DepositRequestStatus.PAID,
      paidAt: new Date(),
      paidMethod: PaymentMethod.CARD,
      stripePaymentIntentId: paymentIntentId,
    },
  });

  await recordShopAuditEventSafe({
    shopId,
    repairOrderId: dep.repairOrderId,
    eventType: ShopAuditEventType.DEPOSIT_PAID,
    summary: `Deposit received via Stripe (${formatUsd(amountCents)})`,
    metadata: {
      depositRequestId: dep.id,
      stripePaymentIntentId: paymentIntentId,
      sessionId: session.id,
    },
    actor: null,
  });

  for (const path of revalidateEstimatePaths(dep.repairOrderId)) {
    revalidatePath(path);
  }
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
