import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  Mail,
  Package,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import {
  DASHBOARD_PLAN_COPY,
  DVI_PLAN_COPY,
  PHASE_ONE_LAUNCH,
  PLANS,
  aiPlusPriceLabel,
  planMarketingDisplayName,
} from "@/lib/plans";

const ignitionName = planMarketingDisplayName(PLANS.STARTER);

/** Launch pillars — Ignition only. */
const VALUE_PILLARS = [
  {
    icon: Wrench,
    title: "Run the shop",
    description: "Repair orders, job board, customers, vehicles, and inventory — connected end to end.",
    tiers: ignitionName,
  },
  {
    icon: Package,
    title: "PartsTech on the estimate",
    description:
      "Search supplier catalogs and punch parts onto the RO — included with Ignition at launch, not a bolt-on.",
    tiers: `${ignitionName} · included`,
  },
  {
    icon: ClipboardCheck,
    title: "Digital vehicle inspections",
    description:
      "Multi-point photo checklists customers can see — markup on findings, red/yellow/green ratings, and share links.",
    tiers: DVI_PLAN_COPY.featuresAllTiers,
  },
  {
    icon: BookOpen,
    title: "Canned jobs & shop labor",
    description:
      "Build estimates from your shop labor library and canned jobs. Licensed MOTOR stays on the Pro roadmap.",
    tiers: ignitionName,
  },
  {
    icon: BarChart3,
    title: "Operations Daily Snapshot",
    description:
      "See today's and upcoming shop activity at a glance — ROs, appointments, and the work ahead.",
    tiers: DASHBOARD_PLAN_COPY.featuresAllTiers,
  },
  {
    icon: Mail,
    title: "Email estimates & invoices",
    description:
      "Send approval and invoice links by email. Manual payment recording in-shop. Card collect via Stripe Connect comes later on Pro.",
    tiers: ignitionName,
  },
  {
    icon: Calendar,
    title: "Appointments",
    description: "Keep the calendar tied to customers, vehicles, and repair orders.",
    tiers: ignitionName,
  },
  {
    icon: Users,
    title: "Unlimited users & ROs",
    description: "No seat tax for advisors and techs. One Ignition price per location.",
    tiers: ignitionName,
  },
  {
    icon: Sparkles,
    title: "AI Plus (recommended)",
    description: `Paste a note → draft RO. Labor assist + advisor app — ${aiPlusPriceLabel()} on Ignition.`,
    tiers: `Recommended · ${aiPlusPriceLabel()}`,
  },
] as const;

export function PlatformValueSection() {
  return (
    <section className="border-y border-brand-navy/10 bg-gradient-to-b from-white to-brand-light/[0.08]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            What&apos;s in the all-in-one
          </p>
          <h2 className="mt-3 text-3xl font-bold text-brand-navy sm:text-4xl">
            {PHASE_ONE_LAUNCH
              ? `${ignitionName} — launching Q4 2026`
              : "Premium platform — pick your tier"}
          </h2>
          <p className="mt-4 text-slate-600">
            {PHASE_ONE_LAUNCH
              ? "All-in-one auto repair shop management software for the bay and counter: estimates, PartsTech, digital vehicle inspections, job board, appointments, and live ops — without selling later-roadmap modules as if they're live today."
              : "CRM, marketing, payments, and AI — with live training included from day one."}
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
