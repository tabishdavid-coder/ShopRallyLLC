import type { ShopPlan } from "@/generated/prisma";
import { stripReleaseFromPlanFeatures } from "@/lib/release-flags";

/**
 * Public pricing strategy (2026 Q3): phase-one launch sells a single plan (**Ignition**).
 * Pro & Elite stay in the catalog for platform ops — hidden from public marketing until phase two.
 * Internal enums: STARTER / PROFESSIONAL / ENTERPRISE (STARTER displays as **Core** in CRM;
 * public marketing may use `marketingName` e.g. Ignition).
 */
export type PlanFeature =
  | "cannedJobs"
  | "partsTech"
  | "laborGuide"
  | "motorLabor"
  | "customerEmail"
  | "customerSms"
  /** Carfax service history on vehicles / ROs — Ignition and above. */
  | "carfax"
  | "digitalInspections"
  | "appointments"
  | "reports"
  | "integrations"
  | "multiLocation"
  | "approvalLinks"
  | "invoiceSharing"
  | "advancedReports"
  | "markupMatrices"
  | "shopSite"
  | "websiteSeo"
  | "marketingCampaigns"
  /** Google Business Profile reviews inbox + sync — Core and above. */
  | "googleReviews"
  | "maintenancePrograms"
  | "aiReviewReplies"
  | "aiCampaignDrafting"
  | "aiSeoContent"
  | "aiCustomerInsights"
  | "aiReceptionist"
  /** Auto.dev plate→VIN + rich VIN decode — Pro+ only. Core uses NHTSA VIN + manual entry. */
  | "autodevDecoding"
  /** Smart / freeform AI repair-order intake — Core-only AI Plus add-on (not Pro/Elite). */
  | "freeformRoIntake";

export type PlanLimits = {
  /** null = unlimited */
  maxUsers: number | null;
  /** null = unlimited */
  maxRepairOrdersPerMonth: number | null;
  /**
   * Shared calendar-month meter for successful paid VIN/plate lookups (Auto.dev).
   * null = unlimited / not metered. Ignition uses free NHTSA VIN only — null.
   * Pro/Elite: null (unlimited Auto.dev VIN + plate). Legacy Core 100-pack overage retired.
   */
  maxVinPlateDecodesPerMonth: number | null;
};

/** @deprecated Ignition no longer meters NHTSA VIN; kept for billing helpers on old meters. */
export const VIN_PLATE_DECODE_OVERAGE = {
  packSize: 100,
  packCents: 1000,
} as const;

/** Estimate overage cents for a Core shop given usage this calendar month. */
export function vinPlateDecodeOverageCents(
  usedThisMonth: number,
  limit: number | null,
): number {
  if (limit === null || usedThisMonth <= limit) return 0;
  const over = usedThisMonth - limit;
  return Math.ceil(over / VIN_PLATE_DECODE_OVERAGE.packSize) * VIN_PLATE_DECODE_OVERAGE.packCents;
}

/** Human-readable overage note for Settings → Subscription. */
export function vinPlateDecodeOverageLabel(
  usedThisMonth: number,
  limit: number | null,
): string | null {
  const cents = vinPlateDecodeOverageCents(usedThisMonth, limit);
  if (cents <= 0) return null;
  const packs = cents / VIN_PLATE_DECODE_OVERAGE.packCents;
  return `$${cents / 100} estimated overage (${packs} × $10 / 100) — billed manually until Stripe Billing`;
}

export type PlanFeatureSet = PlanLimits & Record<PlanFeature, boolean>;

/** Scannable pricing-card content (AutoLeap / Shopmonkey style). */
export type PlanPricingCard = {
  /** One-line audience fit under the plan name. */
  bestFor: string;
  /** 5–6 outcome bullets — no long feature dumps. */
  bullets: string[];
  /** Renders "Everything in {prior plan}, plus:" above bullets. */
  includesPrevious?: ShopPlan;
};

export type PlanDefinition = {
  id: ShopPlan;
  name: string;
  /** Public GTM label when different from in-app plan name (e.g. Ignition on /pricing). */
  marketingName?: string;
  /** Short label on pricing cards (e.g. "Core shop"). */
  subtitle: string;
  /** One sentence under bestFor — kept short for card layout. */
  tagline: string;
  monthlyCents: number;
  annualMonthlyCents: number;
  /** Marketing callout — used in hero / positioning, not on plan cards. */
  valueNote?: string;
  /** @deprecated Use valueNote — kept for components still reading savingsNote */
  savingsNote?: string;
  popular?: boolean;
  pricingCard: PlanPricingCard;
  features: PlanFeatureSet;
};

/** Labor tiers — Core = shop library; Pro+ includes licensed MOTOR. */
export const LABOR_PLAN_COPY = {
  ignitionHighlight: "Shop library & estimate tooling",
  momentumHighlight: "Licensed MOTOR labor data",
  comparisonByPlan: {
    STARTER: "Shop library",
    PROFESSIONAL: "Licensed MOTOR",
    ENTERPRISE: "Licensed MOTOR",
  } satisfies Record<ShopPlan, string>,
  billingIgnition: "Shop library & estimate tooling",
  billingMomentum: "Licensed MOTOR labor data",
  featuresIgnition: "Licensed MOTOR on Pro+",
  faqAnswer:
    "Licensed MOTOR labor data is included on Pro and Elite — flat-rate guides and procedures in the estimate. Ignition uses the shop labor library. OEM specs and fluid capacities are on Pro+.",
} as const;

/** VIN / plate decode packaging — Ignition = unlimited free NHTSA VIN; plate→VIN is Pro+. */
export const VIN_PLATE_DECODE_PLAN_COPY = {
  /** @deprecated Ignition is unlimited NHTSA VIN (null meter). Kept for any legacy references. */
  coreIncluded: null as number | null,
  overagePackLabel: "N/A on Ignition",
  comparisonByPlan: {
    STARTER: "Unlimited NHTSA VIN",
    PROFESSIONAL: "Unlimited VIN + plate",
    ENTERPRISE: "Unlimited VIN + plate",
  } satisfies Record<ShopPlan, string>,
  billingCore: "Unlimited NHTSA VIN decode",
  billingProPlus: "Unlimited VIN & plate decoding (Auto.dev)",
  faqAnswer:
    "Ignition includes unlimited VIN decoding via free NHTSA vPIC — no monthly cap. Paid plate→VIN lookup is on Pro and Elite.",
} as const;

/** Operations Daily Snapshot — included on every plan tier. */
export const DASHBOARD_PLAN_COPY = {
  planHighlight: "Live Operations Daily Snapshot — today's & upcoming activity",
  billingItem: "Live Operations Daily Snapshot — today's & upcoming activity",
  dailyOutlineLabel: "Live Operations Daily Snapshot",
  dailyOutlineDescription:
    "Your shop-day snapshot — today's and upcoming ROs, appointments, and activity.",
  dailyProfitableReports: "Daily profitable reports",
  featuresAllTiers: "Live Operations Daily Snapshot on every plan",
  comparisonAllTiers: {
    STARTER: true,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  } satisfies Record<ShopPlan, boolean>,
  faqAnswer:
    "Every plan includes Live Operations Daily Snapshot — a clear view of today's and upcoming shop activity so owners and advisors stay ahead of the day without digging through reports.",
} as const;

