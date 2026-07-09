"use server";

import { revalidatePath } from "next/cache";

import type { ShopPlan } from "@/generated/prisma";
import { getShopId } from "@/lib/shop";
import { PLANS } from "@/lib/plans";
import { getBillingOverview } from "@/server/billing";
import { gates } from "@/server/permission-gates";

export type BillingActionResult =
  | { ok: true; url?: string; message?: string }
  | { ok: false; error: string };

/** Stub — future Stripe Checkout Session for plan upgrade/change. */
export async function createUpgradeCheckoutSession(
  targetPlan: ShopPlan,
): Promise<BillingActionResult> {
  const shopId = await getShopId();
  const denied = await gates.employeesManage(shopId);
  if (denied) return denied;
  const overview = await getBillingOverview(shopId);
  const planName = PLANS[targetPlan].name;

  if (overview.subscription.plan === targetPlan) {
    return { ok: false, error: `Already on the ${planName} plan.` };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      error: `Stripe Billing is not configured. Contact support to upgrade to ${planName}.`,
    };
  }

  // TODO: stripe.checkout.sessions.create with subscription mode + price lookup keys
  revalidatePath("/settings/subscription");
  revalidatePath("/billing");
  return {
    ok: true,
    message: `Checkout for ${planName} will open here once Stripe Billing products are wired.`,
  };
}

/** Stub — future Stripe Customer Portal for payment method & invoice self-serve. */
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

  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      ok: false,
      error: "Stripe Billing portal is not configured. Contact support to update your card.",
    };
  }

  // TODO: stripe.billingPortal.sessions.create
  revalidatePath("/settings/subscription");
  revalidatePath("/billing");
  return {
    ok: true,
    message: "Stripe Customer Portal will open here once billing is live.",
  };
}

/** Stub — card capture will use Stripe Elements or portal redirect. */
export async function savePaymentMethodStub(): Promise<BillingActionResult> {
  return createBillingPortalSession();
}
