import "server-only";

import { prisma } from "@/db/client";
import type { BillingStatus, ShopPlan } from "@/generated/prisma";
import type { BillingOverview as BillingOverviewClient } from "@/lib/billing-shared";
import { PLANS, PLAN_ORDER, resolvePlanFeatures, type PlanDefinition } from "@/lib/plans";
import { getShopSubscription } from "@/lib/subscription";

export type {
  BillingInvoice,
  BillingInvoiceLine,
  BillingInvoiceStatus,
  BillingOverview,
  BillingUsage,
  PaymentMethodOnFile,
} from "@/lib/billing-shared";

export { BILLING_PLAN_FEATURES, comparePlanAction } from "@/lib/billing-shared";

function planListPriceCents(plan: PlanDefinition): number {
  return plan.monthlyCents;
}

function nextMonthlyBillingDate(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  d.setDate(4);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function stubInvoices(
  plan: ShopPlan,
  billingStatus: BillingStatus,
): BillingOverviewClient["invoices"] {
  if (billingStatus === "TRIAL" || billingStatus === "CANCELED") {
    return [];
  }

  const planLabel = PLANS[plan].name;
  const baseCents = planListPriceCents(PLANS[plan]);
  const gatewayFeeCents = 2500;
  const marketingCents = plan !== "STARTER" ? 4900 : 0;

  const invoices: BillingOverviewClient["invoices"] = [];
  const now = new Date();

  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 4);
    const lineItems = [{ description: `ShopRally Shop Management System (${planLabel})` }];
    if (gatewayFeeCents > 0) {
      lineItems.push({ description: "ShopRally Payments Gateway Fee" });
    }
    if (marketingCents > 0 && i < 4) {
      lineItems.push({ description: "ShopRally Marketing Solution" });
    }
    if (i === 2 && plan !== "STARTER") {
      lineItems.push({ description: "Prorated Charges" });
    }
    if (i === 5) {
      lineItems.push({ description: "Data Migration Fee" });
    }

    const amountCents =
      baseCents + gatewayFeeCents + (marketingCents > 0 && i < 4 ? marketingCents : 0);
    const status: BillingOverviewClient["invoices"][number]["status"] =
      i === 0 && billingStatus === "PAST_DUE" ? "PAST_DUE" : "PAID";

    invoices.push({
      id: `inv_stub_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`,
      date: date.toISOString(),
      lineItems,
      amountCents: i === 5 ? 0 : amountCents,
      status,
      pdfUrl: null,
    });
  }

  return invoices;
}

function stubPaymentMethod(
  billingStatus: BillingStatus,
): BillingOverviewClient["paymentMethod"] {
  if (billingStatus === "TRIAL" || billingStatus === "CANCELED") {
    return null;
  }

  return {
    brand: "American Express",
    last4: "1004",
    expMonth: 10,
    expYear: 2030,
    cardholderName: "Tabish David",
    isDefault: true,
  };
}

async function loadUsage(shopId: string, plan: ShopPlan): Promise<BillingOverviewClient["usage"]> {
  const features = resolvePlanFeatures({ plan });
  const start = monthStart(new Date());

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { platformId: true },
  });

  const [usersCount, repairOrdersThisMonth, locationsCount] = await Promise.all([
    prisma.membership.count({ where: { shopId } }),
    prisma.repairOrder.count({
      where: { shopId, createdAt: { gte: start } },
    }),
    shop?.platformId
      ? prisma.shop.count({ where: { platformId: shop.platformId } })
      : Promise.resolve(1),
  ]);

  return {
    usersCount,
    usersLimit: features.maxUsers,
    repairOrdersThisMonth,
    repairOrdersLimit: features.maxRepairOrdersPerMonth,
    smsCreditsUsed: plan === "STARTER" ? 0 : Math.min(250, repairOrdersThisMonth * 3),
    smsCreditsLimit: plan === "STARTER" ? 0 : plan === "PROFESSIONAL" ? 500 : null,
    locationsCount: Math.max(1, locationsCount),
  };
}

/** Shop-facing platform billing overview (RepairPilot subscription — not Stripe Connect). */
export async function getBillingOverview(shopId: string): Promise<BillingOverviewClient> {
  const [shop, subscription] = await Promise.all([
    prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { id: true, name: true, billingStatus: true },
    }),
    getShopSubscription(shopId),
  ]);

  const nextBillingDate =
    subscription.billingStatus === "TRIAL" && subscription.trialEndsAt
      ? subscription.trialEndsAt
      : subscription.billingStatus === "ACTIVE" || subscription.billingStatus === "PAST_DUE"
        ? nextMonthlyBillingDate(new Date())
        : null;

  const usage = await loadUsage(shopId, subscription.plan);

  return {
    shopId: shop.id,
    shopName: shop.name,
    subscription: {
      shopId: subscription.shopId,
      plan: subscription.plan,
      billingStatus: subscription.billingStatus,
      trialEndsAt: subscription.trialEndsAt?.toISOString() ?? null,
      planName: subscription.planName,
      planTagline: subscription.planTagline,
      monthlyCents: subscription.monthlyCents,
      isTrialing: subscription.isTrialing,
      trialDaysRemaining: subscription.trialDaysRemaining,
      features: subscription.features,
      stripeCustomerId: subscription.stripeCustomerId,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
    },
    billingInterval: "monthly",
    nextBillingDate: nextBillingDate?.toISOString() ?? null,
    paymentMethod: stubPaymentMethod(subscription.billingStatus),
    invoices: stubInvoices(subscription.plan, subscription.billingStatus),
    usage,
    stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
  };
}

export { PLANS, PLAN_ORDER };
