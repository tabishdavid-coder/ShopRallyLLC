import "server-only";

import type Stripe from "stripe";

import type { SeoStripeCatalogId } from "@/lib/seo-stripe-products";
import { SEO_STRIPE_CATALOG, resolveSeoStripePriceId } from "@/lib/seo-stripe-products";
import { prisma } from "@/db/client";
import { publicUrl } from "@/lib/app-url";
import type { PlanFeatureSet } from "@/lib/plans";
import { PLAN_FEATURES_RELEASE_KEY } from "@/lib/release-flags";
import { getStripe, isStripeEnabled, STRIPE_CHECKOUT_BRANDING } from "@/lib/stripe";
import { getShopId } from "@/lib/shop";

export const SEO_CHECKOUT_KIND = "seo_addon";

export type SeoCheckoutResult = { ok: true; url: string } | { ok: false; error: string };

function parsePlanFeatureOverrides(raw: unknown): Partial<PlanFeatureSet> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key === PLAN_FEATURES_RELEASE_KEY) continue;
    if (typeof value === "boolean") out[key] = value;
  }
  return out as Partial<PlanFeatureSet>;
}

function preserveReleaseBlock(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const release = (raw as Record<string, unknown>)[PLAN_FEATURES_RELEASE_KEY];
  if (!release || typeof release !== "object" || Array.isArray(release)) return undefined;
  return { [PLAN_FEATURES_RELEASE_KEY]: release };
}

function parseFulfillmentIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.startsWith("cs_"));
}

/** Platform Stripe Checkout for Growth Engine SEO add-ons (not shop Connect). */
export async function createSeoAddonCheckoutSession(
  shopId: string,
  catalogId: SeoStripeCatalogId,
): Promise<SeoCheckoutResult> {
  if (!isStripeEnabled()) {
    return { ok: false, error: "Stripe is not configured on this platform." };
  }

  const priceId = resolveSeoStripePriceId(catalogId);
  if (!priceId) {
    return {
      ok: false,
      error: `${SEO_STRIPE_CATALOG[catalogId].label} checkout is not available yet. Contact support.`,
    };
  }

  const catalog = SEO_STRIPE_CATALOG[catalogId];
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, email: true },
  });
  if (!shop) return { ok: false, error: "Shop not found." };

  const metadata = {
    checkoutKind: SEO_CHECKOUT_KIND,
    shopId,
    catalogId,
  };

  const successUrl = publicUrl(
    `/marketing/seo-automation/plan?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
  );
  const cancelUrl = publicUrl("/marketing/seo-automation/plan?checkout=cancelled");

  const stripe = getStripe();
  const branding = {
    background_color: "#ffffff",
    button_color: STRIPE_CHECKOUT_BRANDING.primary,
    border_style: "rounded" as const,
    font_family: "inter" as const,
  };

  const session = await stripe.checkout.sessions.create({
    mode: catalog.mode,
    customer_email: shop.email?.trim() || undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata,
    ...(catalog.mode === "subscription"
      ? { subscription_data: { metadata } }
      : { payment_intent_data: { metadata } }),
    success_url: successUrl,
    cancel_url: cancelUrl,
    branding_settings: branding,
  });

  if (!session.url) {
    return { ok: false, error: "Could not start checkout. Try again." };
  }

  return { ok: true, url: session.url };
}

async function markSessionFulfilled(shopId: string, sessionId: string): Promise<void> {
  const settings = await prisma.shopSeoSettings.findUnique({
    where: { shopId },
    select: { seoStripeFulfillments: true },
  });
  const existing = parseFulfillmentIds(settings?.seoStripeFulfillments);
  if (existing.includes(sessionId)) return;

  await prisma.shopSeoSettings.upsert({
    where: { shopId },
    create: { shopId, seoStripeFulfillments: [sessionId] },
    update: { seoStripeFulfillments: [...existing, sessionId] },
  });
}

async function grantSeoCatalogPurchase(
  shopId: string,
  catalogId: SeoStripeCatalogId,
  stripeSubscriptionId: string | null,
): Promise<void> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { planFeatures: true },
  });
  if (!shop) return;

  const overrides = parsePlanFeatureOverrides(shop.planFeatures);
  const releaseBlock = preserveReleaseBlock(shop.planFeatures);
  const featurePatch: Partial<PlanFeatureSet> = {};

  if (catalogId === "shopsite-monthly" || catalogId === "web-seo-bundle-monthly") {
    featurePatch.shopSite = true;
  }
  if (catalogId === "seo-monthly" || catalogId === "web-seo-bundle-monthly") {
    featurePatch.websiteSeo = true;
  }

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      planFeatures: {
        ...overrides,
        ...featurePatch,
        ...releaseBlock,
      },
    },
  });

  const seoSubscriptionIds: SeoStripeCatalogId[] = ["seo-monthly", "web-seo-bundle-monthly"];
  if (seoSubscriptionIds.includes(catalogId) && stripeSubscriptionId) {
    await prisma.shopSeoSettings.upsert({
      where: { shopId },
      create: {
        shopId,
        seoAutopilotStripeSubscriptionId: stripeSubscriptionId,
      },
      update: {
        seoAutopilotStripeSubscriptionId: stripeSubscriptionId,
      },
    });
  }
}

/** Idempotent fulfillment after Checkout — used by success redirect and future webhook. */
export async function fulfillSeoCheckoutSession(
  sessionId: string,
  expectedShopId?: string,
): Promise<{ ok: true; catalogId: SeoStripeCatalogId; alreadyFulfilled?: boolean } | { ok: false; error: string }> {
  if (!isStripeEnabled() || !sessionId.startsWith("cs_")) {
    return { ok: false, error: "Invalid checkout session." };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.metadata?.checkoutKind !== SEO_CHECKOUT_KIND) {
    return { ok: false, error: "Not an SEO add-on checkout." };
  }

  const shopId = session.metadata.shopId;
  const catalogId = session.metadata.catalogId as SeoStripeCatalogId;
  if (!shopId || !catalogId || !(catalogId in SEO_STRIPE_CATALOG)) {
    return { ok: false, error: "Checkout metadata is incomplete." };
  }

  if (expectedShopId && shopId !== expectedShopId) {
    return { ok: false, error: "Checkout session does not belong to this shop." };
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return { ok: false, error: "Payment is not complete yet." };
  }

  const settings = await prisma.shopSeoSettings.findUnique({
    where: { shopId },
    select: { seoStripeFulfillments: true },
  });
  const fulfilled = parseFulfillmentIds(settings?.seoStripeFulfillments);
  if (fulfilled.includes(sessionId)) {
    return { ok: true, catalogId, alreadyFulfilled: true };
  }

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  await grantSeoCatalogPurchase(shopId, catalogId, stripeSubscriptionId);
  await markSessionFulfilled(shopId, sessionId);

  return { ok: true, catalogId };
}

/** Webhook handler — call from Stripe route when checkoutKind is seo_addon. */
export async function handleSeoCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.checkoutKind !== SEO_CHECKOUT_KIND || !session.id) return;
  await fulfillSeoCheckoutSession(session.id);
}

/** Success page helper — resolves checkout for current shop. */
export async function fulfillSeoCheckoutForCurrentShop(sessionId: string) {
  const shopId = await getShopId();
  return fulfillSeoCheckoutSession(sessionId, shopId);
}
