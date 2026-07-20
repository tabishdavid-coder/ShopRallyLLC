/** Pre-launch email drip copy — paste into Resend or your ESP until automated. */

import {
  PLANS,
  PHASE_ONE_LAUNCH,
  shoprallyStarterMonthly,
} from "@/lib/plans";

export type MarketingDripEmail = {
  id: string;
  dayOffset: number;
  subject: string;
  preview: string;
  body: string;
};

export const FOUNDING_WAITLIST_DRIP: MarketingDripEmail[] = [
  {
    id: "welcome",
    dayOffset: 0,
    subject: "You're on the ShopRally founding shop list",
    preview: "Thanks for joining — here's what happens next.",
    body: `Hi {{first_name}},

Thanks for reserving a ShopRally founding seat.

Ignition launches in Q4 2026 — you don't have software access yet. You're one of 50 founding shops in line for:
• Invite at Q4 2026 launch (not instant access)
• Founding-shop pricing locked for life (annual billing)
• Priority onboarding when we open
• A say in what we ship next

We'll email you at launch. Want a product preview first? Book a walkthrough: https://getshoprally.com/demo

— The ShopRally team`,
  },
  {
    id: "week-1",
    dayOffset: 7,
    subject: "What ShopRally replaces (and what you keep)",
    preview: "One login vs CRM + marketing + AI add-ons.",
    body: `Hi {{first_name}},

Quick snapshot of why shops are switching to ShopRally:

• Job board + estimates + Operations Daily Snapshot in one CRM
• Digital vehicle inspections on every plan
• ${PLANS.STARTER.name} ($${shoprallyStarterMonthly(true)}/mo annual): full shop CRM · digital vehicle inspections · daily snapshot
• AI Plus (+$49.99/mo): freeform AI intake, labor assist & advisor app
${PHASE_ONE_LAUNCH ? "• Pro & Elite tiers — licensed MOTOR, Growth Engine, payments — coming in phase two\n• Website & SEO (ShopSite + Local SEO) — separate companion offer at launch" : `• ${PLANS.PROFESSIONAL.name}: licensed MOTOR + Growth Engine + reviews\n• ${PLANS.ENTERPRISE.name}: AI, maintenance programs · ShopSite/Local SEO also à la carte`}

Only 50 founding spots for the Q4 2026 launch. Compare plans: https://getshoprally.com/pricing

— ShopRally`,
  },
  {
    id: "launch-soon",
    dayOffset: 21,
    subject: "Founding shop onboarding opens soon",
    preview: "Your spot is reserved — next steps inside.",
    body: `Hi {{first_name}},

ShopRally Ignition launches Q4 2026. Your founding seat is reserved — software isn't live yet.

If you haven't booked a preview demo, now's a good time — we'll map your migration from Tekmetric, Shopmonkey, AutoLeap, or spreadsheets.

Book here: https://getshoprally.com/demo

Questions? Just reply.

— ShopRally`,
  },
];

export function personalizeDripBody(template: string, firstName: string) {
  return template.replace(/\{\{first_name\}\}/g, firstName || "there");
}
