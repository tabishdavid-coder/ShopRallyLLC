/**
 * Growth Engine — ShopRally marketing module branding.
 * URLs stay at /marketing/*; user-facing copy uses these names.
 */

import { PLANS } from "@/lib/plans";

export const GROWTH_ENGINE = {
  name: "Growth Engine",
  tagline: "Acquire customers, keep them coming back, and get found locally.",
  upgradeHint: `Growth Engine is included on ${PLANS.PROFESSIONAL.name} and ${PLANS.ENTERPRISE.name} plans.`,
  overdriveHint: `ShopSite ($59/mo), Local SEO ($79/mo), and maintenance programs are included on ${PLANS.ENTERPRISE.name}.`,
} as const;

export type GrowthBundleId = "connect" | "retain" | "presence" | "autopilot";

export const GROWTH_BUNDLES: Record<
  GrowthBundleId,
  { name: string; tagline: string }
> = {
  connect: {
    name: "Connect",
    tagline: "Turn clicks into appointments — booking, outreach, and lead tracking.",
  },
  retain: {
    name: "Retain",
    tagline: "Keep customers coming back — automations, maintenance programs, and reviews.",
  },
  presence: {
    name: "Presence",
    tagline: "Get found in your town — ShopSite plus SEO Autopilot.",
  },
  autopilot: {
    name: "Autopilot",
    tagline: "Managed SEO — audits, content, Search Console, and monthly reports.",
  },
};

export type GrowthProductId =
  | "overview"
  | "outreach"
  | "automations"
  | "booking"
  | "bayCare"
  | "reputationPilot"
  | "shopSite"
  | "seoAutopilot"
  | "leadSources";

export const GROWTH_PRODUCTS: Record<
  GrowthProductId,
  {
    label: string;
    shortDescription: string;
    href: string;
    bundle: GrowthBundleId;
    /** Premium add-on or managed service (for pricing callouts). */
    premium?: boolean;
  }
> = {
  overview: {
    label: "Overview",
    shortDescription: "Growth Engine dashboard and performance snapshot.",
    href: "/marketing",
    bundle: "connect",
  },
  outreach: {
    label: "Outreach",
    shortDescription: "SMS and email campaigns — review requests, reminders, win-back, and promos.",
    href: "/marketing/campaigns",
    bundle: "connect",
  },
  automations: {
    label: "Automations",
    shortDescription: "Triggered messages — confirmations, reminders, reviews, and win-back.",
    href: "/marketing/automations",
    bundle: "retain",
  },
  booking: {
    label: "Book Online",
    shortDescription: "Let customers schedule appointments from your website.",
    href: "/marketing/online-booking",
    bundle: "connect",
  },
  bayCare: {
    label: "Maintenance Programs",
    shortDescription: "VIP oil clubs and subscription packages — sell, track, and redeem.",
    href: "/marketing/maintenance-programs",
    bundle: "retain",
  },
  reputationPilot: {
    label: "Reviews",
    shortDescription: "Connect Google, sync reviews, and respond from one inbox.",
    href: "/marketing/reviews",
    bundle: "retain",
  },
  shopSite: {
    label: "ShopSite",
    shortDescription:
      "Shop microsite with Book + Request service CTAs wired to your CRM — not just a brochure.",
    href: "/marketing/website",
    bundle: "presence",
  },
  seoAutopilot: {
    label: "SEO Autopilot",
    shortDescription: "Automated SEO audits, content, Search Console, and monthly reports.",
    href: "/marketing/seo-automation",
    bundle: "autopilot",
    premium: true,
  },
  leadSources: {
    label: "Lead Sources",
    shortDescription: "Track where new customers and appointments come from.",
    href: "/marketing/lead-sources",
    bundle: "connect",
  },
};

/** Sub-nav tabs (excludes overview — layout handles the hub). */
export const GROWTH_ENGINE_TABS = (
  [
    "outreach",
    "automations",
    "booking",
    "bayCare",
    "reputationPilot",
    "shopSite",
    "seoAutopilot",
    "leadSources",
  ] as const
).map((id) => ({
  id,
  label: GROWTH_PRODUCTS[id].label,
  href: GROWTH_PRODUCTS[id].href,
}));

/** Overview hub cards (includes premium styling for Autopilot). */
export const GROWTH_ENGINE_HUB_CARDS = (
  [
    "outreach",
    "automations",
    "booking",
    "bayCare",
    "reputationPilot",
    "shopSite",
    "seoAutopilot",
    "leadSources",
  ] as const
).map((id) => ({
  ...GROWTH_PRODUCTS[id],
  id,
}));

export function growthEnginePageTitle(productLabel?: string): string {
  if (productLabel) {
    return `${productLabel} — ${GROWTH_ENGINE.name}`;
  }
  return `${GROWTH_ENGINE.name} — ShopRally`;
}

/** Breadcrumb labels — user-facing Growth Engine names for /marketing/* routes. */
export const GROWTH_ENGINE_BREADCRUMBS = {
  hub: GROWTH_ENGINE.name,
  outreach: GROWTH_PRODUCTS.outreach.label,
  reviews: GROWTH_PRODUCTS.reputationPilot.label,
} as const;

/** Billing / plan comparison feature labels. */
export const GROWTH_ENGINE_PLAN_LABELS = {
  core: "Growth Engine (Outreach, automations, maintenance programs, booking)",
  shopSite: "ShopSite — shop microsite & custom domain",
  seoAutopilot: "SEO Autopilot — managed local SEO",
} as const;