/** Digital vehicle inspections — included on every plan tier. */
export const DVI_PLAN_COPY = {
  planHighlight:
    "Digital vehicle inspections — multi-point templates, photo markup & R/Y/G ratings",
  billingItem:
    "Digital vehicle inspections — templates, photo markup & customer share links",
  featuresAllTiers:
    "Digital vehicle inspections with photo markup & multi-point templates on every plan",
  comparisonAllTiers: {
    STARTER: true,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  } satisfies Record<ShopPlan, boolean>,
  faqAnswer:
    "Every plan includes full digital vehicle inspections — multi-point inspection templates, red/yellow/green item ratings, photo markup on findings, and share links so customers see inspection results on their phone before they approve work.",
} as const;

/** Onboarding / training copy — Elite is white-glove; Core/Pro are self-serve with demo support. */
export const PLAN_TRAINING: Record<
  ShopPlan,
  { headline: string; sessions: string; description: string }
> = {
  STARTER: {
    headline: "Self-serve with demo support",
    sessions: "Product guides & early demo",
    description:
      "Get started on the job board, repair orders, digital vehicle inspections, Google Reviews inbox, and Operations Daily Snapshot — book a demo if you want a guided walkthrough.",
  },
  PROFESSIONAL: {
    headline: "Self-serve with product resources",
    sessions: "Demo & onboarding resources",
    description:
      "Launch licensed MOTOR, PartsTech, and Growth Engine campaigns with in-product guidance and early demo support.",
  },
  ENTERPRISE: {
    headline: "White-glove onboarding included",
    sessions: "Dedicated onboarding specialist",
    description:
      "Dedicated specialist for AI tools, Care Plans, ShopSite, Local SEO, and migration — go-live support included.",
  },
};

/** One-stop-shop modules — used on pricing & homepage. */
export const PLATFORM_MODULES = [
  {
    id: "crm",
    name: "Shop CRM",
    description: "Repair orders, job board, customers, vehicles, estimates, tech board, inventory.",
    icon: "wrench" as const,
    pricingNote: "All monthly tiers",
  },
  {
    id: "dvi",
    name: "Digital vehicle inspections",
    description:
      "Photo checklists customers can see — multi-point templates, photo markup, red/yellow/green ratings, and share links.",
    icon: "clipboard" as const,
    pricingNote: "All monthly tiers",
  },
  {
    id: "payments",
    name: "Payments & POS",
    description: "Stripe Connect, text-to-pay, approval links, invoicing, markup matrices.",
    icon: "zap" as const,
    pricingNote: "Pro & Elite",
  },
  {
    id: "labor",
    name: "Labor Book",
    description:
      "Licensed MOTOR labor data is included on Pro and Elite. Ignition uses the shop labor library. Ignition includes unlimited NHTSA VIN decode. Pro and Elite add plate lookup plus OEM specs and fluid capacities.",
    icon: "wrench" as const,
    pricingNote: "Licensed MOTOR on Pro+",
  },
  {
    id: "insights",
    name: "Operations Daily Snapshot",
    description:
      "Operations Daily Snapshot of today’s and upcoming shop activity — included on every plan.",
    icon: "chart" as const,
    pricingNote: "All monthly tiers",
  },
  {
    id: "shopsite",
    name: "ShopSite",
    description: "Branded shop website with services, contact, and online booking — hosted and updated for you.",
    icon: "globe" as const,
    pricingNote: "$99/mo + launch setup · Elite included",
  },
  {
    id: "seo",
    name: "Local SEO",
    description: "On-page SEO, JSON-LD, Search Console, local search, and Growth Engine SEO runs every month.",
    icon: "search" as const,
    pricingNote: "$129/mo + launch setup · Elite included",
  },
  {
    id: "subscriptions",
    name: "Care Plans",
    description:
      "Shop-level Care Plans (maintenance subscriptions), member portal, Stripe billing, and counter enrollment — Elite premium.",
    icon: "repeat" as const,
    pricingNote: "Elite only · not on Core",
  },
  {
    id: "reviews",
    name: "Google Reviews inbox",
    description:
      "Connect Google Business Profile, sync reviews, and reply from the CRM — included on Ignition. Review-request campaigns stay Pro+.",
    icon: "sparkles" as const,
    pricingNote: "All monthly tiers",
  },
  {
    id: "growth",
    name: "Growth Engine",
    description: "Online booking, SMS/email campaigns, automations, and review-request workflows.",
    icon: "sparkles" as const,
    pricingNote: "Pro & Elite",
  },
] as const;

/** Monthly web presence services — separate ShopSite and Local SEO subscriptions. */
export type WebPresenceService = {
  id: string;
  name: string;
  monthlyCents: number;
  priceLabel: string;
  /** One-time launch & configuration — charged once when service starts. */
  setupCents: number;
  /** Short one-capability lines for pricing cards (Ignition-style bullets). */
  bullets: string[];
  /** Compact summary — keep for non-card surfaces; cards prefer `bullets`. */
  description: string;
  savingsNote?: string;
};

/** What the one-time launch setup covers — shown in collapsed disclosure, not hero pricing. */
export const WEB_PRESENCE_LAUNCH_SETUP = {
  shopsite: {
    setupCents: 34900,
    includes: [
      "Custom ShopSite build from your shop profile",
      "Domain, SSL & booking widget wired to CRM",
      "Services pages, contact info & go-live review",
    ],
  },
  seo: {
    setupCents: 29900,
    includes: [
      "On-page SEO, meta tags & JSON-LD structured data",
      "Google Search Console & sitemap setup",
      "Google Business Profile optimization & organic local search presence",
      "Local Google Ads review & optimization when campaigns already exist",
      "Growth Engine SEO baseline",
    ],
  },
  bundle: {
    setupCents: 54900,
    includes: [
      "Coordinated ShopSite build + Local SEO launch",
      "Google Business Profile & local Google Ads optimization when applicable",
      "Single go-live with domain, GSC & booking connected",
    ],
    savingsNote: "Save $99 vs separate ShopSite and SEO launch setup.",
  },
} as const;

export function formatWebPresenceSetupCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/** Muted footnote for cards — monthly first, setup de-emphasized. */
export function webPresenceSetupFootnote(setupCents: number): string {
  return `+ ${formatWebPresenceSetupCents(setupCents)} launch setup (once)`;
}

