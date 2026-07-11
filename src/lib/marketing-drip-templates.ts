/** Pre-launch email drip copy — paste into Resend or your ESP until automated. */

import {
  PLANS,
  repairPilotAllInMonthly,
  repairPilotOverdriveMonthly,
  repairPilotStarterMonthly,
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
• ${PLANS.STARTER.name} ($${repairPilotStarterMonthly(true)}/mo annual): CRM suite · shop labor library
• ${PLANS.PROFESSIONAL.name} ($${repairPilotAllInMonthly(true)}/mo annual): licensed MOTOR + Growth Engine + reviews
• ${PLANS.ENTERPRISE.name} ($${repairPilotOverdriveMonthly(true)}/mo annual): AI, ShopSite, Local SEO, maintenance programs
• Optional ShopSite ($99/mo) + Local SEO ($129/mo) — included on ${PLANS.ENTERPRISE.name}

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
