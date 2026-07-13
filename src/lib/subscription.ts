import "server-only";

import { prisma } from "@/db/client";
import type { BillingStatus, ShopPlan, ShopStatus } from "@/generated/prisma";
import {
  PLANS,
  PLAN_ORDER,
  PHASE_ONE_LAUNCH,
  PUBLIC_PLAN_ORDER,
  billingStatusLabel,
  resolvePlanFeatures,
  shopHasFeature,
  type PlanFeature,
  type PlanFeatureSet,
} from "@/lib/plans";
import {
  isModuleReleased,
  type ReleaseModule,
  RELEASE_MODULE_LABELS,
} from "@/lib/release-flags";

/** Default trial length for new shop signups. */
export const TRIAL_DAYS = 14;

/** Friendly feature keys used in UI gates and docs. */
export type SubscriptionFeature =
  | "coreCrm"
  | "booking"
  | "inspections"
  | "parts"
  | "payments"
  /** Stripe Connect / online RO payment capture — same entitlement as `payments` (integrations). */
  | "stripePayments"
  | "sms"
  | "laborGuide"
  | "motorLabor"
  | "reports"
  | "integrations"
  | "multiLocation"
  | "api"
  | "shop_site"
  | "website_seo"
  | "marketing_campaigns"
  | "maintenance_programs"
  | "ai_review_replies"
  | "ai_campaign_drafting"
  | "ai_seo_content"
  | "ai_customer_insights"
  | "ai_receptionist"
  /** Parts/labor markup matrices — Pro+ only. */
  | "markupMatrices"
  /** Auto.dev plate→VIN + rich VIN decode — Pro+ only. */
  | "autodevDecoding"
  /** Smart AI repair-order intake — AI Plus add-on. */
  | "freeform_ro_intake";

const FEATURE_MAP: Record<SubscriptionFeature, PlanFeature | null> = {
  coreCrm: null, // always on
  booking: "appointments",
  inspections: "digitalInspections",
  parts: "partsTech",
  /** Customer Stripe Connect / Checkout — Pro+ only (maps to plan `integrations`). */
  payments: "integrations",
  stripePayments: "integrations",
  sms: "customerSms",
  laborGuide: "laborGuide",
  motorLabor: "motorLabor",
  reports: "reports",
  integrations: "integrations",
  multiLocation: "multiLocation",
  api: "advancedReports",
  shop_site: "shopSite",
  website_seo: "websiteSeo",
  marketing_campaigns: "marketingCampaigns",
  maintenance_programs: "maintenancePrograms",
  ai_review_replies: "aiReviewReplies",
  ai_campaign_drafting: "aiCampaignDrafting",
  ai_seo_content: "aiSeoContent",
  ai_customer_insights: "aiCustomerInsights",
  ai_receptionist: "aiReceptionist",
  markupMatrices: "markupMatrices",
  autodevDecoding: "autodevDecoding",
  freeform_ro_intake: "freeformRoIntake",
};

/** Map subscription features that require a phased release flag. */
const FEATURE_RELEASE_MODULE: Partial<Record<SubscriptionFeature, ReleaseModule>> = {
  booking: "growthEngine",
  parts: "partsTech",
  sms: "sms",
  motorLabor: "motorLabor",
  shop_site: "shopSite",
  website_seo: "websiteSeo",
  marketing_campaigns: "growthEngine",
  maintenance_programs: "growthEngine",
  ai_review_replies: "aiSuite",
  ai_campaign_drafting: "aiSuite",
  ai_seo_content: "aiSuite",
  ai_customer_insights: "aiSuite",
  ai_receptionist: "aiSuite",
  freeform_ro_intake: "aiSuite",
};

export type ShopSubscription = {
  shopId: string;
  plan: ShopPlan;
  billingStatus: BillingStatus;
  trialEndsAt: Date | null;
  planFeatures: unknown;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planName: string;
  planTagline: string;
  monthlyCents: number;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  features: PlanFeatureSet;
};

