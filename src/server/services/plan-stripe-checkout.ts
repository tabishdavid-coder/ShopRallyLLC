import "server-only";

import type Stripe from "stripe";

import { prisma } from "@/db/client";
import type { Prisma } from "@/generated/prisma";
import { publicUrl } from "@/lib/app-url";
import {
  isAiPlusCheckoutConfigured,
  isIgnitionCheckoutConfigured,
  resolvePlanStripePriceId,
  type PlanStripeCatalogId,
} from "@/lib/plan-stripe-products";
import { PLAN_FEATURES_RELEASE_KEY } from "@/lib/release-flags";
import { getStripe, isStripeEnabled, STRIPE_CHECKOUT_BRANDING } from "@/lib/stripe";
import { isCorePlan } from "@/lib/plans";

export const PLAN_CHECKOUT_KIND = "shop_plan";

export type PlanCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

function branding() {
  return {
    background_color: "#ffffff",
    button_color: STRIPE_CHECKOUT_BRANDING.primary,
    border_style: "rounded" as const,
    font_family: "inter" as const,
  };
}

function mergePlanFeatures(
  raw: unknown,
  patch: Record<string, boolean>,
): Record<string, unknown> {
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : {};
  const release = base[PLAN_FEATURES_RELEASE_KEY];
  for (const [k, v] of Object.entries(patch)) {
    base[k] = v;
  }
  if (release !== undefined) base[PLAN_FEATURES_RELEASE_KEY] = release;
  return base;
}

/** Stripe Checkout for Ignition CRM subscription (platform account, not Connect). */
export async function createIgnitionCheckoutSession(
  shopId: string,
  interval: "monthly" | "annual" = "monthly",
): Promise<PlanCheckoutResult> {
  if (!isStripeEnabled()) {
    return { ok: false, error: "Stripe is not configured on this platform." };
  }
  if (!isIgnitionCheckoutConfigured()) {
    return {
      ok: false,
      error:
        "Ignition checkout is not available yet. Set STRIPE_PRICE_IGNITION_MONTHLY / ANNUAL, or contact support.",
    };
  }

  const catalogId: PlanStripeCatalogId =
    interval === "annual" ? "ignition_annual" : "ignition_monthly";
  const priceId =
    resolvePlanStripePriceId(catalogId) ??
    resolvePlanStripePriceId(interval === "annual" ? "ignition_monthly" : "ignition_annual");
  if (!priceId) {
    return { ok: false, error: "Ignition price is not configured." };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      email: true,
      stripeCustomerId: true,
      plan: true,
      billingStatus: true,
    },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  const metadata = {
    checkoutKind: PLAN_CHECKOUT_KIND,
    shopId,
    catalogId,
    plan: "STARTER",
  };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(shop.stripeCustomerId
      ? { customer: shop.stripeCustomerId }
      : { customer_email: shop.email?.trim() || undefined }),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: publicUrl(
      `/settings/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    ),
    cancel_url: publicUrl("/settings/subscription?checkout=cancelled"),
    branding_settings: branding(),
    allow_promotion_codes: true,
  });

  if (!session.url) {
    return { ok: false, error: "Could not start checkout. Try again." };
  }
  return { ok: true, url: session.url };
}

/** Stripe Checkout for AI Plus ($49.99/mo) — Core shops only. */
export async function createAiPlusCheckoutSession(
  shopId: string,
): Promise<PlanCheckoutResult> {
  if (!isStripeEnabled()) {
    return { ok: false, error: "Stripe is not configured on this platform." };
  }
  if (!isAiPlusCheckoutConfigured()) {
    return {
      ok: false,
      error:
        "AI Plus checkout is not available yet. Set STRIPE_PRICE_AI_PLUS_MONTHLY, or contact support.",
    };
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: {
      name: true,
      email: true,
      stripeCustomerId: true,
      plan: true,
      planFeatures: true,
    },
  });
  if (!shop) return { ok: false, error: "Shop not found." };
  if (!isCorePlan(shop.plan)) {
    return { ok: false, error: "AI Plus is available on the Ignition (Core) plan only." };
  }

  const priceId = resolvePlanStripePriceId("ai_plus_monthly");
  if (!priceId) return { ok: false, error: "AI Plus price is not configured." };

  const metadata = {
    checkoutKind: PLAN_CHECKOUT_KIND,
    shopId,
    catalogId: "ai_plus_monthly",
    addon: "ai_plus",
  };

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    ...(shop.stripeCustomerId
      ? { customer: shop.stripeCustomerId }
      : { customer_email: shop.email?.trim() || undefined }),
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    subscription_data: { metadata },
    success_url: publicUrl(
      `/settings/subscription?checkout=success&addon=ai_plus&session_id={CHECKOUT_SESSION_ID}`,
    ),
    cancel_url: publicUrl("/settings/subscription?checkout=cancelled"),
    branding_settings: branding(),
  });

  if (!session.url) {
    return { ok: false, error: "Could not start checkout. Try again." };
  }
  return { ok: true, url: session.url };
}

/** Fulfill Ignition / AI Plus Checkout after webhook. */
export async function handlePlanCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.metadata?.checkoutKind !== PLAN_CHECKOUT_KIND) return;

  const shopId = session.metadata.shopId?.trim();
  const catalogId = session.metadata.catalogId?.trim();
  if (!shopId || !catalogId) {
    console.error("[plan-stripe] missing shopId/catalogId on session", session.id);
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { planFeatures: true, plan: true },
  });
  if (!shop) {
    console.error("[plan-stripe] shop not found", shopId);
    return;
  }

  if (catalogId === "ai_plus_monthly") {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        planFeatures: mergePlanFeatures(shop.planFeatures, {
          freeformRoIntake: true,
        }) as Prisma.InputJsonValue,
      },
    });
    return;
  }

  if (catalogId === "ignition_monthly" || catalogId === "ignition_annual") {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        plan: "STARTER",
        billingStatus: "ACTIVE",
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    });
  }
}