export const WEB_PRESENCE_SERVICES: WebPresenceService[] = [
  {
    id: "shopsite-monthly",
    name: "ShopSite",
    monthlyCents: 9900,
    priceLabel: "$99/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.shopsite.setupCents,
    bullets: [
      "Branded shop website",
      "Hosting & SSL",
      "Custom domain setup",
      "Booking widget",
      "Ongoing content updates",
    ],
    description:
      "Branded shop website, hosting, SSL, custom domain setup, booking widget, and ongoing content updates.",
    savingsNote: "Agency site retainers often run $150–300/mo.",
  },
  {
    id: "seo-monthly",
    name: "Local SEO",
    monthlyCents: 12900,
    priceLabel: "$129/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.seo.setupCents,
    bullets: [
      "On-page SEO",
      "Structured data (JSON-LD)",
      "Search Console monitoring",
      "Google Business Profile & organic local",
      "Local Google Ads optimization when advertising",
      "Growth Engine SEO runs",
    ],
    description:
      "On-page SEO, structured data, Search Console, Google Business Profile & organic local, local Google Ads optimization when advertising, and Growth Engine SEO runs.",
    savingsNote: "SEO agency retainers often start at $500+/mo.",
  },
  {
    id: "web-seo-bundle-monthly",
    name: "Website + SEO bundle",
    monthlyCents: 19900,
    priceLabel: "$199/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.bundle.setupCents,
    bullets: [
      "Everything in ShopSite",
      "Everything in Local SEO",
      "Google Business Profile + local Ads help",
      "One bill for full web presence",
      "Save $29/mo vs buying separately",
    ],
    description:
      "ShopSite and Local SEO together — full web presence on two subscriptions billed as one.",
    savingsNote: "Save $29/mo vs subscribing to ShopSite and Local SEO separately ($228/mo).",
  },
];

/** À la carte ShopSite + Local SEO monthly dollars — used in Elite “included value” copy. */
export function webPresenceAlaCarteMonthlyDollars(): number {
  return webPresenceAlaCarteMonthlyCents() / 100;
}

/** @deprecated Use WEB_PRESENCE_SERVICES */
export type StartupService = WebPresenceService;
/** @deprecated Use WEB_PRESENCE_SERVICES */
export const STARTUP_SERVICES = WEB_PRESENCE_SERVICES;

export function webPresenceAlaCarteMonthlyCents(): number {
  const site = WEB_PRESENCE_SERVICES.find((s) => s.id === "shopsite-monthly");
  const seo = WEB_PRESENCE_SERVICES.find((s) => s.id === "seo-monthly");
  return (site?.monthlyCents ?? 0) + (seo?.monthlyCents ?? 0);
}

export function webPresenceBundleSavingsMonthlyCents(): number {
  const bundle = WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly");
  if (!bundle) return 0;
  return webPresenceAlaCarteMonthlyCents() - bundle.monthlyCents;
}

/** Top-tier AI capabilities — marketing copy for pricing & product pages. */
export const OVERDRIVE_AI_FEATURES = [
  {
    title: "AI receptionist",
    description:
      "After-hours SMS and voice — appointment capture, recording consent, and lead routing into your CRM.",
  },
  {
    title: "AI Google Review responses",
    description: "Draft on-brand replies, edit in one inbox, and publish to Google faster.",
  },
  {
    title: "Growth Engine SEO",
    description: "Automated audits, AI content suggestions, Search Console, and monthly reports.",
  },
  {
    title: "AI campaign drafting",
    description: "SMS and email copy tuned to your shop — reminders, win-back, and promos.",
  },
  {
    title: "AI customer insights",
    description: "Smarter follow-ups from repair history, visit patterns, and campaign performance.",
  },
  {
    title: "AI estimate assist",
    description:
      "Draft jobs from customer concerns and inspection findings — licensed labor hours, parts placeholders, and advisor-ready notes in one pass.",
  },
] as const;

/** Competitor benchmark (public list prices). Marketing only. */
export const COMPETITOR_BENCHMARK = {
  label: "Typical monthly stack (CRM + marketing)",
  legacy: {
    label: "Legacy desktop + agencies",
    typicalMonthly: 650,
    examples: "Mitchell / Protractor class · marketing & website retainers separate",
  },
  incumbents: [
    { name: "Garage360 Basic", crm: 79, marketing: 0, note: "Quotes & invoices · no digital vehicle inspections, inventory, or labor guides" },
    { name: "Garage360 Clever", crm: 119, marketing: 0, note: "Digital vehicle inspections, inventory & QB · no SMS, booking, or campaigns" },
    { name: "Torque360 Starter", crm: 90, marketing: 0, note: "Digital vehicle inspections & PartsTech · 5 co-users · one-way SMS only" },
    { name: "Garage360 Genius", crm: 199, marketing: 0, note: "Labor guides & diagrams · bolt-on marketing ~+$80/mo typical" },
    { name: "Torque360 Turbo", crm: 180, marketing: 0, note: "Two-way SMS & review mgmt · no AI, SEO, or maintenance programs" },
    { name: "Tekmetric", crm: 199, marketing: 345, note: "Start $199/mo list ($179 annual) · Marketing add-on · Scale ~$439/$409" },
    { name: "Shopmonkey", crm: 239, marketing: 349, note: "Basic $239/mo list ($215 annual) · CRM Essentials ~$349/$314 · Clever ~$399" },
    { name: "AutoLeap", crm: 199, marketing: 130, note: "Essentials ~$199/mo list ($179 annual) · Pro ($309) adds marketing · AIR +$99/mo" },
  ],
  /** Garage360 Genius + typical SMS/booking/review bolt-ons. */
  budgetGrowthStackMonthly: 279,
  typicalStackMonthly: 524,
  /** Garage360 Basic — entry sticker price. */
  basicCrmMonthly: 79,
  /** Ops-comparable tier (Garage360 Clever class — digital inspections + reports). */
  entryCrmMonthly: 119,
  typicalTopCrmTier: 409,
  typicalWebsiteSetup: 2000,
} as const;

export type PlanAddOn = {
  id: string;
  name: string;
  priceLabel: string;
  description: string;
  vsIndustry?: string;
  tiers: "all" | "starter+" | "professional+" | "premier" | "core-only";
  /** Featured on public pricing during phase-one launch. */
  phaseOne?: boolean;
};

/** Phase 1 GTM: one public plan; higher tiers ship behind the scenes for platform ops. */
export const PHASE_ONE_LAUNCH = true;

/** Plans on /pricing, signup, and shop subscription compare UI. */
export const PUBLIC_PLAN_ORDER: ShopPlan[] = PHASE_ONE_LAUNCH
  ? ["STARTER"]
  : ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