export async function getShopSubscription(shopId: string): Promise<ShopSubscription> {
  const shop = await prisma.shop.findUniqueOrThrow({
    where: { id: shopId },
    select: {
      id: true,
      plan: true,
      billingStatus: true,
      trialEndsAt: true,
      planFeatures: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });

  const def = PLANS[shop.plan];
  const features = resolvePlanFeatures(shop);
  const isTrialing = shop.billingStatus === "TRIAL";
  const trialDaysRemaining =
    isTrialing && shop.trialEndsAt
      ? Math.max(0, Math.ceil((shop.trialEndsAt.getTime() - Date.now()) / 86_400_000))
      : null;

  return {
    shopId: shop.id,
    plan: shop.plan,
    billingStatus: shop.billingStatus,
    trialEndsAt: shop.trialEndsAt,
    planFeatures: shop.planFeatures,
    stripeCustomerId: shop.stripeCustomerId,
    stripeSubscriptionId: shop.stripeSubscriptionId,
    planName: def.name,
    planTagline: def.tagline,
    monthlyCents: def.monthlyCents,
    isTrialing,
    trialDaysRemaining,
    features,
  };
}

/** Check whether a shop may use a product feature (respects trial + plan). */
export async function canUseFeature(
  shopId: string,
  feature: SubscriptionFeature,
): Promise<boolean> {
  const sub = await getShopSubscription(shopId);

  if (sub.billingStatus === "CANCELED" || sub.billingStatus === "PAST_DUE") {
    // Past-due shops keep read access; canceled shops lose paid features.
    if (sub.billingStatus === "CANCELED") return feature === "coreCrm";
  }

  const mapped = FEATURE_MAP[feature];
  if (mapped === null) return true;

  return shopHasFeature(sub, mapped);
}

/** Per-shop release check (no plan entitlement). See docs/PHASED-ROLLOUT.md. */
export async function isReleased(shopId: string, module: ReleaseModule): Promise<boolean> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { planFeatures: true },
  });
  if (!shop) return false;
  return isModuleReleased(shop.planFeatures, module);
}

/**
 * Plan entitlement AND phased release flag.
 * Use for Growth Engine, SMS, MOTOR, PartsTech, ShopSite/SEO, AI.
 */
export async function canUseReleasedFeature(
  shopId: string,
  feature: SubscriptionFeature,
): Promise<boolean> {
  const entitled = await canUseFeature(shopId, feature);
  if (!entitled) return false;
  const module = FEATURE_RELEASE_MODULE[feature];
  if (!module) return true;
  return isReleased(shopId, module);
}

export function releaseDeniedMessage(module: ReleaseModule): string {
  const label = RELEASE_MODULE_LABELS[module];
  return `${label} is not released for this shop yet. Ask a platform admin to enable it under Release flags.`;
}

/**
 * Server-action gate: plan entitlement + release flag.
 * Returns an error string when blocked; null when allowed.
 */
export async function releasedFeatureDenied(
  shopId: string,
  feature: SubscriptionFeature,
): Promise<string | null> {
  if (!(await canUseFeature(shopId, feature))) {
    return "This feature is not included in your plan.";
  }
  const module = FEATURE_RELEASE_MODULE[feature];
  if (module && !(await isReleased(shopId, module))) {
    return releaseDeniedMessage(module);
  }
  return null;
}

/** Compute monthly recurring revenue stub from active shops (cents). */
export function estimateShopMrrCents(plan: ShopPlan, billingStatus: BillingStatus): number {
  if (billingStatus === "CANCELED" || billingStatus === "TRIAL") return 0;
  return PLANS[plan].monthlyCents;
}

/** Default plan + billing for a new signup (Clerk org creation or platform add-shop). */
export function defaultSignupSubscription(): {
  plan: ShopPlan;
  billingStatus: BillingStatus;
  status: ShopStatus;
  trialEndsAt: Date;
} {
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
  return {
    plan: "STARTER",
    billingStatus: "TRIAL",
    status: "TRIAL",
    trialEndsAt,
  };
}

/** Next upgrade tier, or null if already on highest. */
export function nextPlanTier(current: ShopPlan): ShopPlan | null {
  if (PHASE_ONE_LAUNCH) return null;
  const idx = PLAN_ORDER.indexOf(current);
  if (idx < 0 || idx >= PLAN_ORDER.length - 1) return null;
  return PLAN_ORDER[idx + 1] ?? null;
}

export { PLANS, PLAN_ORDER, billingStatusLabel, resolvePlanFeatures, shopHasFeature };
export type { PlanFeature, PlanFeatureSet };
