import { Bot, BookOpen, BarChart3, ClipboardCheck, Globe, GraduationCap, MessageSquare, Repeat, Wrench, Zap } from "lucide-react";

import { DASHBOARD_PLAN_COPY, DVI_PLAN_COPY, LABOR_PLAN_COPY, PLANS } from "@/lib/plans";

const VALUE_PILLARS = [
  {
    icon: Wrench,
    title: "Run the shop",
    description: "Repair orders, job board, customers, vehicles, and inventory — connected end to end.",
    tiers: `${PLANS.STARTER.name} & up`,
  },
  {
    icon: ClipboardCheck,
    title: "Digital vehicle inspections",
    description:
      "MPI templates, photo markup on findings, red/yellow/green ratings, and customer share links — on every plan.",
    tiers: DVI_PLAN_COPY.featuresAllTiers,
  },
  {
    icon: BookOpen,
    title: "Labor & vehicle data",
    description:
      "Licensed MOTOR on Pro and Elite. Core includes 100 VIN & plate decodes / mo ($10 per extra 100); Pro and Elite are unlimited, with OEM specs and fluid capacities on Pro+.",
    tiers: LABOR_PLAN_COPY.featuresIgnition,
  },
  {
    icon: BarChart3,
    title: "Operations Daily Snapshot",
    description:
      "See today's and upcoming shop activity at a glance — ROs, appointments, and the work ahead.",
    tiers: DASHBOARD_PLAN_COPY.featuresAllTiers,
  },
  {
    icon: Zap,
    title: "Get paid",
    description: "Digital estimates & invoices via email, approval links, and Stripe Connect on Pro+.",
    tiers: `${PLANS.STARTER.name} email · ${PLANS.PROFESSIONAL.name}+ payments`,
  },
  {
    icon: MessageSquare,
    title: "Grow locally",
    description: "Two-way SMS, online booking, Growth Engine automations & win-back, and Google review management.",
    tiers: `${PLANS.PROFESSIONAL.name}`,
  },
  {
    icon: Globe,
    title: "Get found",
    description: "ShopSite ($99/mo) and Local SEO ($129/mo) — separate subscriptions, or $199/mo bundled. Launch setup once.",
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
    title: "White-glove onboarding",
    description:
      "Dedicated onboarding specialist and migration included on Elite — Core and Pro are self-serve with demo support.",
    tiers: PLANS.ENTERPRISE.name,
  },
  {
    icon: Bot,
    title: "AI when you need it",
    description: "After-hours receptionist, review reply drafting, campaign drafting, and SEO content.",
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
            Premium platform — pick your tier
          </h2>
          <p className="mt-4 text-slate-600">
            CRM, marketing, payments, and AI — with live training included from day one, not sold as an
            onboarding upsell.
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
