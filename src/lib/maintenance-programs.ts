import { z } from "zod";

import type {
  EntitlementKind,
  MaintenancePlanArchetype,
  MaintenancePlanScope,
  MaintenanceVehicleClass,
} from "@/generated/prisma";

export const VEHICLE_CLASSES = [
  "CAR",
  "SUV_TRUCK",
  "HEAVY_DUTY",
  "EV",
  "LUXURY",
  "OTHER",
] as const satisfies readonly MaintenanceVehicleClass[];

export const VEHICLE_CLASS_LABELS: Record<MaintenanceVehicleClass, string> = {
  CAR: "Car",
  SUV_TRUCK: "SUV / Truck",
  HEAVY_DUTY: "Heavy duty",
  EV: "Electric vehicle",
  LUXURY: "Luxury / European",
  OTHER: "Other",
};

export const PLAN_SCOPES = [
  "PER_VEHICLE",
  "PER_HOUSEHOLD",
  "PER_CUSTOMER",
] as const satisfies readonly MaintenancePlanScope[];

export const PLAN_SCOPE_LABELS: Record<MaintenancePlanScope, string> = {
  PER_VEHICLE: "Per vehicle",
  PER_HOUSEHOLD: "Household (multiple vehicles)",
  PER_CUSTOMER: "Per customer (any vehicle)",
};

export const PLAN_ARCHETYPES = [
  "BUNDLE",
  "MONTHLY_CLUB",
  "HOUSEHOLD",
  "UNLIMITED_TIER",
] as const satisfies readonly MaintenancePlanArchetype[];

export const PLAN_ARCHETYPE_LABELS: Record<MaintenancePlanArchetype, string> = {
  BUNDLE: "Prepaid bundle",
  MONTHLY_CLUB: "Monthly club",
  HOUSEHOLD: "Household plan",
  UNLIMITED_TIER: "Unlimited tier",
};

export const ENTITLEMENT_KINDS = [
  "COUNTED",
  "UNLIMITED",
  "INTERVAL",
  "EVERY_VISIT",
  "DISCOUNT",
  "CREDIT",
  "COUPON",
  "ACCESS",
] as const satisfies readonly EntitlementKind[];

export const ENTITLEMENT_KIND_LABELS: Record<EntitlementKind, string> = {
  COUNTED: "Counted service",
  UNLIMITED: "Unlimited (fair use)",
  INTERVAL: "On interval",
  EVERY_VISIT: "Every visit",
  DISCOUNT: "Discount perk",
  CREDIT: "Account credit",
  COUPON: "Coupon / voucher",
  ACCESS: "Access perk",
};