/** Full tier catalog — platform admin & future multi-tier launch. */
export const PLATFORM_PLAN_ORDER: ShopPlan[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

/** AI Plus monthly list price (cents) — Core-only add-on. */
export const AI_PLUS_MONTHLY_CENTS = 4999;

/** AI Plus monthly dollars for marketing math / totals. */
export function aiPlusMonthlyDollars(): number {
  return AI_PLUS_MONTHLY_CENTS / 100;
}

export function aiPlusPriceLabel(): string {
  return `$${aiPlusMonthlyDollars().toFixed(2)}/mo`;
}

export const PHASE_ONE_COPY = {
  headline: "Shop management software pricing — one Ignition plan",
  subhead:
    "ShopRally Ignition is all-in-one auto repair shop management software — unlimited users & ROs, job board, PartsTech catalog & punchout, Carfax service history, two-way SMS, Google Reviews inbox (sync & reply), digital estimates & approvals, digital vehicle inspections, appointments, payment tracking, and Live Operations Daily Snapshot. No tier maze.",
  addonHeadline: "Recommended — AI Plus",
  addonSubhead:
    "Most founding shops reserve Ignition + AI Plus for Q4 2026: freeform RO intake, labor-hour assist, and the advisor app — so the counter moves as fast as the conversation at launch.",
} as const;

/** Optional monthly add-ons — stack on eligible tiers only. */
export const PLAN_ADDONS: PlanAddOn[] = [
  {
    id: "ai-plus",
    name: "AI Plus",
    priceLabel: aiPlusPriceLabel(),
    description:
      "Paste a note → AI drafts the RO (vehicle, concerns, labor hours). Plus labor assist and the ShopRally advisor mobile app. Ignition add-on only.",
    vsIndustry: "Competitor AI add-ons often list at $59–99/mo — and still don't draft the RO.",
    tiers: "core-only",
    phaseOne: true,
  },
  {
    id: "ai-receptionist",
    name: "AI receptionist",
    priceLabel: "$59/mo",
    description: "After-hours call handling, appointment capture, and lead routing into your CRM.",
    vsIndustry: "AutoLeap AIR lists at $99/mo. Included on Elite.",
    tiers: "professional+",
  },
  {
    id: "sms-pack",
    name: "SMS volume pack (5,000)",
    priceLabel: "$69/mo",
    description: "High-volume SMS for campaigns, reminders, and two-way advisor threads.",
    tiers: "professional+",
  },
  {
    id: "tire-storage",
    name: "Tire storage module",
    priceLabel: "$29/mo",
    description: "Seasonal tire storage tracking, labels, and customer notifications.",
    vsIndustry: "Tekmetric Tire Suite is $39/mo.",
    tiers: "all",
  },
  {
    id: "migration",
    name: "Premium migration",
    priceLabel: "$399 one-time",
    description: "White-glove data import from your current system, team training, and go-live support.",
    vsIndustry: "Included on Elite. Many vendors charge setup without migration.",
    tiers: "all",
  },
  {
    id: "extra-location",
    name: "Additional location",
    priceLabel: "$79/mo",
    description:
      "Add a second bay or satellite shop — shared customers, separate job boards, and per-location reporting.",
    vsIndustry: "Most platforms charge nearly full list price again per location.",
    tiers: "all",
  },
];

const starterFeatures: PlanFeatureSet = {
  maxUsers: null,
  maxRepairOrdersPerMonth: null,
  maxVinPlateDecodesPerMonth: null,
  cannedJobs: true,
  partsTech: true,
  laborGuide: true,
  motorLabor: false,
  customerEmail: true,
  /** Two-way SMS included on Ignition/Core (price includes messaging). Still env + release gated. */
  customerSms: true,
  carfax: true,
  digitalInspections: true,
  appointments: true,
  reports: true,
  integrations: false,
  multiLocation: false,
  approvalLinks: true,
  invoiceSharing: true,
  advancedReports: false,
  markupMatrices: false,
  shopSite: false,
  websiteSeo: false,
  marketingCampaigns: false,
  googleReviews: true,
  /** Care Plans — Elite premium later; never included on Core. */
  maintenancePrograms: false,
  aiReviewReplies: false,
  aiCampaignDrafting: false,
  aiSeoContent: false,
  aiCustomerInsights: false,
  aiReceptionist: false,
  autodevDecoding: false,
  freeformRoIntake: false,
};

const professionalFeatures: PlanFeatureSet = {
  maxUsers: null,
  maxRepairOrdersPerMonth: null,
  maxVinPlateDecodesPerMonth: null,
  cannedJobs: true,
  partsTech: true,
  laborGuide: true,
  motorLabor: true,
  customerEmail: true,
  customerSms: true,
  carfax: true,
  digitalInspections: true,
  appointments: true,
  reports: true,
  integrations: true,
  multiLocation: false,
  approvalLinks: true,
  invoiceSharing: true,
  advancedReports: true,
  markupMatrices: true,
  shopSite: false,
  websiteSeo: false,
  marketingCampaigns: true,
  googleReviews: true,
  /** Care Plans stay Elite-only — not on Pro. */
  maintenancePrograms: false,
  aiReviewReplies: false,
  aiCampaignDrafting: false,
  aiSeoContent: false,
  aiCustomerInsights: false,
  aiReceptionist: false,
  autodevDecoding: true,
  freeformRoIntake: false,
};

const EliteFeatures: PlanFeatureSet = {
  maxUsers: null,
  maxRepairOrdersPerMonth: null,
  maxVinPlateDecodesPerMonth: null,
  cannedJobs: true,
  partsTech: true,
  laborGuide: true,
  motorLabor: true,
  customerEmail: true,
  customerSms: true,
  carfax: true,
  digitalInspections: true,
  appointments: true,
  reports: true,
  integrations: true,
  multiLocation: false,
  approvalLinks: true,
  invoiceSharing: true,
  advancedReports: true,
  markupMatrices: true,
  shopSite: true,
  websiteSeo: true,
  marketingCampaigns: true,
  googleReviews: true,
  /** Care Plans — Elite premium entitlement (also release-gated via growthEngine). */
  maintenancePrograms: true,
  aiReviewReplies: true,
  aiCampaignDrafting: true,
  aiSeoContent: true,
  aiCustomerInsights: true,
  aiReceptionist: true,
  autodevDecoding: true,
  freeformRoIntake: false,
};

/** Canonical plan catalog — premium tiers vs legacy & budget stacks. */
export const PLANS: Record<ShopPlan, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Core",
    marketingName: "Ignition",
    subtitle: "Shop plan",
    tagline:
      "Everything to run your shop — job board, digital vehicle inspections, estimates, PartsTech, Carfax, two-way SMS, Google Reviews inbox, appointments & live ops.",
    monthlyCents: 9999,
    annualMonthlyCents: 9499,
    valueNote:
      "Full shop CRM · PartsTech · Carfax · two-way SMS · Google Reviews inbox · digital vehicle inspections · Live Operations Daily Snapshot",
    savingsNote:
      "Full shop CRM · PartsTech · Carfax · two-way SMS · Google Reviews inbox · digital vehicle inspections · Live Operations Daily Snapshot",
    pricingCard: {
      bestFor:
        "Independent shops that want one system for the bay and the counter — including PartsTech, Carfax, two-way SMS, and Google Reviews inbox",
      bullets: [
        "PartsTech catalog & punchout — search vendors and drop parts onto the RO",
        "Carfax service history on the vehicle / RO",
        "Two-way SMS — estimate, approval & invoice threads with the customer",
        "Job board + full RO workspace (Estimates → WIP → Done)",
        "Digital estimates, email approvals & invoices",
        "Digital vehicle inspections (photo checklists customers can see)",
        "Google Reviews inbox — sync & reply from the CRM",
        "Live Operations Daily Snapshot every morning",
        "Canned jobs & shop labor library",
        "Appointments + payment tracking",
        "Unlimited users, ROs & NHTSA VIN decode",
        "Customers, vehicles & inventory basics",
      ],
    },
    features: starterFeatures,
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    name: "Pro",
    subtitle: "Most popular",
    tagline: "Licensed labor, Growth Engine & payments — our flagship tier.",
    monthlyCents: 27900,
    annualMonthlyCents: 23900,
    popular: true,
    valueNote: "Licensed labor + premium all-in-one vs ~$574/mo mid-market CRM + labor + marketing stack",
    savingsNote: "Licensed labor + premium all-in-one vs ~$574/mo mid-market CRM + labor + marketing stack",
    pricingCard: {
      bestFor: "Growing shops that want labor data + marketing in one bill",
      includesPrevious: "STARTER",
      bullets: [
        "Licensed MOTOR labor data",
        "Unlimited VIN & plate decoding",
        "OEM service specs",
        "OEM fluid capacities",
        "Advanced inventory & multi-vendor parts workflows",
        "Stripe Connect payments",
        "Online booking",
        "Growth Engine — automations & win-back campaigns",
        "Review-request campaigns after service",
      ],
    },
    features: professionalFeatures,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Elite",
    subtitle: "White-glove",
    tagline: "Full premium stack with white-glove launch support.",
    monthlyCents: 47900,
    annualMonthlyCents: 40900,
    valueNote: "Full stack vs legacy CRM + agency retainers · migration & launch setup included",
    savingsNote: "Full stack vs legacy CRM + agency retainers · migration & launch setup included",
    pricingCard: {
      bestFor: "Shops ready for AI, web, SEO & Care Plans",
      includesPrevious: "PROFESSIONAL",
      bullets: [
        "AI receptionist + review reply drafting",
        `ShopSite & Local SEO included ($${webPresenceAlaCarteMonthlyDollars()}/mo value)`,
        "Care Plans — member maintenance subscriptions",
        "AI SEO content & campaign drafting",
        `${PLAN_TRAINING.ENTERPRISE.sessions} · migration included`,
      ],
    },
    features: EliteFeatures,
  },
};

