import type { ShopPlan } from "@/generated/prisma";

/**
 * Public pricing strategy (2026 Q3): positioned vs Garage360 / Torque360 budget tier AND
 * Tekmetric / Shopmonkey mid-market stack pricing.
 * Display tiers: Ignition · Momentum · Overdrive (internal enum: ENTERPRISE).
 * ShopSite & Local SEO are separate monthly add-ons on all tiers; both included on Overdrive.
 */
export type PlanFeature =
  | "cannedJobs"
  | "partsTech"
  | "laborGuide"
  | "customerEmail"
  | "customerSms"
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
  | "maintenancePrograms"
  | "aiReviewReplies"
  | "aiCampaignDrafting"
  | "aiSeoContent"
  | "aiCustomerInsights"
  | "aiReceptionist";

export type PlanLimits = {
  /** null = unlimited */
  maxUsers: number | null;
  /** null = unlimited */
  maxRepairOrdersPerMonth: number | null;
};

export type PlanFeatureSet = PlanLimits & Record<PlanFeature, boolean>;

export type PlanDefinition = {
  id: ShopPlan;
  name: string;
  /** Short label on pricing cards (e.g. "Core shop"). */
  subtitle: string;
  tagline: string;
  monthlyCents: number;
  annualMonthlyCents: number;
  /** Marketing callout vs typical incumbent stack cost. */
  savingsNote?: string;
  popular?: boolean;
  highlights: string[];
  features: PlanFeatureSet;
};

/** In-depth training included on every tier — depth scales with plan. */
export const PLAN_TRAINING: Record<
  ShopPlan,
  { headline: string; sessions: string; description: string }
> = {
  STARTER: {
    headline: "In-depth training included",
    sessions: "2 live go-live sessions",
    description:
      "Hands-on training on the job board, repair orders, DVIs, estimates, and shop reports for owners and lead advisors.",
  },
  PROFESSIONAL: {
    headline: "In-depth team training included",
    sessions: "Team training program",
    description:
      "Everything in Ignition, plus role-based sessions for advisors, techs, and marketing — booking, SMS, campaigns, and reviews.",
  },
  ENTERPRISE: {
    headline: "White-glove training included",
    sessions: "Dedicated onboarding specialist",
    description:
      "Full-shop training with a dedicated specialist — AI tools, maintenance programs, ShopSite, Local SEO, and go-live support.",
  },
};

/** One-stop-shop modules — used on pricing & homepage. */
export const PLATFORM_MODULES = [
  {
    id: "crm",
    name: "Shop CRM",
    description: "Repair orders, job board, customers, vehicles, estimates, DVIs, tech board, inventory.",
    icon: "wrench" as const,
    pricingNote: "All monthly tiers",
  },
  {
    id: "payments",
    name: "Payments & POS",
    description: "Stripe Connect, text-to-pay, approval links, invoicing, markup matrices.",
    icon: "zap" as const,
    pricingNote: "Momentum & Overdrive",
  },
  {
    id: "shopsite",
    name: "ShopSite",
    description: "Branded shop website with services, contact, and online booking — hosted and updated for you.",
    icon: "globe" as const,
    pricingNote: "$59/mo + launch setup · Overdrive included",
  },
  {
    id: "seo",
    name: "Local SEO",
    description: "On-page SEO, JSON-LD, Search Console, local search, and SEO Autopilot runs every month.",
    icon: "search" as const,
    pricingNote: "$79/mo + launch setup · Overdrive included",
  },
  {
    id: "subscriptions",
    name: "Maintenance subscriptions",
    description: "Shop-level maintenance programs, member portal, Stripe billing, and counter enrollment.",
    icon: "repeat" as const,
    pricingNote: "Overdrive only",
  },
  {
    id: "growth",
    name: "Growth Engine",
    description: "Online booking, SMS/email campaigns, automations, Google Reviews, and review management.",
    icon: "sparkles" as const,
    pricingNote: "Momentum & Overdrive",
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
      "Google Business Profile guidance & Autopilot baseline",
    ],
  },
  bundle: {
    setupCents: 54900,
    includes: [
      "Coordinated ShopSite build + Local SEO launch",
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
    monthlyCents: 5900,
    priceLabel: "$59/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.shopsite.setupCents,
    description:
      "Branded shop website, hosting, SSL, custom domain setup, booking widget, and ongoing content updates.",
    savingsNote: "Agency site retainers often run $79–150/mo.",
  },
  {
    id: "seo-monthly",
    name: "Local SEO",
    monthlyCents: 7900,
    priceLabel: "$79/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.seo.setupCents,
    description:
      "On-page SEO, structured data (JSON-LD), Search Console monitoring, Google Business guidance, and SEO Autopilot runs.",
    savingsNote: "SEO agency retainers often start at $500+/mo.",
  },
  {
    id: "web-seo-bundle-monthly",
    name: "Website + SEO bundle",
    monthlyCents: 11900,
    priceLabel: "$119/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.bundle.setupCents,
    description: "ShopSite and Local SEO together — full web presence on two subscriptions billed as one.",
    savingsNote: "Save $19/mo vs subscribing to ShopSite and Local SEO separately ($138/mo).",
  },
];

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
    title: "AI SEO Autopilot",
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
      "Draft jobs from customer concerns and inspection findings — labor, parts placeholders, and advisor-ready notes in one pass.",
  },
] as const;

