import type { ShopPlan } from "@/generated/prisma";

/**
 * Public pricing strategy (2026 Q3): premium positioning between legacy desktop CRM
 * and budget cloud + bolt-on stacks (Garage360, Torque360, Tekmetric add-ons).
 * Display tiers: Core · Pro · Elite (internal enums: STARTER / PROFESSIONAL / ENTERPRISE).
 * ShopSite & Local SEO are separate monthly add-ons on Core & Pro; included on Elite.
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

/** Labor tiers — Core = Labor AI; Pro+ = licensed flat-rate catalog + Labor AI. */
export const LABOR_PLAN_COPY = {
  ignitionHighlight: "Labor AI — AI-guided estimates & shop library",
  momentumHighlight: "Licensed labor data + Labor AI",
  comparisonByPlan: {
    STARTER: "Labor AI",
    PROFESSIONAL: "Licensed data + Labor AI",
    ENTERPRISE: "Licensed data + Labor AI",
  } satisfies Record<ShopPlan, string>,
  billingIgnition: "Labor AI — AI-guided estimates & shop library",
  billingMomentum: "Licensed flat-rate labor data + Labor AI",
  featuresIgnition: "Labor AI on Core · licensed data + Labor AI on Pro+",
  faqAnswer:
    "Core includes Labor AI for AI-guided estimates and your shop library. Pro and Elite add licensed flat-rate labor data plus Labor AI in the estimate — a combination vendors often charge extra for on top of CRM.",
} as const;

/** Live dashboard & daily insights — included on every plan tier. */
export const DASHBOARD_PLAN_COPY = {
  planHighlight: "Live dashboard — Daily Outline & daily profitable reports",
  billingItem: "Live dashboard — Daily Outline snapshot & daily profitable reports",
  dailyOutlineLabel: "Daily Outline",
  dailyOutlineDescription:
    "Your live shop-day snapshot — today's and tomorrow's timeline of ROs, payments, appointments, and activity.",
  dailyProfitableReports: "Daily profitable reports",
  featuresAllTiers: "Live dashboard · Daily Outline · daily profitable reports on every plan",
  comparisonAllTiers: {
    STARTER: true,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  } satisfies Record<ShopPlan, boolean>,
  faqAnswer:
    "Every plan includes a live dashboard with KPIs and trends, Daily Outline (your shop-day snapshot for today and tomorrow), and daily profitable reports so owners see collected revenue, gross volume, and what moved the needle — without waiting for month-end.",
} as const;

/** Digital vehicle inspections (DVIs) — included on every plan tier. */
export const DVI_PLAN_COPY = {
  planHighlight: "Digital vehicle inspections (DVIs) — MPI, photo markup & R/Y/G ratings",
  billingItem: "Digital vehicle inspections (DVIs) — templates, photo markup & customer share links",
  featuresAllTiers: "DVIs with photo markup & MPI templates on every plan",
  comparisonAllTiers: {
    STARTER: true,
    PROFESSIONAL: true,
    ENTERPRISE: true,
  } satisfies Record<ShopPlan, boolean>,
  faqAnswer:
    "Every plan includes full digital vehicle inspections — multi-point inspection templates, red/yellow/green item ratings, photo markup on findings, and share links so customers see inspection results on their phone before they approve work.",
} as const;

/** In-depth training included on every tier — depth scales with plan. */
export const PLAN_TRAINING: Record<
  ShopPlan,
  { headline: string; sessions: string; description: string }