/** @deprecated Prefer PUBLIC_PLAN_ORDER (marketing) or PLATFORM_PLAN_ORDER (admin). */
export const PLAN_ORDER: ShopPlan[] = PLATFORM_PLAN_ORDER;

export function publicPlanAddons(): PlanAddOn[] {
  if (PHASE_ONE_LAUNCH) {
    return PLAN_ADDONS.filter((addon) => addon.phaseOne);
  }
  return PLAN_ADDONS;
}

/** Whether a billable add-on can be purchased on the given shop plan. */
export function planAddonEligible(plan: ShopPlan, addon: PlanAddOn): boolean {
  switch (addon.tiers) {
    case "core-only":
      return plan === "STARTER";
    case "all":
      return true;
    case "starter+":
      return plan === "STARTER" || plan === "PROFESSIONAL" || plan === "ENTERPRISE";
    case "professional+":
      return plan === "PROFESSIONAL" || plan === "ENTERPRISE";
    case "premier":
      return plan === "ENTERPRISE";
    default:
      return false;
  }
}

/** Core (STARTER) is the only tier that can buy AI Plus / Smart RO Intake. */
export function isCorePlan(plan: ShopPlan): boolean {
  return plan === "STARTER";
}

/** Format cents as a price string — preserves .99 when present. */
export function formatPriceFromCents(cents: number): string {
  const amount = cents / 100;
  return cents % 100 === 0 ? `$${amount.toFixed(0)}` : `$${amount.toFixed(2)}`;
}

/** Row shape for the public pricing comparison table. */
export type PriceComparisonRow = {
  name: string;
  planId?: ShopPlan;
  crmLabel: string;
  marketingLabel: string;
  stackTotal: number | null;
  note: string;
  shoprally?: boolean;
};

function planMonthlyPrice(planId: ShopPlan, annual: boolean): number {
  const plan = PLANS[planId];
  return (annual ? plan.annualMonthlyCents : plan.monthlyCents) / 100;
}

/** Incumbent + ShopRally rows for the pricing page comparison table. */
export function buildPriceComparisonRows(annual: boolean): PriceComparisonRow[] {
  const incumbents: PriceComparisonRow[] = COMPETITOR_BENCHMARK.incumbents.map((row) => ({
    name: row.name,
    crmLabel: `$${row.crm}/mo`,
    marketingLabel: row.marketing > 0 ? `$${row.marketing}/mo` : "—",
    stackTotal:
      row.marketing > 0 ? row.crm + row.marketing : null,
    note: row.note,
  }));

  const starter = planMonthlyPrice("STARTER", annual);
  const professional = planMonthlyPrice("PROFESSIONAL", annual);
  const premier = planMonthlyPrice("ENTERPRISE", annual);

  const budgetStack = COMPETITOR_BENCHMARK.budgetGrowthStackMonthly;

  const shoprallyRows: PriceComparisonRow[] = [
    {
      name: `ShopRally ${PLANS.STARTER.name}`,
      planId: "STARTER",
      crmLabel: `$${starter}/mo`,
      marketingLabel: "—",
      stackTotal: starter,
      note: "Ignition CRM · PartsTech · Carfax · two-way SMS · digital vehicle inspections · Google Reviews inbox · Live Operations Daily Snapshot · appointments · payment tracking · NHTSA VIN",
      shoprally: true,
    },
    {
      name: `ShopRally ${PLANS.PROFESSIONAL.name}`,
      planId: "PROFESSIONAL",
      crmLabel: "Bundled",
      marketingLabel: "Included",
      stackTotal: professional,
      note: "Everything in Ignition + licensed MOTOR, unlimited VIN/plate, Stripe Connect & Growth Engine campaigns",
      shoprally: true,
    },
    {
      name: `ShopRally ${PLANS.ENTERPRISE.name}`,
      planId: "ENTERPRISE",
      crmLabel: "Bundled",
      marketingLabel: "Premium included",
      stackTotal: premier,
      note: "Everything in Pro + AI, ShopSite, Local SEO, Care Plans & white-glove onboarding",
      shoprally: true,
    },
  ];

  return [...incumbents, ...shoprallyRows];
}

