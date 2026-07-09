/**
 * Pre-launch marketing config — flip `preLaunch` to false when GA opens self-serve signup.
 */
import { PLANS, repairPilotAllInMonthly } from "@/lib/plans";

export const MARKETING_LAUNCH = {
  preLaunch: true,
  launchWindowLabel: "Launching 2026",
  foundingProgramLabel: "Founding Shop Program",
  /** Shown in urgency messaging — update manually or wire to lead count later. */
  foundingSpotsTotal: 50,
  foundingSpotsClaimed: 13,
  primaryCta: "Join the waitlist",
  primaryHref: "/launch",
  secondaryCta: "Book early demo",
  secondaryHref: "/demo",
} as const;

export function foundingSpotsRemaining(
  claimed: number = MARKETING_LAUNCH.foundingSpotsClaimed,
) {
  return Math.max(0, MARKETING_LAUNCH.foundingSpotsTotal - claimed);
}

export type FoundingSpotUrgency = "open" | "warm" | "hot" | "critical";

export function getFoundingSpotMessaging(claimed: number) {
  const remaining = foundingSpotsRemaining(claimed);
  const urgency: FoundingSpotUrgency =
    remaining <= 5 ? "critical" : remaining <= 12 ? "hot" : remaining <= 25 ? "warm" : "open";

  return {
    primary:
      remaining <= 5
        ? `Only ${remaining} founding spots left`
        : `${remaining} founding spots remaining`,
    secondary:
      claimed > 0
        ? `${claimed} shop${claimed === 1 ? "" : "s"} already on the waitlist`
        : "Lock founding-shop pricing before public launch",
    urgency,
  };
}

/** AutoLeap-style outcome claims for hero / social proof (marketing copy). */
export const OUTCOME_METRICS = [
  { value: "10+", unit: "hrs/wk", label: "Less admin & double-entry" },
  { value: "30%", unit: "↑", label: "Typical revenue lift shops target" },
  { value: "3×", unit: "", label: "More Google reviews with automation" },
  { value: "1", unit: "login", label: "CRM + marketing + payments" },
] as const;

/** Premium positioning — between legacy desktop CRM and budget add-on stacks. */
export const MARKET_POSITIONING = {
  eyebrow: "Where ShopRally fits",
  headline: "Premium shop software — not legacy, not piecemeal",
  subhead:
    "Legacy systems split workflow across desktop installs and agency retainers. Budget cloud CRMs look cheap until SMS, booking, reviews, and website work stack on. ShopRally is the modern all-in-one — with in-depth training included on every tier.",
  tiers: [
    {
      id: "legacy" as const,
      label: "Legacy CRM",
      summary: "Mitchell, Protractor, desktop-first stacks",
      priceLabel: "$600–900+/mo",
      subPrice: "Labor guides, DVI, marketing & website often separate",
      points: [
        "Desktop installs, slow updates, IT overhead",
        "Marketing, website, and reviews live elsewhere",
        "Integrations require vendor tickets and custom projects",
        "Training is an extra line item — if offered at all",
      ],
    },
    {
      id: "budget" as const,
      label: "Budget cloud + bolt-ons",
      summary: "Garage360, Torque360, entry CRM plus extras",
      priceLabel: "~$279–524/mo",
      subPrice: "CRM + SMS + booking + reviews + agency SEO",
      points: [
        "Sticker prices from $79/mo — until you need growth tools",
        "No native ShopSite, SEO Autopilot, or maintenance programs",
        "AI receptionist and review automation sold separately upstream",
        "Five logins, five invoices, five support contacts",
      ],
    },
    {
      id: "premium" as const,
      label: "ShopRally premium",
      summary: "Cloud CRM, Growth Engine, training & optional full stack",
      priceLabel: "From $219/mo",
      subPrice: "Pro flagship · licensed labor + Growth Engine · Elite full stack",
      points: [
        "In-depth training on Core — team program on Pro, white-glove on Elite",
        "Labor AI on Core · licensed flat-rate data + Labor AI on Pro & Elite",
        "Live dashboard, Daily Outline & daily profitable reports on every plan",
        "DVIs with MPI templates, photo markup & customer share on every plan",
        "Growth Engine on Pro: booking, SMS, campaigns, Google Reviews",
        "Elite adds AI receptionist, ShopSite, Local SEO & maintenance programs",
        "One customer record from job board to invoice to campaign",
      ],
    },
  ],
} as const;

export const FOUNDING_BENEFITS = [
  "Lock founding-shop pricing for life (annual billing)",
  "White-glove migration from Tekmetric, Shopmonkey, or pen & paper",
  "In-depth training included on every plan tier",
  "Direct line to product — your feedback shapes v1",
  "Priority onboarding before public launch",
  "Founding shop badge in our launch story",
] as const;

export const VS_BUDGET_COMPETITORS = [
  {
    category: "Shop CRM & job board",
    shoprally: `${PLANS.PROFESSIONAL.name} — unlimited ROs & users`,
    garage360: "Clever $119/mo · Basic $79 (no DVI)",
    torque360: "Starter ~$90/mo · 5 co-user cap",
  },
  {
    category: "Digital vehicle inspections (DVIs)",
    shoprally: "MPI, photo markup & customer share on every plan",
    garage360: "Clever+ only · Basic has no DVI",
    torque360: "Included on Starter+",
  },
  {
    category: "Live dashboard & daily reports",
    shoprally: "Daily Outline + daily profitable reports on every plan",
    garage360: "Basic reporting on Clever+ · no shop-day snapshot",
    torque360: "Limited dashboards on higher tiers",
  },
  {
    category: "Labor guide & flat-rate data",
    shoprally: `${PLANS.STARTER.name}: Labor AI · ${PLANS.PROFESSIONAL.name}+: licensed data + Labor AI`,
    garage360: "Genius $199/mo for labor guides · no Growth Engine",
    torque360: "Labor on higher tiers · no native marketing stack",
  },
  {
    category: "SMS, booking & campaigns",
    shoprally: `Growth Engine on ${PLANS.PROFESSIONAL.name} ($${repairPilotAllInMonthly(true)}/mo annual)`,
    garage360: "Not included on any CRM tier",
    torque360: "One-way SMS on Starter · two-way on Turbo",
  },
  {
    category: "Review management",
    shoprally: `Google sync & inbox on ${PLANS.PROFESSIONAL.name}`,
    garage360: "Not included",
    torque360: "Auto review mgmt on Turbo (~$180/mo)",
  },
  {
    category: "AI receptionist (SMS + voice)",
    shoprally: `${PLANS.ENTERPRISE.name} — no per-seat AIR fee`,
    garage360: "Not available",
    torque360: "Not available",
  },
  {
    category: "Website + local SEO",
    shoprally: "One-time add-on or included on Elite",
    garage360: "Separate agency / digital marketing",
    torque360: "$999 scheduler add-on · agency SEO separate",
  },
  {
    category: "Maintenance programs",
    shoprally: `Member portal on ${PLANS.ENTERPRISE.name}`,
    garage360: "Not included",
    torque360: "Not included",
  },
] as const;

/** @deprecated Use VS_BUDGET_COMPETITORS — kept for drip templates. */
export const VS_INTEGRATED_STACK = VS_BUDGET_COMPETITORS.map((row) => ({
  category: row.category,
  shoprally: row.shoprally,
  autoleap: `${row.garage360} · ${row.torque360}`,
}));
