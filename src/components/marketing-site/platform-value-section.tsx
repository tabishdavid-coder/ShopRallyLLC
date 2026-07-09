import { Bot, Globe, GraduationCap, MessageSquare, Repeat, Wrench, Zap } from "lucide-react";

import { PLANS } from "@/lib/plans";

const VALUE_PILLARS = [
  {
    icon: Wrench,
    title: "Run the shop",
    description: "Repair orders, job board, inspections, parts, inventory, and reports — connected end to end.",
    tiers: `${PLANS.STARTER.name} & up`,
  },
  {
    icon: Zap,
    title: "Get paid",
    description: "Estimates, text-to-approve links, invoicing, and Stripe Connect payouts.",
    tiers: `${PLANS.PROFESSIONAL.name} & up`,
  },
  {
    icon: MessageSquare,
    title: "Grow locally",
    description: "Online booking, SMS campaigns, Google review sync, and advisor inbox.",
    tiers: `${PLANS.PROFESSIONAL.name}`,
  },
  {
    icon: Globe,
    title: "Get found",
    description: "ShopSite ($59/mo) and Local SEO ($79/mo) — separate subscriptions, or $119/mo bundled. Launch setup once.",
    tiers: `Add-ons or ${PLANS.ENTERPRISE.name} included`,
  },
  {
    icon: Repeat,
    title: "Recurring revenue",
    description: "Maintenance programs with a customer member portal.",
    tiers: PLANS.ENTERPRISE.name,
  },
  {
    icon: GraduationCap,
    title: "In-depth training",
    description:
      "Live go-live sessions on Ignition, team training on Momentum, and a dedicated onboarding specialist on Overdrive — not an extra fee.",
    tiers: "All tiers",
  },
  {
    icon: Bot,
    title: "AI when you need it",
    description: "After-hours receptionist, review replies, campaign drafting, and SEO content.",
    tiers: PLANS.ENTERPRISE.name,
  },
] as const;

export function PlatformValueSection() {
  return (
    <section className="border-y border-brand-navy/10 bg-gradient-to-b from-white to-brand-light/[0.08]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">What you get</p>
          <h2 className="mt-3 text-3xl font-bold text-brand-navy sm:text-4xl">
            One platform for the whole shop
          </h2>
          <p className="mt-4 text-slate-600">
            CRM, marketing, payments, and AI — pick the tier that matches how you operate today.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALUE_PILLARS.map(({ icon: Icon, title, description, tiers }) => (
            <li
              key={title}
              className="rounded-xl border border-brand-navy/10 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-brand-navy/8 text-brand-navy">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-4 font-bold text-brand-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
              <p className="mt-3 text-xs font-semibold text-brand-red">{tiers}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
