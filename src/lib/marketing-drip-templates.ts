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

Thanks for joining the ShopRally founding shop waitlist.

You're in line for:
• Early access before public launch
• Founding-shop pricing locked for life (annual billing)
• In-depth training included on every plan tier
• White-glove migration from your current system

We'll email you when onboarding slots open. Want to skip the line? Reply to this email or book a 30-minute walkthrough: https://getshoprally.com/demo

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
• ${PLANS.STARTER.name} ($${shoprallyStarterMonthly(true)}/mo annual): full shop CRM · DVIs · daily snapshot
• AI Plus (+$20/mo): freeform AI intake, labor assist & advisor app
${PHASE_ONE_LAUNCH ? "• Pro & Elite tiers — licensed MOTOR, Growth Engine, payments — coming in phase two" : `• ${PLANS.PROFESSIONAL.name}: licensed MOTOR + Growth Engine + reviews\n• ${PLANS.ENTERPRISE.name}: AI, ShopSite, Local SEO, maintenance programs`}

Founding spots are limited. Compare plans: https://getshoprally.com/pricing

— ShopRally`,
  },
  {
    id: "launch-soon",
    dayOffset: 21,
    subject: "Founding shop onboarding opens soon",
    preview: "Your spot is reserved — next steps inside.",
    body: `Hi {{first_name}},

We're opening founding shop onboarding in the next cohort soon.

If you haven't booked a demo yet, now's the time — we'll map your migration from Tekmetric, Shopmonkey, AutoLeap, or spreadsheets.

Book here: https://getshoprally.com/demo

Questions? Just reply.

— ShopRally`,
  },
];

export function personalizeDripBody(template: string, firstName: string) {
  return template.replace(/\{\{first_name\}\}/g, firstName || "there");
}