export const PlanEntitlementInputSchema = z.object({
  id: z.string().optional(),
  programServiceId: z.string().optional(),
  cannedJobId: z.string().optional(),
  kind: z.enum(ENTITLEMENT_KINDS),
  label: z.string().trim().min(1, "Label is required.").max(120),
  quantity: z.number().int().min(1).nullable().optional(),
  intervalDays: z.number().int().min(1).nullable().optional(),
  discountBps: z.number().int().min(0).max(10000).nullable().optional(),
  discountCapCents: z.number().int().min(0).nullable().optional(),
  creditCents: z.number().int().min(0).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const PlanClassPriceInputSchema = z.object({
  vehicleClass: z.enum(VEHICLE_CLASSES),
  payInFullCents: z.number().int().min(0).nullable().optional(),
  monthlyCents: z.number().int().min(0).nullable().optional(),
  annualCents: z.number().int().min(0).nullable().optional(),
  surchargeCents: z.number().int().min(0).nullable().optional(),
});

export const MaintenancePlanInputSchema = z.object({
  name: z.string().trim().min(1, "Plan name is required.").max(120),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  idealFor: z.string().trim().max(300).optional(),
  archetype: z.enum(PLAN_ARCHETYPES).default("BUNDLE"),
  scope: z.enum(PLAN_SCOPES).default("PER_VEHICLE"),
  maxVehicles: z.number().int().min(1).nullable().optional(),
  termMonths: z.number().int().min(1).max(60).default(12),
  autoRenew: z.boolean().default(true),
  allowRollover: z.boolean().default(false),
  transferable: z.boolean().default(false),
  useClassPricing: z.boolean().default(false),
  retailCents: z.number().int().min(0).nullable().optional(),
  payInFullCents: z.number().int().min(0).nullable().optional(),
  monthlyCents: z.number().int().min(0).nullable().optional(),
  monthlyTermMonths: z.number().int().min(1).max(60).nullable().optional(),
  annualCents: z.number().int().min(0).nullable().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
  terms: z.string().trim().max(20000).optional(),
  entitlements: z.array(PlanEntitlementInputSchema).default([]),
  classPrices: z.array(PlanClassPriceInputSchema).default([]),
});

export type MaintenancePlanInput = z.infer<typeof MaintenancePlanInputSchema>;

export const MaintenancePlanPricingSchema = z.object({
  retailCents: z.number().int().min(0).nullable().optional(),
  payInFullCents: z.number().int().min(0).nullable().optional(),
  monthlyCents: z.number().int().min(0).nullable().optional(),
  monthlyTermMonths: z.number().int().min(1).max(60).nullable().optional(),
  annualCents: z.number().int().min(0).nullable().optional(),
  useClassPricing: z.boolean().default(false),
  classPrices: z.array(PlanClassPriceInputSchema).default([]),
  publish: z.boolean().default(false),
});

export type MaintenancePlanPricingInput = z.infer<typeof MaintenancePlanPricingSchema>;

export const MaintenancePlanDraftSchema = MaintenancePlanInputSchema.extend({
  payInFullCents: z.number().int().min(0).nullable().optional(),
  monthlyCents: z.number().int().min(0).nullable().optional(),
  annualCents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(false),
});

export type MaintenancePlanDraftInput = z.infer<typeof MaintenancePlanDraftSchema>;

export const ProgramSettingsInputSchema = z.object({
  enabled: z.boolean(),
  plansSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only.")
    .min(2)
    .max(60),
  heroTitle: z.string().trim().max(200).optional(),
  heroSubtitle: z.string().trim().max(2000).optional(),
  termsDefault: z.string().trim().max(20000).optional(),
  pageTemplate: z.enum(["CLASSIC", "MODERN", "BOLD", "PREMIUM"]).optional(),
  themeConfig: z
    .object({
      primaryColor: z
        .string()
        .regex(/^[0-9A-Fa-f]{6}$/)
        .optional(),
      accentColor: z
        .string()
        .regex(/^[0-9A-Fa-f]{6}$/)
        .optional(),
      heroStyle: z.enum(["solid", "gradient", "minimal"]).optional(),
      cardStyle: z.enum(["bordered", "shadow", "flat"]).optional(),
      buttonStyle: z.enum(["filled", "outline"]).optional(),
      showPhone: z.boolean().optional(),
      showAddress: z.boolean().optional(),
      showLogo: z.boolean().optional(),
      columnsLayout: z.enum(["3", "2", "1"]).optional(),
      fontScale: z.enum(["sm", "md", "lg"]).optional(),
    })
    .nullable()
    .optional(),
});

export type ProgramSettingsInput = z.infer<typeof ProgramSettingsInputSchema>;

export const PROGRAM_SERVICE_TYPES = [
  "VISITS",
  "UNLIMITED",
  "SCHEDULED",
  "EVERY_VISIT",
  "DISCOUNT",
  "CREDIT",
] as const;

export type ProgramServiceType = (typeof PROGRAM_SERVICE_TYPES)[number];

export const PROGRAM_SERVICE_TYPE_LABELS: Record<ProgramServiceType, string> = {
  VISITS: "Included visits (counted)",
  UNLIMITED: "Unlimited (fair use)",
  SCHEDULED: "On a schedule (every X days)",
  EVERY_VISIT: "Every visit perk",
  DISCOUNT: "Discount perk",
  CREDIT: "Account credit",
};

export const ProgramServiceInputSchema = z.object({
  name: z.string().trim().min(1, "Service name is required.").max(120),
  description: z.string().trim().max(2000).optional(),
  cannedJobId: z.string().optional(),
  serviceType: z.enum(PROGRAM_SERVICE_TYPES).default("VISITS"),
  defaultQuantity: z.number().int().min(1).nullable().optional(),
  defaultIntervalDays: z.number().int().min(1).nullable().optional(),
  defaultDiscountBps: z.number().int().min(0).max(10000).nullable().optional(),
  unitCostCents: z.number().int().min(0).nullable().optional(),
  active: z.boolean().default(true),
});

export type ProgramServiceInput = z.infer<typeof ProgramServiceInputSchema>;

export function serviceTypeToKind(type: ProgramServiceType): EntitlementKind {
  switch (type) {
    case "VISITS":
      return "COUNTED";
    case "UNLIMITED":
      return "UNLIMITED";
    case "SCHEDULED":
      return "INTERVAL";
    case "EVERY_VISIT":
      return "EVERY_VISIT";
    case "DISCOUNT":
      return "DISCOUNT";
    case "CREDIT":
      return "CREDIT";
    default:
      return "COUNTED";
  }
}

export function programServiceToEntitlement(service: {
  id: string;
  name: string;
  cannedJobId?: string | null;
  serviceType: ProgramServiceType;
  defaultQuantity: number | null;
  defaultIntervalDays: number | null;
  defaultDiscountBps: number | null;
}): MaintenancePlanInput["entitlements"][number] {
  const kind = serviceTypeToKind(service.serviceType);
  return {
    programServiceId: service.id,
    cannedJobId: service.cannedJobId ?? undefined,
    kind,
    label: service.name,
    quantity:
      kind === "COUNTED" || kind === "COUPON" || kind === "ACCESS"
        ? (service.defaultQuantity ?? 1)
        : null,
    intervalDays:
      kind === "INTERVAL" || kind === "UNLIMITED" ? (service.defaultIntervalDays ?? 90) : null,
    discountBps: kind === "DISCOUNT" ? (service.defaultDiscountBps ?? 0) : null,
    sortOrder: 0,
  };
}

/** Monthly payment path costs this much more than pay-in-full (1500 bps = 15%). */
export const MONTHLY_PREMIUM_BPS = 1500;

export const PAY_IN_FULL_SAVINGS_LABEL = "Save 15% when you pay in full";

export function computeMonthlyTotalFromPayInFull(payInFullCents: number): number {
  return Math.round(payInFullCents * (1 + MONTHLY_PREMIUM_BPS / 10000));
}

/** Derive per-month price from pay-in-full base (15% premium over the term). */
export function computeMonthlyFromPayInFull(
  payInFullCents: number,
  termMonths: number = 12,
): number {
  const monthlyTotalCents = computeMonthlyTotalFromPayInFull(payInFullCents);
  return Math.round(monthlyTotalCents / termMonths);
}

/** Reverse: implied pay-in-full from a monthly price (for display when only monthly is stored). */
export function computePayInFullFromMonthly(
  monthlyCents: number,
  termMonths: number = 12,
): number {
  const monthlyTotalCents = monthlyCents * termMonths;
  return Math.round(monthlyTotalCents / (1 + MONTHLY_PREMIUM_BPS / 10000));
}

/** Annual prepay is only a distinct option when it differs from pay-in-full. */
export function hasDistinctAnnualPrice(plan: {
  payInFullCents?: number | null;
  annualCents?: number | null;
}): boolean {
  const annual = plan.annualCents ?? null;
  const payInFull = plan.payInFullCents ?? null;
  if (annual == null || annual <= 0) return false;
  if (payInFull != null && payInFull > 0) return annual !== payInFull;
  return false;
}

/** On save: derive monthly from pay-in-full; sync annualCents for backwards compat. */
export function normalizePlanPricingOnSave(input: {
  payInFullCents: number | null | undefined;
  monthlyCents: number | null | undefined;
  monthlyTermMonths: number | null | undefined;
  annualCents?: number | null | undefined;
}): {
  payInFullCents: number | null;
  monthlyCents: number | null;
  monthlyTermMonths: number | null;
  annualCents: number | null;
} {
  const payInFullCents = input.payInFullCents ?? null;
  let monthlyCents = input.monthlyCents ?? null;
  const monthlyTermMonths = input.monthlyTermMonths ?? null;
  const term = monthlyTermMonths ?? 12;

  if (payInFullCents != null && payInFullCents > 0 && (monthlyCents == null || monthlyCents === 0)) {
    monthlyCents = computeMonthlyFromPayInFull(payInFullCents, term);
  }

  let annualCents: number | null = null;
  if (payInFullCents != null && payInFullCents > 0) {
    annualCents = payInFullCents;
  } else if (input.annualCents != null && input.annualCents > 0) {
    annualCents = input.annualCents;
  }

  return { payInFullCents, monthlyCents, monthlyTermMonths, annualCents };
}

export function planHasPricing(plan: {
  payInFullCents?: number | null;
  monthlyCents?: number | null;
  annualCents?: number | null;
}): boolean {
  return (
    (plan.payInFullCents != null && plan.payInFullCents > 0) ||
    (plan.monthlyCents != null && plan.monthlyCents > 0) ||
    (plan.annualCents != null && plan.annualCents > 0)
  );
}

export function planStatusLabel(plan: {
  active: boolean;
  payInFullCents: number | null;
  monthlyCents: number | null;
  annualCents: number | null;
}): "draft" | "ready" | "live" {
  if (!planHasPricing(plan)) return "draft";
  if (!plan.active) return "ready";
  return "live";
}

/** In & Out AutoHaus OilCare Club tiers — sourced from inoutautohaus.com homepage. */
export const OILCARE_TERMS_DEFAULT =
  "Monthly plans require a 90-day initial commitment, then cancel anytime. Annual plans are non-refundable but transferable within the same household. Services do not roll over. Labor discounts exclude parts, fluids, shop supplies, sublet work, and taxes. Oil changes include up to 6 quarts; additional quarts at extra cost. Plans are vehicle-specific. Refer a friend who signs up and receive a $25 service credit.";

/** Plan templates for quick-start in the admin UI. */
export const PLAN_TEMPLATES: {
  id: string;
  label: string;
  description: string;
  plan: MaintenancePlanInput;
}[] = [
  {
    id: "oilcare-essentials",
    label: "OilCare Essentials",
    description: "Semi-synthetic oil changes for casual drivers — $319/yr pay in full or monthly.",
    plan: {
      name: "OilCare Essentials",
      tagline: "Smart coverage for casual drivers",
      idealFor: "Casual drivers with lighter annual mileage",
      archetype: "MONTHLY_CLUB",
      scope: "PER_VEHICLE",
      termMonths: 12,
      autoRenew: true,
      allowRollover: false,
      transferable: false,
      useClassPricing: false,
      retailCents: null,
      payInFullCents: 31900,
      monthlyCents: computeMonthlyFromPayInFull(31900, 12),
      monthlyTermMonths: 12,
      annualCents: null,
      featured: false,
      active: true,
      terms: OILCARE_TERMS_DEFAULT,
      entitlements: [
        { kind: "COUNTED", label: "Semi-synthetic oil changes", quantity: 3, sortOrder: 0 },
        { kind: "COUNTED", label: "Tire rotations", quantity: 3, sortOrder: 1 },
        { kind: "COUNTED", label: "Free seasonal inspections", quantity: 1, sortOrder: 2 },
        { kind: "UNLIMITED", label: "Free fluid top-offs anytime", sortOrder: 3 },
        { kind: "DISCOUNT", label: "5% off labor", discountBps: 500, sortOrder: 4 },
        { kind: "CREDIT", label: "$50 off any diagnostic fee", creditCents: 5000, sortOrder: 5 },
      ],
      classPrices: [],
    },
  },
  {
    id: "oilcare-premium",
    label: "OilCare Premium",
    description: "Full synthetic + priority scheduling — $427/yr pay in full or monthly.",
    plan: {
      name: "OilCare Premium",
      tagline: "The right answer for most drivers",
      idealFor: "Most Capital Region drivers who want full synthetic and priority service",
      archetype: "MONTHLY_CLUB",
      scope: "PER_VEHICLE",
      termMonths: 12,
      autoRenew: true,
      allowRollover: false,
      transferable: false,
      useClassPricing: false,
      retailCents: null,
      payInFullCents: 42700,
      monthlyCents: computeMonthlyFromPayInFull(42700, 12),
      monthlyTermMonths: 12,
      annualCents: null,
      featured: true,
      active: true,
      terms: OILCARE_TERMS_DEFAULT,
      entitlements: [
        { kind: "COUNTED", label: "Full synthetic oil changes", quantity: 4, sortOrder: 0 },
        { kind: "COUNTED", label: "Tire rotations", quantity: 4, sortOrder: 1 },
        { kind: "COUNTED", label: "Free seasonal inspections", quantity: 2, sortOrder: 2 },
        { kind: "UNLIMITED", label: "Free fluid top-offs anytime", sortOrder: 3 },
        { kind: "ACCESS", label: "Priority same-day scheduling", sortOrder: 4 },
        { kind: "DISCOUNT", label: "10% off labor", discountBps: 1000, sortOrder: 5 },
        { kind: "EVERY_VISIT", label: "FREE diagnostic ($99 value/visit)", sortOrder: 6 },
      ],
      classPrices: [],
    },
  },
  {
    id: "oilcare-elite",
    label: "OilCare Elite",
    description: "VIP treatment with OEM service — $749/yr pay in full or monthly.",
    plan: {
      name: "OilCare Elite",
      tagline: "VIP treatment. Maximum perks.",
      idealFor: "Drivers who want front-of-line priority, concierge scheduling, and OEM care",
      archetype: "UNLIMITED_TIER",
      scope: "PER_VEHICLE",
      termMonths: 12,
      autoRenew: true,
      allowRollover: false,
      transferable: false,
      useClassPricing: false,
      retailCents: null,
      payInFullCents: 74900,
      monthlyCents: computeMonthlyFromPayInFull(74900, 12),
      monthlyTermMonths: 12,
      annualCents: null,
      featured: false,
      active: true,
      terms: OILCARE_TERMS_DEFAULT,
      entitlements: [
        {
          kind: "COUNTED",
          label: "Full synthetic or OEM long-life oil changes",
          quantity: 6,
          sortOrder: 0,
        },
        { kind: "EVERY_VISIT", label: "OEM filter + service indicator reset", sortOrder: 1 },
        { kind: "COUNTED", label: "Tire rotations", quantity: 4, sortOrder: 2 },
        { kind: "COUNTED", label: "Free seasonal inspections", quantity: 2, sortOrder: 3 },
        { kind: "UNLIMITED", label: "Free top-offs anytime", sortOrder: 4 },
        { kind: "ACCESS", label: "Premium priority (front-of-line)", sortOrder: 5 },
        { kind: "DISCOUNT", label: "15% off labor", discountBps: 1500, sortOrder: 6 },
        { kind: "EVERY_VISIT", label: "FREE diagnostic + scan tool service", sortOrder: 7 },
        { kind: "ACCESS", label: "Concierge scheduling — text us", sortOrder: 8 },
        { kind: "INTERVAL", label: "Annual VIP vehicle review", intervalDays: 365, sortOrder: 9 },
      ],
      classPrices: [],
    },
  },
];

export type PlanRetailDiscount = {
  retailCents: number;
  payInFullCents: number;
  savingsCents: number;
  /** Whole-number percent off regular price. */
  savingsPercent: number;
};

/** Compare-at discount: regular price minus customer pay-in-full price. */
export function computeRetailDiscount(
  retailCents: number | null | undefined,
  payInFullCents: number | null | undefined,
): PlanRetailDiscount | null {
  if (retailCents == null || payInFullCents == null) return null;
  if (retailCents <= 0 || payInFullCents <= 0) return null;
  if (retailCents <= payInFullCents) return null;
  const savingsCents = retailCents - payInFullCents;
  const savingsPercent = Math.round((savingsCents / retailCents) * 100);
  return { retailCents, payInFullCents, savingsCents, savingsPercent };
}

/** Apply a dollar or percent discount to regular price → pay-in-full cents. */
export function applyRetailDiscount(
  retailCents: number,
  mode: "amount" | "percent",
  value: number,
): number {
  if (!Number.isFinite(value) || value < 0) return retailCents;
  if (mode === "amount") {
    return Math.max(0, retailCents - Math.round(value * 100));
  }
  const pct = Math.min(100, value);
  return Math.round((retailCents * (100 - pct)) / 100);
}

export function formatRetailDiscountBadge(discount: PlanRetailDiscount): string {
  return `Save ${formatDollars(discount.savingsCents)} (${discount.savingsPercent}% off)`;
}

export function formatRetailDiscountSummary(discount: PlanRetailDiscount): {
  was: string;
  now: string;
  badge: string;
} {
  return {
    was: formatDollars(discount.retailCents),
    now: formatDollars(discount.payInFullCents),
    badge: formatRetailDiscountBadge(discount),
  };
}

export type PlanPriceDisplay = {
  /** Main price shown large (pay-in-full, monthly, or annual). */
  primary: string;
  /** Strikethrough compare-at — retail and/or implied monthly-path total. */
  compareAt?: string;
  /** Alternate payment option, e.g. monthly when primary is pay-in-full. */
  altOption?: string;
  /** Marketing badge for pay-in-full savings. */
  savingsBadge?: string;
  /** Structured retail discount when compare-at exceeds pay-in-full. */
  retailDiscount?: PlanRetailDiscount;
};

export function formatPlanPriceOptions(plan: {
  retailCents: number | null;
  payInFullCents: number | null;
  monthlyCents: number | null;
  monthlyTermMonths: number | null;
  annualCents: number | null;
}): PlanPriceDisplay {
  const term = plan.monthlyTermMonths ?? 12;
  const effectivePayInFull =
    plan.payInFullCents != null && plan.payInFullCents > 0
      ? plan.payInFullCents
      : plan.annualCents != null && plan.annualCents > 0
        ? plan.annualCents
        : null;
  const effectiveMonthly =
    effectivePayInFull != null
      ? computeMonthlyFromPayInFull(effectivePayInFull, term)
      : plan.monthlyCents != null && plan.monthlyCents > 0
        ? plan.monthlyCents
        : null;

  const hasPayInFull = effectivePayInFull != null;
  const hasMonthly = effectiveMonthly != null;
  const hasAnnual = hasDistinctAnnualPrice(plan);

  const payInFullCents = effectivePayInFull;
  const monthlyCents = effectiveMonthly;
  const impliedMonthlyTotal =
    payInFullCents != null
      ? computeMonthlyTotalFromPayInFull(payInFullCents)
      : monthlyCents != null
        ? monthlyCents * term
        : null;
  const derivedPayInFull =
    payInFullCents ??
    (monthlyCents != null ? computePayInFullFromMonthly(monthlyCents, term) : null);

  let primaryCents: number | null = null;
  let primaryLabel: string | null = null;
  let altOption: string | undefined;
  let savingsBadge: string | undefined;
  let compareAtCents: number | null = null;

  const retailDiscount = computeRetailDiscount(plan.retailCents, payInFullCents);

  if (hasPayInFull) {
    primaryCents = payInFullCents;
    primaryLabel = `${formatDollars(payInFullCents!)} pay in full`;
    if (retailDiscount) {
      compareAtCents = retailDiscount.retailCents;
      savingsBadge = formatRetailDiscountBadge(retailDiscount);
    } else {
      savingsBadge = PAY_IN_FULL_SAVINGS_LABEL;
      if (impliedMonthlyTotal != null && impliedMonthlyTotal > payInFullCents!) {
        compareAtCents = impliedMonthlyTotal;
      }
    }
    if (hasMonthly) {
      altOption = `or ${formatDollars(monthlyCents!)}/mo for ${term} mo`;
    }
  } else if (hasMonthly) {
    primaryCents = monthlyCents;
    primaryLabel = `${formatDollars(monthlyCents!)}/mo for ${term} mo`;
    if (derivedPayInFull != null) {
      altOption = `or pay in full and save 15% — ${formatDollars(derivedPayInFull)}`;
      savingsBadge = PAY_IN_FULL_SAVINGS_LABEL;
    }
    if (hasAnnual) {
      altOption = altOption
        ? `${altOption}; or ${formatDollars(plan.annualCents!)}/year prepay`
        : `or ${formatDollars(plan.annualCents!)}/year prepay`;
    }
  } else if (hasAnnual) {
    primaryCents = plan.annualCents;
    primaryLabel = `${formatDollars(plan.annualCents!)}/year`;
  }

  if (
    !retailDiscount &&
    plan.retailCents != null &&
    primaryCents != null &&
    plan.retailCents > primaryCents &&
    (compareAtCents == null || plan.retailCents > compareAtCents)
  ) {
    compareAtCents = plan.retailCents;
  }

  const compareAt = compareAtCents != null ? formatDollars(compareAtCents) : undefined;
  const resolvedRetailDiscount =
    retailDiscount ??
    (primaryCents != null ? computeRetailDiscount(plan.retailCents, primaryCents) : null);

  return {
    primary: primaryLabel ?? "Contact shop",
    compareAt,
    altOption,
    savingsBadge,
    retailDiscount: resolvedRetailDiscount ?? undefined,
  };
}

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export function resolvePlanPricing(
  plan: {
    payInFullCents: number | null;
    monthlyCents: number | null;
    monthlyTermMonths?: number | null;
    annualCents: number | null;
    classPrices: {
      vehicleClass: MaintenanceVehicleClass;
      payInFullCents: number | null;
      monthlyCents: number | null;
      annualCents: number | null;
      surchargeCents: number | null;
    }[];
    useClassPricing: boolean;
  },
  vehicleClass?: MaintenanceVehicleClass | null,
): {
  payInFullCents: number | null;
  monthlyCents: number | null;
  annualCents: number | null;
} {
  let base: {
    payInFullCents: number | null;
    monthlyCents: number | null;
    annualCents: number | null;
  };

  if (!plan.useClassPricing || !vehicleClass) {
    base = {
      payInFullCents: plan.payInFullCents,
      monthlyCents: plan.monthlyCents,
      annualCents: plan.annualCents,
    };
  } else {
    const row = (plan.classPrices ?? []).find((c) => c.vehicleClass === vehicleClass);
    const surcharge = row?.surchargeCents ?? 0;
    base = {
      payInFullCents:
        row?.payInFullCents ??
        (plan.payInFullCents != null ? plan.payInFullCents + surcharge : null),
      monthlyCents:
        row?.monthlyCents ?? (plan.monthlyCents != null ? plan.monthlyCents + surcharge : null),
      annualCents:
        row?.annualCents ?? (plan.annualCents != null ? plan.annualCents + surcharge : null),
    };
  }

  const term = plan.monthlyTermMonths ?? 12;
  const effectivePayInFull =
    base.payInFullCents != null && base.payInFullCents > 0
      ? base.payInFullCents
      : base.annualCents != null && base.annualCents > 0
        ? base.annualCents
        : null;
  const effectiveMonthly =
    effectivePayInFull != null
      ? computeMonthlyFromPayInFull(effectivePayInFull, term)
      : base.monthlyCents;

  return {
    payInFullCents: effectivePayInFull,
    monthlyCents: effectiveMonthly,
    annualCents: hasDistinctAnnualPrice(base) ? base.annualCents : null,
  };
}
