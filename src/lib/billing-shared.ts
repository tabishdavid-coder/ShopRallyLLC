import type { BillingStatus, ShopPlan } from "@/generated/prisma";
import { PLAN_ORDER, type PlanFeatureSet } from "@/lib/plans";

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
  /** Shared VIN + plate successful decodes this calendar month. */
  vinPlateDecodesThisMonth: number;
  /** null = unlimited (Pro / Elite). */
  vinPlateDecodesLimit: number | null;
  /** Estimated overage cents for Core ($10 / 100 after included). Not auto-charged yet. */
  vinPlateOverageCentsEstimate: number;
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
      "Digital vehicle inspections",
      "Operations Daily Snapshot",
      "100 VIN & plate decodes / mo · $10 per extra 100",
      "Email estimates & invoices (SMS on Pro+)",
      "Manual payments (cash / check / card) — no Stripe Connect",
    ],
  },
  PROFESSIONAL: {
    intro: "Everything in Core, plus:",
    items: [
      "Licensed MOTOR labor data",
      "Unlimited VIN & plate decoding",
      "OEM service specs",
      "OEM fluid capacities",
      "Parts, inventory & PartsTech",
      "Stripe Connect payments",
      "Two-way SMS",
      "Online booking",
      "Growth Engine — automations & win-back campaigns",
      "Google review management",
    ],
  },
  ENTERPRISE: {
    intro: "Everything in Pro, plus:",
    items: [
      "AI receptionist + review reply drafting",
      "ShopSite & Local SEO included ($228/mo value)",
      "Maintenance subscription programs",
      "AI SEO content & campaign drafting",
      "Dedicated onboarding specialist · migration included",
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