/** Competitor benchmark (public list prices). Marketing only. */
export const COMPETITOR_BENCHMARK = {
  label: "Typical monthly stack (CRM + marketing)",
  incumbents: [
    { name: "Garage360 Basic", crm: 79, marketing: 0, note: "Quotes & invoices · no DVI, inventory, or labor guides" },
    { name: "Garage360 Clever", crm: 119, marketing: 0, note: "DVI, inventory & QB · no SMS, booking, or campaigns" },
    { name: "Torque360 Starter", crm: 90, marketing: 0, note: "DVI & PartsTech · 5 co-users · one-way SMS only" },
    { name: "Garage360 Genius", crm: 199, marketing: 0, note: "Labor guides & diagrams · bolt-on marketing ~+$80/mo typical" },
    { name: "Torque360 Turbo", crm: 180, marketing: 0, note: "Two-way SMS & review mgmt · no AI, SEO, or maintenance programs" },
    { name: "Tekmetric", crm: 179, marketing: 345, note: "Marketing add-on · Scale tier ~$409/mo" },
    { name: "Shopmonkey", crm: 179, marketing: 315, note: "CRM Essentials add-on · Pro ~$399/mo" },
    { name: "AutoLeap", crm: 179, marketing: 130, note: "Pro ($309) adds marketing · AIR receptionist +$99/mo" },
  ],
  /** Garage360 Genius + typical SMS/booking/review bolt-ons. */
  budgetGrowthStackMonthly: 279,
  typicalStackMonthly: 524,
  /** Garage360 Basic — entry sticker price. */
  basicCrmMonthly: 79,
  /** Ops-comparable tier (Garage360 Clever class — DVI + reports). */
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
  tiers: "all" | "starter+" | "professional+" | "premier";
};

/** Optional monthly add-ons — stack on any tier where noted. */
export const PLAN_ADDONS: PlanAddOn[] = [
  {
    id: "ai-receptionist",
    name: "AI receptionist",
    priceLabel: "$59/mo",
    description: "After-hours call handling, appointment capture, and lead routing into your CRM.",
    vsIndustry: "AutoLeap AIR lists at $99/mo. Included on Overdrive.",
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
    vsIndustry: "Included on Overdrive. Many vendors charge setup without migration.",
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
  maxUsers: 5,
  maxRepairOrdersPerMonth: 150,
  cannedJobs: false,
  partsTech: false,
  laborGuide: false,
  customerEmail: true,
  customerSms: false,
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
  maintenancePrograms: false,
  aiReviewReplies: false,
  aiCampaignDrafting: false,
  aiSeoContent: false,
  aiCustomerInsights: false,
  aiReceptionist: false,
};

const professionalFeatures: PlanFeatureSet = {
  maxUsers: null,
  maxRepairOrdersPerMonth: null,
  cannedJobs: true,
  partsTech: true,
  laborGuide: true,
  customerEmail: true,
  customerSms: true,
  digitalInspections: true,
  appointments: true,
  reports: true,
  integrations: true,
  multiLocation: false,
  approvalLinks: true,
  invoiceSharing: true,
  advancedReports: false,
  markupMatrices: true,
  shopSite: false,
  websiteSeo: false,
  marketingCampaigns: true,
  maintenancePrograms: false,
  aiReviewReplies: false,
  aiCampaignDrafting: false,
  aiSeoContent: false,
  aiCustomerInsights: false,
  aiReceptionist: false,
};

const overdriveFeatures: PlanFeatureSet = {
  maxUsers: null,
  maxRepairOrdersPerMonth: null,
  cannedJobs: true,
  partsTech: true,
  laborGuide: true,
  customerEmail: true,
  customerSms: true,
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
  maintenancePrograms: true,
  aiReviewReplies: true,
  aiCampaignDrafting: true,
  aiSeoContent: true,
  aiCustomerInsights: true,
  aiReceptionist: true,
};

/** Canonical plan catalog — 3 public tiers vs incumbent CRM pricing. */
export const PLANS: Record<ShopPlan, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Ignition",
    subtitle: "Core shop",
    tagline: "Fire up digital ROs, DVIs, and the job board — priced for independents, not enterprise stacks.",
    monthlyCents: 7900,
    annualMonthlyCents: 6900,
    savingsNote: "Core shop CRM with DVIs, reports & approval links",
    highlights: [
      "Up to 5 users — no per-seat fees",
      "150 repair orders / month",
      "Job board, customers, ROs, DVIs & shop reports",
      "Email estimates, approvals & invoices",
      `${PLAN_TRAINING.STARTER.sessions} — in-depth training included`,
    ],
    features: starterFeatures,
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    name: "Momentum",
    subtitle: "Growth engine",
    tagline:
      "Full shop ops plus booking, SMS, campaigns, and reviews — Growth Engine included.",
    monthlyCents: 17900,
    annualMonthlyCents: 15900,
    popular: true,
    savingsNote: "Growth Engine included — booking, SMS, campaigns & reviews",
    highlights: [
      "Everything in Ignition, plus:",
      "Unlimited users & repair orders",
      "Growth Engine: booking, SMS, campaigns & automations",
      "Review management — Google sync, request campaigns & advisor inbox",
      "Stripe Connect, PartsTech, labor guide, canned jobs & markup matrices",
      `${PLAN_TRAINING.PROFESSIONAL.sessions} — in-depth training included`,
    ],
    features: professionalFeatures,
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Overdrive",
    subtitle: "All-in",
    tagline:
      "AI receptionist, review replies, ShopSite, Local SEO, and maintenance programs — full throttle.",
    monthlyCents: 29900,
    annualMonthlyCents: 27900,
    savingsNote: "ShopSite, Local SEO, maintenance programs & full AI suite included",
    highlights: [
      "Everything in Momentum",
      "AI Google Review responses — draft, edit & publish from one inbox",
      "AI receptionist + AI SEO content + AI campaign drafting",
      "ShopSite & Local SEO included ($138/mo value) · maintenance programs · launch setup waived",
      `${PLAN_TRAINING.ENTERPRISE.sessions} — white-glove training & priority onboarding`,
    ],
    features: overdriveFeatures,
  },
};

