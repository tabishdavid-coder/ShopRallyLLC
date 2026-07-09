import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import { getStripe, isStripeEnabled, STRIPE_CHECKOUT_BRANDING } from "@/lib/stripe";
import type { SubscriptionPaymentMode } from "@/generated/prisma";
import {
  fulfillPlanSubscriptionPayment,
} from "@/server/maintenance-subscriptions";
import { getCheckoutStripeContext } from "@/server/services/stripe-connect";

export type MaintenanceCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const CHECKOUT_KIND = "maintenance_plan";

/** Create Stripe Checkout for a pending plan subscription. */
export async function createMaintenancePlanCheckoutSession(opts: {
  subscriptionId: string;
  shopId: string;
  shopSlug: string;
  planName: string;
  vehicleLabel: string;
  customerEmail?: string | null;
  paymentMode: SubscriptionPaymentMode;
  amountCents: number;
  monthlyTermMonths?: number | null;
}): Promise<MaintenanceCheckoutResult> {
  if (!isStripeEnabled()) {
    return { ok: false, error: "Online payments are not configured." };
  }

  const checkoutCtx = await getCheckoutStripeContext(opts.shopId);
  if (!checkoutCtx.canCheckout) {
    return { ok: false, error: checkoutCtx.error };
  }

  const successUrl = publicUrl(
    `/plans/${opts.shopSlug}/success?session_id={CHECKOUT_SESSION_ID}`,
  );
  const cancelUrl = publicUrl(`/plans/${opts.shopSlug}?cancelled=1`);

  const metadata = {
    checkoutKind: CHECKOUT_KIND,
    subscriptionId: opts.subscriptionId,
    shopId: opts.shopId,
  };

  const stripe = getStripe();
  const branding = {
    background_color: "#ffffff",
    button_color: STRIPE_CHECKOUT_BRANDING.primary,
    border_style: "rounded" as const,
    font_family: "inter" as const,
  };

  const description = `${opts.planName} · ${opts.vehicleLabel}`;

  let session: Stripe.Checkout.Session;

  if (opts.paymentMode === "MONTHLY") {
    session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer_email: opts.customerEmail?.trim() || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: opts.amountCents,
              recurring: { interval: "month" },
              product_data: {
                name: `${opts.planName} — Monthly membership`,
                description,
              },
            },
          },
        ],
        subscription_data: { metadata },
        metadata,
        success_url: successUrl,
        cancel_url: cancelUrl,
        branding_settings: branding,
      },
      checkoutCtx.stripeAccount ? { stripeAccount: checkoutCtx.stripeAccount } : undefined,
    );
  } else {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: opts.customerEmail?.trim() || undefined,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: opts.amountCents,
              product_data: {
                name: opts.planName,
                description:
                  opts.paymentMode === "ANNUAL"
                    ? `${description} · Annual prepay`
                    : description,
              },
            },
          },
        ],
        metadata,
        payment_intent_data: { metadata },
        success_url: successUrl,
        cancel_url: cancelUrl,
        branding_settings: branding,
      },
      checkoutCtx.stripeAccount ? { stripeAccount: checkoutCtx.stripeAccount } : undefined,
    );
  }

  if (!session.url) {
    return { ok: false, error: "Could not start checkout. Try again." };
  }

  return { ok: true, url: session.url };
}

/** Activate subscription after successful Stripe Checkout (idempotent). */
export async function handleMaintenanceCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const subscriptionId = session.metadata?.subscriptionId;
  const shopId = session.metadata?.shopId;
  if (!subscriptionId || !shopId) {
    console.warn("[stripe webhook] maintenance checkout missing metadata", session.id);
    return;
  }

  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    select: { id: true, status: true, planId: true, startsAt: true, endsAt: true },
  });
  if (!sub) {
    console.warn("[stripe webhook] maintenance subscription not found", { subscriptionId, shopId });
    return;
  }

  if (sub.status === "ACTIVE") return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const amountCents = session.amount_total ?? 0;

  const existingPayment = paymentIntentId
    ? await prisma.subscriptionPayment.findFirst({
        where: { stripePaymentId: paymentIntentId },
        select: { id: true },
      })
    : stripeSubscriptionId
      ? await prisma.subscriptionPayment.findFirst({
          where: { stripePaymentId: stripeSubscriptionId },
          select: { id: true },
        })
      : null;

  if (existingPayment) return;

  await fulfillPlanSubscriptionPayment({
    shopId,
    subscriptionId: sub.id,
    planId: sub.planId,
    amountCents,
    stripePaymentId: paymentIntentId ?? stripeSubscriptionId ?? session.id,
    stripeSubscriptionId: stripeSubscriptionId ?? null,
    periodStart: sub.startsAt,
    periodEnd: sub.endsAt,
  });
}

/** Public success page — resolve member portal from Checkout session id. */
export async function getMaintenanceCheckoutSuccess(shopSlug: string, sessionId: string) {
  if (!isStripeEnabled() || !sessionId.startsWith("cs_")) {
    return null;
  }

  const shopData = await prisma.maintenanceProgramSettings.findFirst({
    where: {
      enabled: true,
      OR: [{ plansSlug: shopSlug }, { shop: { code: { equals: shopSlug, mode: "insensitive" } } }],
    },
    select: { shopId: true },
  });
  if (!shopData) return null;

  const checkoutCtx = await getCheckoutStripeContext(shopData.shopId);
  if (!checkoutCtx.canCheckout) return null;

  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(
      sessionId,
      {},
      checkoutCtx.stripeAccount ? { stripeAccount: checkoutCtx.stripeAccount } : undefined,
    );
  } catch {
    return null;
  }

  if (session.metadata?.checkoutKind !== CHECKOUT_KIND) return null;

  const subscriptionId = session.metadata.subscriptionId;
  const shopId = session.metadata.shopId;
  if (!subscriptionId || !shopId) return null;

  if (session.payment_status === "paid" && session.status === "complete") {
    const sub = await prisma.planSubscription.findFirst({
      where: { id: subscriptionId, shopId },
      select: { status: true, planId: true },
    });
    if (sub && sub.status === "PENDING") {
      await handleMaintenanceCheckoutCompleted(session);
    }
  }

  const sub = await prisma.planSubscription.findFirst({
    where: { id: subscriptionId, shopId },
    include: {
      plan: { select: { name: true } },
      customer: { select: { firstName: true, lastName: true } },
    },
  });
  if (!sub) return null;

  return {
    paid: session.payment_status === "paid",
    status: sub.status,
    memberPortalToken: sub.memberPortalToken,
    planName: sub.plan.name,
    customerName: `${sub.customer.firstName} ${sub.customer.lastName}`.trim(),
  };
}
