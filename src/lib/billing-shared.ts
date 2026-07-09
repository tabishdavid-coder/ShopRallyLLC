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
      "Unlimited users & repair orders",
      "Job board, customers, vehicles & VIN decode",
      DASHBOARD_PLAN_COPY.billingItem,
      DVI_PLAN_COPY.billingItem,
      LABOR_PLAN_COPY.billingIgnition,
      "Canned jobs & estimate editing",
      "Email estimates, approvals & invoices",
      "Appointments & one-way customer notifications",
      "In-depth training — 2 live go-live sessions",
    ],
  },
  PROFESSIONAL: {
    intro: "Everything in Core, plus:",
    items: [
      LABOR_PLAN_COPY.billingMomentum,
      "Markup matrices",
      "Parts management, inventory catalog & PartsTech",
      "Two-way SMS, booking & Growth Engine campaigns",
      "Review management — Google sync, requests & inbox",
      "Stripe Connect payments & integrations",
      "Team training program — advisors, techs & marketing",
    ],
  },
  ENTERPRISE: {
    intro: "Everything in Pro, plus:",
    items: [
      "AI Google Review responses — draft & publish from one inbox",
      "AI receptionist, SEO Autopilot & AI campaign drafting",
      "Maintenance subscription programs & member portal",
      "ShopSite & Local SEO included ($138/mo value)",
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
