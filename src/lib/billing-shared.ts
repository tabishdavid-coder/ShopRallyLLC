import type { BillingStatus, ShopPlan } from "@/generated/prisma";
import { DASHBOARD_PLAN_COPY, DVI_PLAN_COPY, LABOR_PLAN_COPY, PLAN_ORDER, type PlanFeatureSet } from "@/lib/plans";

/** Platform subscription invoice line (shop pays RepairPilot — not customer RO invoices). */
export type BillingInvoiceLine = {
  description: string;
};

export type BillingInvoiceStatus = "PAID" | "OPEN" | "PAST_DUE";

export type BillingInvoice = {
  id: string;
  date: string;
  lineItems: BillingInvoiceLine[];
  amountCents: number;
  status: BillingInvoiceStatus;
  pdfUrl: string | null;
};

export type PaymentMethodOnFile = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  cardholderName: string;
  isDefault: boolean;
};

export type BillingUsage = {
  usersCount: number;
  usersLimit: number | null;
  repairOrdersThisMonth: number;
  repairOrdersLimit: number | null;
  smsCreditsUsed: number;
  smsCreditsLimit: number | null;
  locationsCount: number;
};

export type BillingSubscriptionSnapshot = {
  shopId: string;
  plan: ShopPlan;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  planName: string;
  planTagline: string;
  monthlyCents: number;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  features: PlanFeatureSet;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
};

/** Client-safe billing overview (dates as ISO strings). */
export type BillingOverview = {
  shopId: string;
  shopName: string;
  subscription: BillingSubscriptionSnapshot;
  billingInterval: "monthly" | "annual";
  nextBillingDate: string | null;
  paymentMethod: PaymentMethodOnFile | null;
  invoices: BillingInvoice[];
  usage: BillingUsage;
  stripeConfigured: boolean;
};

/** Feature bullets shown on the plan comparison grid. */
export const BILLING_PLAN_FEATURES: Record<
  ShopPlan,
  { intro?: string; items: string[] }
> = {
  STARTER: {
    items: [
      "ShopRally CRM suite",
      "Unlimited users",
      "Unlimited repair orders & estimates",
      "Digital estimates & invoices via email",
      "Job board",
      "Canned jobs",
      DASHBOARD_PLAN_COPY.billingItem,
      DVI_PLAN_COPY.billingItem,
      "Appointments & one-way customer notifications",
      "MOTOR labor data — $50/mo extra",
    ],
  },
  PROFESSIONAL: {
    intro: "Everything in Core, plus:",
    items: [
      "Licensed MOTOR labor data",
      "License plate & VIN decoding",
      "OEM service specs",
      "OEM fluid capacities",
      "Markup matrices",
      "Parts management, inventory catalog & PartsTech",
      "Two-way SMS",
      "Online booking",
      "Growth Engine — automations & win-back campaigns",
      "Google review management",
      "Stripe Connect payments & integrations",
    ],
  },
  ENTERPRISE: {
    intro: "Everything in Pro, plus:",
    items: [
      "AI Google Review responses — draft & publish from one inbox",
      "AI receptionist, SEO Autopilot & AI campaign drafting",
      "Maintenance subscription programs & member portal",
      "ShopSite & Local SEO included ($228/mo value)",
      "Dedicated onboarding specialist & white-glove training",
      "Premium migration, advanced reporting & priority support",
    ],
  },
};

export function comparePlanAction(
  current: ShopPlan,
  target: ShopPlan,
): "current" | "upgrade" | "downgrade" {
  const currentIdx = PLAN_ORDER.indexOf(current);
  const targetIdx = PLAN_ORDER.indexOf(target);
  if (currentIdx === targetIdx) return "current";
  return targetIdx > currentIdx ? "upgrade" : "downgrade";
}
