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
    shoprally: "One-time add-on or included on Overdrive",
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