/** Rows for the public pricing comparison table. */
export const COMPARISON_ROWS: {
  label: string;
  category?: string;
  values: Record<ShopPlan, string | boolean>;
}[] = [
  {
    label: "Users",
    category: "Limits",
    values: { STARTER: "Unlimited", PROFESSIONAL: "Unlimited", ENTERPRISE: "Unlimited" },
  },
  {
    label: "Repair orders / month",
    values: { STARTER: "Unlimited", PROFESSIONAL: "Unlimited", ENTERPRISE: "Unlimited" },
  },
  { label: "Per location pricing", values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true } },
  {
    label: "Job board & kanban",
    category: "Shop CRM",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Customers, vehicles & repair orders",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Digital vehicle inspections",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Multi-point inspection templates & R/Y/G ratings",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Photo markup on inspection items",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Customer inspection share links",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Canned jobs",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Markup matrices",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "PartsTech catalog & punchout",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Inventory basics",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "VIN decoding",
    values: VIN_PLATE_DECODE_PLAN_COPY.comparisonByPlan,
  },
  {
    label: "License plate → VIN lookup",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "OEM service specs",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "OEM fluid capacities",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Labor guide",
    values: LABOR_PLAN_COPY.comparisonByPlan,
  },
  {
    label: "MOTOR labor data",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Stripe Connect payments",
    category: "Payments & POS",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Email estimates, approvals & invoices",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Two-way SMS",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Carfax service history",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Online booking widget",
    category: "Growth Engine",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "SMS & email campaigns / automations",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Google Reviews inbox (sync & reply)",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Review-request campaigns",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "ShopSite (hosted website)",
    category: "Website & SEO",
    values: {
      STARTER: "$99/mo add-on",
      PROFESSIONAL: "$99/mo add-on",
      ENTERPRISE: "Included",
    },
  },
  {
    label: "Local SEO · Growth Engine SEO",
    values: {
      STARTER: "$129/mo add-on",
      PROFESSIONAL: "$129/mo add-on",
      ENTERPRISE: "Included",
    },
  },
  {
    label: "Website + SEO bundle",
    values: {
      STARTER: "$199/mo add-on",
      PROFESSIONAL: "$199/mo add-on",
      ENTERPRISE: `Included ($${webPresenceAlaCarteMonthlyDollars()}/mo value)`,
    },
  },
  {
    label: "One-time launch setup",
    values: {
      STARTER: `$349 ShopSite · $299 SEO · $549 bundle`,
      PROFESSIONAL: `$349 ShopSite · $299 SEO · $549 bundle`,
      ENTERPRISE: "Included",
    },
  },
  {
    label: "AI receptionist",
    category: "AI integrations",
    values: {
      STARTER: false,
      PROFESSIONAL: "$59/mo add-on",
      ENTERPRISE: "Included (SMS + voice)",
    },
  },
  {
    label: "AI Google Review responses",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "AI SEO content & optimization",
    values: { STARTER: false, PROFESSIONAL: "$49/mo add-on", ENTERPRISE: "Included" },
  },
  {
    label: "AI campaign & SMS drafting",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "AI customer insights",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Premium migration",
    values: {
      STARTER: "$399 add-on",
      PROFESSIONAL: "$399 add-on",
      ENTERPRISE: "Included",
    },
  },
  {
    label: "Care Plans (maintenance subscriptions)",
    category: "Subscriptions",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Care Plan member portal & shop-level billing",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Operations Daily Snapshot",
    category: "Insights",
    values: DASHBOARD_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Shop reports",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Advanced reporting & analytics",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "In-depth training included",
    category: "Onboarding & support",
    values: {
      STARTER: PLAN_TRAINING.STARTER.sessions,
      PROFESSIONAL: PLAN_TRAINING.PROFESSIONAL.sessions,
      ENTERPRISE: PLAN_TRAINING.ENTERPRISE.sessions,
    },
  },
  {
    label: "Priority onboarding & support",
    values: { STARTER: false, PROFESSIONAL: "Email & chat support", ENTERPRISE: true },
  },
  {
    label: "Third-party integrations (QBO, etc.)",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
];

/**
 * Phase-one /pricing `#feature-comparison` — only capabilities that ship with Ignition.
 * Keeps Pro/Elite/add-on rows out of the expandable “Ignition feature list” so founding
 * shops aren’t shown a matrix of gaps and deferred SKUs.
 * Full {@link COMPARISON_ROWS} remains for multi-tier GTM when `PHASE_ONE_LAUNCH` is false.
 */
export const IGNITION_LAUNCH_COMPARISON_ROWS: {
  label: string;
  category?: string;
  values: Record<ShopPlan, string | boolean>;
}[] = [
  {
    label: "Users",
    category: "Limits",
    values: { STARTER: "Unlimited", PROFESSIONAL: "Unlimited", ENTERPRISE: "Unlimited" },
  },
  {
    label: "Repair orders / month",
    values: { STARTER: "Unlimited", PROFESSIONAL: "Unlimited", ENTERPRISE: "Unlimited" },
  },
  { label: "Per location pricing", values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true } },
  {
    label: "Job board & kanban",
    category: "Shop CRM",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Customers, vehicles & repair orders",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "RO / estimate workspace",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Digital vehicle inspections",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Multi-point inspection templates & R/Y/G ratings",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Photo markup on inspection items",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Customer inspection share links",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Canned jobs & shop labor library",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "PartsTech catalog & punchout",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Inventory basics",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "VIN decoding",
    values: VIN_PLATE_DECODE_PLAN_COPY.comparisonByPlan,
  },
  {
    label: "Appointments",
    category: "Scheduling & payments",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Payment tracking (manual)",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Email estimates, approvals & invoices",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Two-way SMS",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Carfax service history",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Google Reviews inbox (sync & reply)",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Operations Daily Snapshot",
    category: "Insights & support",
    values: DASHBOARD_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Shop reports",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "In-depth training included",
    values: {
      STARTER: PLAN_TRAINING.STARTER.sessions,
      PROFESSIONAL: PLAN_TRAINING.PROFESSIONAL.sessions,
      ENTERPRISE: PLAN_TRAINING.ENTERPRISE.sessions,
    },
  },
];

/**
 * Deferred vs Ignition — labeled separately under the launch feature list.
 * Not shown as Ignition-included checks.
 */
export const IGNITION_COMING_LATER_FEATURES = [
  { name: "Licensed MOTOR labor data", note: "Pro+" },
  { name: "Stripe Connect card capture", note: "Pro+" },
  { name: "Growth Engine / marketing campaigns", note: "Pro+" },
  { name: "Online booking widget", note: "Pro+" },
  { name: "Review-request campaigns", note: "Pro+" },
  { name: "Auto.dev plate→VIN", note: "Pro+" },
  { name: "OEM service specs & fluid capacities", note: "Pro+" },
  { name: "Markup matrices", note: "Pro+" },
  { name: "Advanced reporting & analytics", note: "Pro+" },
  { name: "QuickBooks & other third-party integrations", note: "Pro+" },
  { name: "AI receptionist & Elite AI suite", note: "Elite / add-on" },
  { name: "Care Plans (member maintenance subscriptions)", note: "Elite premium" },
] as const;

/** Rows for the public pricing comparison table (phase-one vs full matrix). */
export function getPublicComparisonRows(): typeof COMPARISON_ROWS {
  return PHASE_ONE_LAUNCH ? IGNITION_LAUNCH_COMPARISON_ROWS : COMPARISON_ROWS;
}

/** Estimated monthly if buying CRM + marketing + website separately elsewhere. */
export function estimatedCompetitorStackMonthly(): number {
  return COMPETITOR_BENCHMARK.typicalStackMonthly;
}

/** ShopRally Starter monthly price for comparison callouts. */
export function shoprallyStarterMonthly(annual = true): number {
  const p = PLANS.STARTER;
  return (annual ? p.annualMonthlyCents : p.monthlyCents) / 100;
}