> = {
  STARTER: {
    headline: "In-depth training included",
    sessions: "2 live go-live sessions",
    description:
      "Hands-on training on the job board, repair orders, DVIs, live dashboard, Daily Outline, and daily profitable reports for owners and lead advisors.",
  },
  PROFESSIONAL: {
    headline: "In-depth team training included",
    sessions: "Team training program",
    description:
      "Everything in Core, plus role-based sessions for advisors, techs, and marketing — licensed labor data, booking, SMS, campaigns, and reviews.",
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
    description: "Repair orders, job board, customers, vehicles, estimates, tech board, inventory.",
    icon: "wrench" as const,
    pricingNote: "All monthly tiers",
  },
  {
    id: "dvi",
    name: "DVIs",
    description:
      "Digital vehicle inspections with MPI templates, photo markup, red/yellow/green ratings, and customer share links.",
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
      "Labor AI on every tier. MOTOR labor data is +$50/mo on Core and included on Pro and Elite, which also add ShopRally licensed flat-rate data.",
    icon: "wrench" as const,
    pricingNote: "Labor AI all tiers · MOTOR +$50 on Core · included on Pro+",
  },
  {
    id: "insights",
    name: "Live dashboard",
    description:
      "Live KPI dashboard, Daily Outline shop-day snapshots, and daily profitable reports — included on every plan.",
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
    description: "On-page SEO, JSON-LD, Search Console, local search, and SEO Autopilot runs every month.",
    icon: "search" as const,
    pricingNote: "$129/mo + launch setup · Elite included",
  },
  {
    id: "subscriptions",
    name: "Maintenance subscriptions",
    description: "Shop-level maintenance programs, member portal, Stripe billing, and counter enrollment.",
    icon: "repeat" as const,
    pricingNote: "Elite only",
  },
  {
    id: "growth",
    name: "Growth Engine",
    description: "Online booking, SMS/email campaigns, automations, Google Reviews, and review management.",
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
    monthlyCents: 9900,
    priceLabel: "$99/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.shopsite.setupCents,
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
    description:
      "On-page SEO, structured data (JSON-LD), Search Console monitoring, Google Business guidance, and SEO Autopilot runs.",
    savingsNote: "SEO agency retainers often start at $500+/mo.",
  },
  {
    id: "web-seo-bundle-monthly",
    name: "Website + SEO bundle",
    monthlyCents: 19900,
    priceLabel: "$199/mo",
    setupCents: WEB_PRESENCE_LAUNCH_SETUP.bundle.setupCents,
    description: "ShopSite and Local SEO together — full web presence on two subscriptions billed as one.",
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
    id: "motor-labor",
    name: "MOTOR labor data",
    priceLabel: "$50/mo",
    description:
      "Licensed MOTOR flat-rate guides and procedures in the estimate. Included on Pro and Elite.",
    tiers: "starter+",
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
  cannedJobs: true,
  partsTech: false,
  laborGuide: true,
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
  advancedReports: true,
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

const EliteFeatures: PlanFeatureSet = {
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

/** Canonical plan catalog — premium tiers vs legacy & budget stacks. */
export const PLANS: Record<ShopPlan, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Core",
    subtitle: "Essentials",
    tagline: "Core shop CRM — job board, DVIs, dashboard & training included.",
    monthlyCents: 11900,
    annualMonthlyCents: 10900,
    valueNote: "Core CRM · live dashboard on every plan · in-depth training included",
    savingsNote: "Core CRM · live dashboard on every plan · in-depth training included",
    pricingCard: {
      bestFor: "Single-bay shops going cloud-first",
      bullets: [
        "ShopRally CRM suite",
        "Unlimited users",
        "Unlimited repair orders & estimates",
        "Digital estimates & invoices via email",
        "Job board",
        "Canned jobs",
        "Digital vehicle inspections",
        "Operations Daily Snapshot",
        "MOTOR labor data — $50/mo extra",
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
        "License plate & VIN decoding",
        "OEM service specs",
        "OEM fluid capacities",
        "Parts, inventory & PartsTech",
        "Two-way SMS",
        "Online booking",
        "Growth Engine — automations & win-back campaigns",
        "Google review management",
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
      bestFor: "Shops ready for AI, web, SEO & maintenance programs",
      includesPrevious: "PROFESSIONAL",
      bullets: [
        "AI receptionist + review reply drafting",
        `ShopSite & Local SEO included ($${webPresenceAlaCarteMonthlyDollars()}/mo value)`,
        "Maintenance subscription programs",
        "AI SEO content & campaign drafting",
        `${PLAN_TRAINING.ENTERPRISE.sessions} · migration included`,
      ],
    },
    features: EliteFeatures,
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
      note: "Core premium CRM · live dashboard · Daily Outline · Labor AI · in-depth training",
      repairPilot: true,
    },
    {
      name: `ShopRally ${PLANS.PROFESSIONAL.name}`,
      planId: "PROFESSIONAL",
      crmLabel: "Bundled",
      marketingLabel: "Included",
      stackTotal: professional,
      note: `CRM + Growth Engine + licensed labor data · premium all-in-one · team training included`,
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
    label: "Digital vehicle inspections (DVIs)",
    values: DVI_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "MPI templates & R/Y/G ratings",
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
    label: "Parts catalog (PartsTech) & inventory",
    values: { STARTER: false, PROFESSIONAL: true, ENTERPRISE: true },
  },
  {
    label: "License plate & VIN decoding",
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
    values: { STARTER: "$50/mo extra", PROFESSIONAL: true, ENTERPRISE: true },
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
      STARTER: "$99/mo add-on",
      PROFESSIONAL: "$99/mo add-on",
      ENTERPRISE: "Included",
    },
  },
  {
    label: "Local SEO + Autopilot",
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
    label: "Maintenance subscription programs",
    category: "Subscriptions",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Member portal & shop-level billing",
    values: { STARTER: false, PROFESSIONAL: false, ENTERPRISE: true },
  },
  {
    label: "Live dashboard",
    category: "Insights",
    values: DASHBOARD_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Daily Outline (shop-day snapshot)",
    values: DASHBOARD_PLAN_COPY.comparisonAllTiers,
  },
  {
    label: "Daily profitable reports",
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

/** ShopRally Elite monthly price for comparison callouts. */
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

/** List (monthly) price — shown struck-through when annual billing is selected. */
export function planListPrice(plan: PlanDefinition): string {
  return `$${(plan.monthlyCents / 100).toFixed(0)}`;
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
    a: "Core for a lean single-bay shop getting off paper — Labor AI included; MOTOR labor data is +$50/mo (included on Pro). Pro when you want MOTOR, licensed labor data, license plate & VIN decoding, OEM specs & fluids, booking, SMS, and campaigns. Elite when you want AI receptionist, ShopSite, Local SEO, and maintenance programs in one bill.",
  },
  {
    q: "How does ShopSite and SEO pricing work?",
    a: "ShopSite ($99/mo) and Local SEO ($129/mo) are separate monthly subscriptions on any CRM tier. Subscribe to both for $199/mo with the bundle. A one-time launch setup applies when each service starts ($349 ShopSite, $299 Local SEO, or $549 bundle). Elite includes monthly fees and launch setup.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade or downgrade anytime. Changes take effect immediately and billing is prorated.",
  },
  {
    q: "Is there a setup fee?",
    a: "No setup fee on CRM plans. ShopSite and Local SEO add-ons have a one-time launch setup when you first subscribe ($349 / $299, or $549 for the bundle). Elite includes launch setup. Optional white-glove data migration is $399 one-time (also included on Elite).",
  },
  {
    q: "What's included in the founding-shop pricing?",
    a: "Founding shops lock in launch rates on annual billing before we raise public pricing. Spots are limited.",
  },
  {
    q: "Are digital vehicle inspections (DVIs) included?",
    a: DVI_PLAN_COPY.faqAnswer,
  },
  {
    q: "What's included in the live dashboard?",
    a: DASHBOARD_PLAN_COPY.faqAnswer,
  },
  {
    q: "What's included in Labor AI vs licensed labor data?",
    a: LABOR_PLAN_COPY.faqAnswer,
  },
  {
    q: "What are MOTOR labor guides?",
    a: "MOTOR labor data is licensed flat-rate guides and procedures in the estimate. On Core it’s +$50/mo; on Pro and Elite it’s included, along with ShopRally licensed labor data and Labor AI.",
  },
  {
    q: "Do you integrate with PartsTech and QuickBooks?",
    a: "PartsTech and Stripe Connect are on Pro and Elite. QuickBooks integration is on our roadmap — contact us for timeline.",
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
    a: "Yes — every plan includes in-depth training. Core includes two live go-live sessions. Pro adds a team training program for advisors, techs, and marketing. Elite includes a dedicated onboarding specialist and white-glove training across AI, maintenance programs, ShopSite, and Local SEO.",
  },
  {
    q: "Can I switch from another shop system?",
    a: "Yes. We offer optional white-glove migration ($399 one-time, included on Elite) and founding shops get priority onboarding help.",
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