export const PLAN_ORDER: ShopPlan[] = ["STARTER", "PROFESSIONAL", "ENTERPRISE"];

/** Row shape for the public pricing comparison table. */
export type PriceComparisonRow = {
  name: string;
  planId?: ShopPlan;
  crmLabel: string;
  marketingLabel: string;
  stackTotal: number | null;
  note: string;
  repairPilot?: boolean;
};

function planMonthlyPrice(planId: ShopPlan, annual: boolean): number {
  const plan = PLANS[planId];
  return (annual ? plan.annualMonthlyCents : plan.monthlyCents) / 100;
}

/** Incumbent + RepairPilot rows for the pricing page comparison table. */
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

  const repairPilot: PriceComparisonRow[] = [
    {
      name: `ShopRally ${PLANS.STARTER.name}`,
      planId: "STARTER",
      crmLabel: `$${starter}/mo`,
      marketingLabel: "—",
      stackTotal: starter,
      note: "Core shop · up to 5 users · 150 ROs/mo · in-depth training included",
      repairPilot: true,
    },
    {
      name: `ShopRally ${PLANS.PROFESSIONAL.name}`,
      planId: "PROFESSIONAL",
      crmLabel: "Bundled",
      marketingLabel: "Included",
      stackTotal: professional,
      note: `CRM + Growth Engine bundled · team training included`,
      repairPilot: true,
    },
    {
      name: `ShopRally ${PLANS.ENTERPRISE.name}`,
      planId: "ENTERPRISE",
      crmLabel: "Bundled",
      marketingLabel: "Premium included",
      stackTotal: premier,
      note: "Maintenance, ShopSite, SEO, full AI suite & dedicated training specialist",
      repairPilot: true,
    },
  ];

  return [...incumbents, ...repairPilot];
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
    values: { STARTER: "Up to 5", PROFESSIONAL: "Unlimited", ENTERPRISE: "Unlimited" },
  },
  {
    label: "Repair orders / month",
    values: { STARTER: "150", PROFESSIONAL: "Unlimited", ENTERPRISE: "Unlimited" },
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
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Canned jobs & markup matrices",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Parts catalog (PartsTech) & inventory",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Labor Book",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Stripe Connect payments",
    category: "Payments & POS",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Text-to-approve & digital invoicing",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Two-way SMS",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
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
    label: "Review management (Google sync, requests & inbox)",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "ShopSite (hosted website)",
    category: "Website & SEO",
    values: {
      STARTER: "$59/mo add-on",
      PROFESSIONAL: "$59/mo add-on",
      ENTERPRISE: "Included",
    },
  },
  {
    label: "Local SEO + Autopilot",
    values: {
      STARTER: "$79/mo add-on",
      PROFESSIONAL: "$79/mo add-on",
      ENTERPRISE: "Included",
    },
  },
  {
    label: "Website + SEO bundle",
    values: {
      STARTER: "$119/mo add-on",
      PROFESSIONAL: "$119/mo add-on",
      ENTERPRISE: "Included ($138/mo value)",
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
    label: "Maintenance subscription programs",
    category: "Subscriptions",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Member portal & shop-level billing",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Shop reports",
    category: "Insights",
    values: { STARTER: true, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "Advanced reporting & analytics",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
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

/** Estimated monthly if buying CRM + marketing + website separately elsewhere. */
export function estimatedCompetitorStackMonthly(): number {
  return COMPETITOR_BENCHMARK.typicalStackMonthly;
}

/** ShopRally Starter monthly price for comparison callouts. */
export function repairPilotStarterMonthly(annual = true): number {
  const p = PLANS.STARTER;
  return (annual ? p.annualMonthlyCents : p.monthlyCents) / 100;
}

/** RepairPilot Professional monthly price for comparison callouts. */
export function repairPilotAllInMonthly(annual = true): number {
  const p = PLANS.PROFESSIONAL;
  return (annual ? p.annualMonthlyCents : p.monthlyCents) / 100;
}

/** ShopRally Overdrive monthly price for comparison callouts. */
export function repairPilotOverdriveMonthly(annual = true): number {
  const p = PLANS.ENTERPRISE;
  return (annual ? p.annualMonthlyCents : p.monthlyCents) / 100;
}

export type ShopPlanContext = {
  plan: ShopPlan;
  planFeatures?: unknown;
};

/** Merge plan defaults with optional per-shop JSON overrides. */
export function resolvePlanFeatures(shop: ShopPlanContext): PlanFeatureSet {
  const base = PLANS[shop.plan].features;
  const overrides = shop.planFeatures;
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) {
    return base;
  }
  return { ...base, ...(overrides as Partial<PlanFeatureSet>) };
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
  return `$${(cents / 100).toFixed(0)}`;
}

export function annualSavingsPercent(plan: PlanDefinition): number {
  return Math.round((1 - plan.annualMonthlyCents / plan.monthlyCents) * 100);
}

/** Total dollars saved per year on annual vs monthly billing. */
export function annualSavingsDollars(plan: PlanDefinition): number {
  return Math.round(((plan.monthlyCents - plan.annualMonthlyCents) * 12) / 100);
}

/** Integration partners shown on marketing/pricing pages. */
export const INTEGRATION_PARTNERS = [
  "PartsTech",
  "Stripe",
  "Twilio",
  "QuickBooks",
  "Google Business",
] as const;

/** Pricing page FAQ — mirrors Garage360/Torque360 objection handling. */
export const PRICING_FAQ = [
  {
    q: "Which plan should I choose?",
    a: "Ignition for a lean single-bay shop getting off paper. Momentum when you want booking, SMS, campaigns, and reviews without bolt-ons. Overdrive when you want AI receptionist, ShopSite, Local SEO, and maintenance programs in one bill.",
  },
  {
    q: "How does ShopSite and SEO pricing work?",
    a: "ShopSite ($59/mo) and Local SEO ($79/mo) are separate monthly subscriptions on any CRM tier. Subscribe to both for $119/mo with the bundle. A one-time launch setup applies when each service starts ($349 ShopSite, $299 Local SEO, or $549 bundle). Overdrive includes monthly fees and launch setup.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade or downgrade anytime. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "Is there a setup fee?",
    a: "No setup fee on CRM plans. ShopSite and Local SEO add-ons have a one-time launch setup when you first subscribe ($349 / $299, or $549 for the bundle). Overdrive includes launch setup. Optional white-glove data migration is $399 one-time (also included on Overdrive).",
  },
  {
    q: "What's included in the founding-shop pricing?",
    a: "Founding shops lock in launch rates on annual billing before we raise public pricing. Spots are limited.",
  },
  {
    q: "Do you integrate with PartsTech and QuickBooks?",
    a: "PartsTech, Stripe Connect, and labor guides are on Momentum and Overdrive. QuickBooks integration is on our roadmap — contact us for timeline.",
  },
  {
    q: "How does additional locations work?",
    a: "Each location is billed separately. Add a second shop for $79/mo — shared customer history, separate job boards.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Month-to-month billing with no long-term contract. Cancel anytime — service continues through your billing period.",
  },
  {
    q: "Is training included?",
    a: "Yes — every plan includes in-depth training. Ignition includes two live go-live sessions. Momentum adds a team training program for advisors, techs, and marketing. Overdrive includes a dedicated onboarding specialist and white-glove training across AI, maintenance programs, ShopSite, and Local SEO.",
  },
  {
    q: "Can I switch from another shop system?",
    a: "Yes. We offer optional white-glove migration ($399 one-time, included on Overdrive) and founding shops get priority onboarding help.",
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