/**
 * Canonical Ignition price pair for marketing — monthly list · effective monthly when billed annually.
 * Prefer this over showing only the annual rate as if it were the only price.
 */
export function shoprallyStarterPricePairLabel(): string {
  return `$${shoprallyStarterMonthly(false).toFixed(2)} monthly · $${shoprallyStarterMonthly(true).toFixed(2)} annual`;
}

/** Ignition + AI Plus combined monthly (list or annual-base Ignition + AI Plus list). */
export function shoprallyIgnitionAiBundleMonthly(annual = false): number {
  return shoprallyStarterMonthly(annual) + aiPlusMonthlyDollars();
}

/** Bundle pair label — e.g. "$149.98 monthly · $144.98 annual". */
export function shoprallyIgnitionAiBundlePricePairLabel(): string {
  return `$${shoprallyIgnitionAiBundleMonthly(false).toFixed(2)} monthly · $${shoprallyIgnitionAiBundleMonthly(true).toFixed(2)} annual`;
}

/** ShopRally Professional monthly price for comparison callouts. */
export function shoprallyAllInMonthly(annual = true): number {
  const p = PLANS.PROFESSIONAL;
  return (annual ? p.annualMonthlyCents : p.monthlyCents) / 100;
}

/** ShopRally Elite monthly price for comparison callouts. */
export function shoprallyOverdriveMonthly(annual = true): number {
  const p = PLANS.ENTERPRISE;
  return (annual ? p.annualMonthlyCents : p.monthlyCents) / 100;
}

/** @deprecated Use shoprallyStarterMonthly */
export const repairPilotStarterMonthly = shoprallyStarterMonthly;
/** @deprecated Use shoprallyAllInMonthly */
export const repairPilotAllInMonthly = shoprallyAllInMonthly;
/** @deprecated Use shoprallyOverdriveMonthly */
export const repairPilotOverdriveMonthly = shoprallyOverdriveMonthly;

export type ShopPlanContext = {
  plan: ShopPlan;
  planFeatures?: unknown;
};

/** Merge plan defaults with optional per-shop JSON overrides (ignores `_release`). */
export function resolvePlanFeatures(shop: ShopPlanContext): PlanFeatureSet {
  const base = PLANS[shop.plan].features;
  const overrides = stripReleaseFromPlanFeatures(shop.planFeatures);
  return overrides ? { ...base, ...(overrides as Partial<PlanFeatureSet>) } : { ...base };
}

export function shopHasFeature(shop: ShopPlanContext, feature: PlanFeature): boolean {
  return resolvePlanFeatures(shop)[feature];
}

export function formatPlanPrice(cents: number | null, annual: boolean): string {
  if (cents === null) return "Custom";
  const amount = annual
    ? (Object.values(PLANS).find((p) => p.monthlyCents === cents)?.annualMonthlyCents ??
      Math.round(cents * 0.88))
    : cents;
  return `$${(amount / 100).toFixed(0)}`;
}

export function planDisplayPrice(plan: PlanDefinition, annual: boolean): string {
  const cents = annual ? plan.annualMonthlyCents : plan.monthlyCents;
  return formatPriceFromCents(cents);
}

/** In-app / CRM plan label (e.g. Core on Settings → Subscription). */
export function planAppDisplayName(plan: PlanDefinition): string {
  return plan.name;
}

/** Public marketing plan label (e.g. Ignition on /pricing when `marketingName` is set). */
export function planMarketingDisplayName(plan: PlanDefinition): string {
  return plan.marketingName ?? plan.name;
}

/** List (monthly) price — shown struck-through when annual billing is selected. */
export function planListPrice(plan: PlanDefinition): string {
  return formatPriceFromCents(plan.monthlyCents);
}

/** Bullets for pricing cards and signup — includes tier-upgrade header when set. */
export function planCardBullets(plan: PlanDefinition): string[] {
  const { bullets, includesPrevious } = plan.pricingCard;
  if (!includesPrevious) return bullets;
  const prev = PLANS[includesPrevious];
  return [`Everything in ${prev.name}, plus:`, ...bullets];
}

export function annualSavingsPercent(plan: PlanDefinition): number {
  return Math.round((1 - plan.annualMonthlyCents / plan.monthlyCents) * 100);
}

/** Total dollars saved per year on annual vs monthly billing. */
export function annualSavingsDollars(plan: PlanDefinition): number {
  return Math.round(((plan.monthlyCents - plan.annualMonthlyCents) * 12) / 100);
}

/**
 * Integration partners for multi-tier GTM (when Pro/Elite are public).
 * Do not use this strip for Ignition-only / founding waitlist — it reads as
 * "available integrations today" and mixes Pro tools into the launch plan.
 */
export const INTEGRATION_PARTNERS = [
  "PartsTech",
  "Carfax",
  "Twilio",
  "Stripe",
  "QuickBooks",
  "Google Business",
] as const;

/**
 * Phase-one Ignition capability chips for /pricing — founding launch scope,
 * not a partner/integrations matrix. Keep Pro+ tools out of this list.
 */
export const IGNITION_LAUNCH_HIGHLIGHTS = [
  "PartsTech catalog & punchout",
  "Carfax service history",
  "Two-way SMS",
  "Google Reviews inbox (sync & reply)",
  "Unlimited NHTSA VIN",
  "Email estimates & approvals",
  "Digital vehicle inspections",
  "Job board & RO workspace",
  "Live Operations Daily Snapshot",
  "Appointments & payment tracking",
  "Canned jobs & shop labor library",
] as const;

