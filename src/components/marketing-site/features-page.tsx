"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Package,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { AiPlusShowcase } from "@/components/marketing-site/ai-plus-showcase";
import { ProductUiShowcase } from "@/components/marketing-site/product-ui-showcase";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { Button } from "@/components/ui/button";
import {
  AI_PLUS_MARKETING,
  CATEGORY_POSITIONING,
  HOW_SHOPRALLY_WORKS,
  MARKETING_LAUNCH,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import {
  PHASE_ONE_LAUNCH,
  PLANS,
  aiPlusPriceLabel,
  planMarketingDisplayName,
  shoprallyStarterPricePairLabel,
} from "@/lib/plans";

const ignitionName = planMarketingDisplayName(PLANS.STARTER);

const MODULES = [
  {
    icon: Wrench,
    title: "Shop CRM & job board",
    description:
      "All-in-one shop management for the floor: repair orders, kanban job board, PartsTech parts on the estimate, customers, vehicles, and inventory — connected from concern to invoice.",
    items: [
      "Unlimited users & repair orders",
      "Kanban job board (Estimates / WIP / Completed)",
      "Full RO workspace with canned jobs",
      "PartsTech catalog & punchout — included with Ignition",
      "Shop labor library (not licensed MOTOR)",
    ],
  },
  {
    icon: ClipboardCheck,
    title: "Inspections & approvals",
    description:
      "Digital vehicle inspections with photo checklists customers can see, plus email estimate and approval links — so the yes happens without phone tag.",
    items: [
      "Digital vehicle inspections (photo checklists customers can see)",
      "Email estimates & approval links",
      "Digital invoices via email",
      "Manual payment recording in-shop",
    ],
  },
  {
    icon: BarChart3,
    title: "Day-to-day operations",
    description:
      "See today’s work, keep appointments on the calendar, and track what’s owed — cloud shop CRM without a second system.",
    items: [
      "Live Operations Daily Snapshot",
      "Appointments",
      "Payment tracking",
      "Unlimited NHTSA VIN decode",
    ],
  },
  {
    icon: Sparkles,
    title: "AI Plus (recommended)",
    description: AI_PLUS_MARKETING.subhead,
    items: [
      "Freeform RO intake",
      "Labor-hour assist",
      "Advisor mobile app",
      "Less double-entry at the counter",
    ],
  },
] as const;

const HIGHLIGHTS = [
  { icon: Calendar, label: "Appointments" },
  { icon: Mail, label: "Email share & approve" },
  { icon: ClipboardCheck, label: "Inspections" },
  { icon: Package, label: "PartsTech punchout" },
  { icon: BookOpen, label: "Canned jobs" },
  { icon: Users, label: "Unlimited users" },
  { icon: BarChart3, label: "Daily Snapshot" },
] as const;

const COMING_LATER = [
  "Licensed MOTOR · Stripe Connect",
  "Two-way SMS · online booking · Growth Engine",
  "AI receptionist · Elite AI suite",
  "Maintenance / care programs",
] as const;

export function FeaturesPageContent() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const pricePair = shoprallyStarterPricePairLabel();

  return (
    <>
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            {CATEGORY_POSITIONING.categoryLine}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl lg:text-5xl">
            Auto repair shop management features — {ignitionName}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            {CATEGORY_POSITIONING.categoryLine} for independents: job board, PartsTech catalog &amp;
            punchout, digital vehicle inspections, email estimates &amp; approvals, appointments,
            payment tracking, and Live Operations Daily Snapshot — {CATEGORY_POSITIONING.productLine}.
            PartsTech is included with Ignition at launch.
            {preLaunch ? ` Launching ${MARKETING_LAUNCH.launchQuarter}.` : ""}
          </p>
          {PHASE_ONE_LAUNCH ? (
            <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-brand-navy">
              {ignitionName} — {pricePair} · AI Plus recommended {aiPlusPriceLabel()}
            </p>
          ) : null}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-navy" asChild>
              <Link href={`${marketingPrimaryHref(preLaunch)}?ai=1`}>
                {AI_PLUS_MARKETING.ctaWithAi}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-brand-navy text-brand-navy" asChild>
              <Link href={marketingSecondaryHref(preLaunch)}>
                {marketingSecondaryCta(preLaunch)}
              </Link>
            </Button>
          </div>
          <div className="mx-auto mt-12 max-w-5xl text-left">
            <ProductUiShowcase />
          </div>
        </div>
      </section>

      <AiPlusShowcase />

      <MarketPositioningSection />

      <section className="border-y border-brand-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center lg:max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              {HOW_SHOPRALLY_WORKS.eyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">
              {HOW_SHOPRALLY_WORKS.headline}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {HOW_SHOPRALLY_WORKS.subhead}
            </p>
          </div>
          <ol className="mt-10 grid gap-6 lg:grid-cols-3">
            {HOW_SHOPRALLY_WORKS.steps.map((step) => (
              <li
                key={step.title}
                className="rounded-2xl border border-brand-navy/15 bg-brand-light/10 p-6"
              >
                <span className="text-xs font-bold tabular-nums tracking-wider text-brand-red">
                  {step.step}
                </span>
                <h3 className="mt-3 text-lg font-bold text-brand-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            With {ignitionName}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-brand-navy">
            Shop CRM modules inside Ignition
          </h2>
          <p className="mt-3 text-slate-600">
            What founding shops get in the all-in-one auto repair shop management plan — not a
            bolt-on maze.{" "}
            <Link href="/pricing" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
              See Ignition pricing
            </Link>
            .
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className="rounded-2xl border border-brand-navy/15 bg-white p-6 shadow-sm"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-brand-navy">{mod.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{mod.description}</p>
                <ul className="mt-4 space-y-2">
                  {mod.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-brand-navy/10 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap justify-center gap-3">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.label}
                  className="inline-flex items-center gap-2 rounded-full border border-brand-navy/15 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
                >
                  <Icon className="size-4" />
                  {h.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="coming-later" className="scroll-mt-20 bg-brand-navy text-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
            Coming later · Pro &amp; Elite
          </p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Not on {ignitionName} at launch</h2>
          <p className="mt-3 text-white/75">
            Roadmap only — not sold with founding Ignition seats. We&apos;ll open Pro and Elite when
            they&apos;re ready, not before.
          </p>
          <ul className="mx-auto mt-8 grid max-w-xl gap-2 text-left sm:grid-cols-1">
            {COMING_LATER.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-brand-navy">
          Next: pricing, walkthrough, or a founding seat
        </h2>
        <p className="mt-3 text-slate-600">
          Review {ignitionName} shop management software pricing, watch how the bay workflow runs,
          or reserve a founding seat for {MARKETING_LAUNCH.launchQuarter}. Switching from another
          platform? See{" "}
          <Link href="/compare" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
            ShopRally vs Tekmetric, Garage360, Torque360, and more
          </Link>
          .
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="bg-brand-red hover:bg-brand-red/90" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href={marketingSecondaryHref(preLaunch)}>{marketingSecondaryCta(preLaunch)}</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href={marketingPrimaryHref(preLaunch)}>Reserve a founding seat</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/" className="font-medium text-brand-navy underline-offset-2 hover:underline">
            Back to ShopRally home
          </Link>
          {" · "}
          <Link href="/compare" className="font-medium text-brand-navy underline-offset-2 hover:underline">
            Compare alternatives
          </Link>
        </p>
      </section>
    </>
  );
}
