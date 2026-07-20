"use server";

import { revalidatePath } from "next/cache";

import type { ShopPlan } from "@/generated/prisma";
import { PHASE_ONE_LAUNCH, PLANS, isCorePlan } from "@/lib/plans";
import { getShopId } from "@/lib/shop";
import { getBillingOverview } from "@/server/billing";
import { gates } from "@/server/permission-gates";
import {
  createAiPlusCheckoutSession,
  createIgnitionCheckoutSession,
} from "@/server/services/plan-stripe-checkout";
import { getStripe, isStripeEnabled } from "@/lib/stripe";
import { getShopSubscription } from "@/lib/subscription";
import { publicUrl } from "@/lib/app-url";

export type BillingActionResult =
  | { ok: true; url?: string; message?: string }
  | { ok: false; error: string };

/** Stripe Checkout for Ignition (Core) — monthly or annual. */
export async function startIgnitionCheckout(
  interval: "monthly" | "annual" = "monthly",
): Promise<BillingActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const result = await createIgnitionCheckoutSession(shopId, interval);
  if (!result.ok) return result;
  return { ok: true, url: result.url };
}

/** Stripe Checkout for AI Plus add-on (Core shops only). */
export async function startAiPlusCheckout(): Promise<BillingActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;

  const sub = await getShopSubscription(shopId);
  if (!isCorePlan(sub.plan)) {
    return { ok: false, error: "AI Plus is available on Ignition (Core) only." };
  }
  if (sub.features.freeformRoIntake) {
    return { ok: false, error: "AI Plus is already enabled for this shop." };
  }

  const result = await createAiPlusCheckoutSession(shopId);
  if (!result.ok) return result;
  return { ok: true, url: result.url };
}

/** Stripe Checkout Session for plan upgrade/change (Ignition in phase one). */
export async function createUpgradeCheckoutSession(
  targetPlan: ShopPlan,
): Promise<BillingActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const overview = await getBillingOverview(shopId);
  const planName = PLANS[targetPlan].name;

  if (overview.subscription.plan === targetPlan && overview.subscription.billingStatus === "ACTIVE") {
    return { ok: false, error: `Already on the ${planName} plan.` };
  }

  if (PHASE_ONE_LAUNCH && targetPlan === "STARTER") {
    return startIgnitionCheckout("monthly");
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      error: `Stripe Billing is not configured. Contact support to upgrade to ${planName}.`,
    };
  }

  revalidatePath("/settings/subscription");
  revalidatePath("/billing");
  return {
    ok: false,
    error: `${planName} self-serve checkout is not available yet. Contact support to change plans.`,
  };
}

/** Stripe Customer Portal for payment method & invoice self-serve. */
export async function createBillingPortalSession(): Promise<BillingActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const overview = await getBillingOverview(shopId);

  if (!overview.subscription.stripeCustomerId) {
    return {
      ok: false,
      error: "No billing account yet. Subscribe to a plan to manage payment methods.",
    };
  }

  if (!isStripeEnabled()) {
    return {
      ok: false,
      error: "Stripe Billing portal is not configured. Contact support to update your card.",
    };
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: overview.subscription.stripeCustomerId,
    return_url: publicUrl("/settings/subscription"),
  });

  if (!session.url) {
    return { ok: false, error: "Could not open billing portal. Try again." };
  }

  revalidatePath("/settings/subscription");
  revalidatePath("/billing");
  return { ok: true, url: session.url };
}

/** Card capture — redirects to Stripe Customer Portal when configured. */
export async function savePaymentMethodStub(): Promise<BillingActionResult> {
  return createBillingPortalSession();
}