/** Pricing page FAQ — mirrors Garage360/Torque360 objection handling. */
export const PRICING_FAQ = [
  {
    q: "How much does auto repair shop management software cost with ShopRally?",
    a: PHASE_ONE_LAUNCH
      ? `Ignition founding pricing is ${shoprallyStarterPricePairLabel()} — one all-in-one shop management plan with PartsTech, Carfax, two-way SMS, and Google Reviews inbox (sync & reply) included. Optional AI Plus is ${aiPlusPriceLabel()}. Website & SEO is a separate companion offer on this page. Reserving a founding seat for Q4 2026 does not bill you today.`
      : `Ignition is ${shoprallyStarterPricePairLabel()} for all-in-one shop management with PartsTech, Carfax, two-way SMS, and Google Reviews inbox. Pro and Elite add growth and AI stacks — compare the table on this page.`,
  },
  {
    q: "Which plan should I choose?",
    a: PHASE_ONE_LAUNCH
      ? `Ignition (${shoprallyStarterPricePairLabel()}) is the plan we're launching in Q4 2026. Reserve a founding seat for: unlimited users & ROs, job board, full RO workspace, PartsTech parts catalog & punchout, Carfax service history, two-way SMS, Google Reviews inbox (sync & reply from the CRM), canned jobs & shop labor library, digital estimates/approvals/invoices (email + SMS), digital vehicle inspections, Live Operations Daily Snapshot, appointments, payment tracking, unlimited NHTSA VIN decode, and inventory basics. Add AI Plus (${aiPlusPriceLabel()}) for freeform AI repair-order intake, labor assist, and the advisor mobile app. Review-request campaigns stay on the Pro+ Growth Engine roadmap; AI review-reply drafts are Elite.`
      : "Ignition for shops that want CRM + PartsTech + Carfax + two-way SMS + Google Reviews inbox in one bill — unlimited users & ROs, job board, digital vehicle inspections, email & SMS estimates & approvals, Live Operations Daily Snapshot, appointments, payment tracking, PartsTech punchout, and shop catalog. Ignition does not include Stripe Connect, licensed MOTOR, Care Plans, or review-request campaigns. Pro when you want licensed MOTOR, unlimited VIN & plate decoding, OEM specs & fluids, booking, Growth Engine campaigns, and review-request automations. Elite when you want AI receptionist, AI review-reply drafts, ShopSite, Local SEO, and Care Plans in one bill.",
  },
  {
    q: "What's not on Ignition yet?",
    a: PHASE_ONE_LAUNCH
      ? "Licensed MOTOR, Stripe Connect card capture, Growth Engine campaigns, online booking, and review-request campaigns stay on the Pro+ roadmap. Care Plans, AI receptionist, and AI review-reply drafts are Elite premium (not Core/Ignition). PartsTech, Carfax, two-way SMS, and Google Reviews inbox (sync & reply) ship with Ignition. ShopSite and Local SEO are a separate Website & SEO product line (see the Website & SEO tab) — not buried in Ignition CRM pricing."
      : "ShopSite ($99/mo) and Local SEO ($129/mo) are separate monthly subscriptions on any CRM tier. Subscribe to both for $199/mo with the bundle. A one-time launch setup applies when each service starts ($349 ShopSite, $299 Local SEO, or $549 bundle). Elite includes monthly fees and launch setup. Care Plans are Elite-only — not on Core or Pro.",
  },
  {
    q: "Are Google Reviews included on Ignition?",
    a: "Yes — Ignition includes the Google Reviews inbox: connect Google Business Profile, sync reviews into the CRM, and reply from one place. That is Core/Ignition recognition tooling — not Growth Engine. Automated review-request campaigns after service are Pro+; AI-drafted review replies are Elite.",
  },
  {
    q: "Can I get a website and SEO?",
    a: "Yes — ShopSite and Local SEO are available at launch as their own offer, billed separately from Ignition CRM. Use the Website & SEO tab on this page, then request a website & SEO setup (demo form with need=website). High-level: hosted shop site, local SEO, Google Business Profile / organic local presence, and local Google Ads optimization when you're already running ads — plus a one-time launch build. We don't guarantee rankings or ROI, and not every SEO Autopilot feature is inside Ignition.",
  },
  {
    q: "Can I change plans anytime?",
    a: PHASE_ONE_LAUNCH
      ? "Ignition is the only CRM plan on the founding waitlist for Q4 2026. Website & SEO is requested separately. When Pro and Elite open later, you'll be able to upgrade CRM — we'll announce that separately."
      : "Yes. Upgrade or downgrade anytime. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "Is there a setup fee?",
    a: PHASE_ONE_LAUNCH
      ? "No CRM setup fee on Ignition. Founding shops get priority onboarding help. ShopSite and Local SEO (separate product line) have a one-time launch setup when we build your site or SEO ($349 / $299, or $549 bundle) — see the Website & SEO tab."
      : "No setup fee on CRM plans. ShopSite and Local SEO add-ons have a one-time launch setup when you first subscribe ($349 / $299, or $549 for the bundle). Elite includes launch setup. Optional white-glove data migration is $399 one-time (also included on Elite).",
  },
  {
    q: "What's included in the founding-shop pricing?",
    a: `Founding shops lock in Ignition launch rates (${shoprallyStarterPricePairLabel()}) when we open — before public list pricing rises. Choose monthly or annual at launch. Priority walkthroughs and feedback access included. Reserving a seat does not bill you today.`,
  },
  {
    q: "Are digital vehicle inspections included?",
    a: DVI_PLAN_COPY.faqAnswer,
  },
  {
    q: "What's included in Operations Daily Snapshot?",
    a: DASHBOARD_PLAN_COPY.faqAnswer,
  },
  {
    q: "What's included for labor data?",
    a: LABOR_PLAN_COPY.faqAnswer,
  },
  {
    q: "How does VIN decoding work on Ignition?",
    a: VIN_PLATE_DECODE_PLAN_COPY.faqAnswer,
  },
  {
    q: "What about MOTOR labor guides?",
    a: PHASE_ONE_LAUNCH
      ? "Licensed MOTOR flat-rate data is planned for Pro and Elite — not on Ignition. Ignition uses your shop labor library and canned jobs."
      : "MOTOR labor data is licensed flat-rate guides and procedures in the estimate. It is included on Pro and Elite. Ignition uses the shop labor library.",
  },
  {
    q: "Do you integrate with PartsTech, Carfax, SMS, and QuickBooks?",
    a: PHASE_ONE_LAUNCH
      ? "PartsTech catalog & punchout, Carfax service history, two-way SMS (Twilio), and Google Reviews inbox (sync & reply) ship with Ignition at launch. QuickBooks and Stripe Connect stay on the later Pro/Elite roadmap."
      : "PartsTech, Carfax, two-way SMS, and Google Reviews inbox are on every plan. Stripe Connect is on Pro and Elite. QuickBooks integration is on our roadmap — contact us for timeline.",
  },
  {
    q: "How does additional locations work?",
    a: PHASE_ONE_LAUNCH
      ? "Ignition is priced per shop location. Multi-location tooling and discounted add-on locations are part of the later roadmap — talk to us if you run more than one roof today."
      : "Each location is billed separately. Add a second shop for $79/mo — shared customer history, separate job boards.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Month-to-month billing with no long-term contract. Cancel anytime — service continues through your billing period.",
  },
  {
    q: "Is training included?",
    a: PHASE_ONE_LAUNCH
      ? "Ignition includes product guides and early demo support. Book a demo for a guided walkthrough of the bay loop. Dedicated white-glove onboarding is planned for Elite later."
      : "Elite includes a dedicated onboarding specialist and migration. Ignition and Pro are self-serve with product training resources — book a demo if you want a guided go-live.",
  },
  {
    q: "Can I switch from another shop system?",
    a: PHASE_ONE_LAUNCH
      ? "Yes. Founding shops get priority onboarding help. Formal white-glove migration packages are planned alongside later tiers — tell us what you're on today when you watch a walkthrough or when we onboard. We won't invent one-click imports that aren't built yet."
      : "Yes. We offer optional white-glove migration ($399 one-time, included on Elite) and founding shops get priority onboarding help.",
  },
] as const;

/** Stub hook for future Stripe subscription sync. */
export function billingStatusLabel(status: string): string {
  switch (status) {
    case "TRIAL":
      return "Trial";
    case "ACTIVE":
      return "Active";
    case "PAST_DUE":
      return "Past due";
    case "CANCELED":
      return "Canceled";
    default:
      return status;
  }
}
