"use client";

import Link from "next/link";
import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  Globe,
  MessageSquare,
  Package,
  Search,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import { HeroPlatformPreview } from "@/components/marketing-site/hero-platform-preview";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { Button } from "@/components/ui/button";
import { MARKETING_LAUNCH } from "@/lib/marketing-launch";
import { COMPETITOR_BENCHMARK, DVI_PLAN_COPY, LABOR_PLAN_COPY, PLANS, repairPilotAllInMonthly, repairPilotOverdriveMonthly } from "@/lib/plans";

const MODULES = [
  {
    icon: Wrench,
    title: "Shop management",
    description:
      "Repair orders, job board, canned jobs, parts, inventory, and tech board — DVIs included on every plan.",
    items: ["Kanban job board", DVI_PLAN_COPY.featuresAllTiers, "Live dashboard & Daily Outline", "In-depth training included"],
    accent: "from-brand-navy/10 to-brand-light/10 border-brand-navy/20",
  },
  {
    icon: Zap,
    title: "Payments & POS",
    description:
      "Build estimates fast with Labor AI on Core, or licensed flat-rate data plus Labor AI on Pro+. Send approval links by SMS, invoice, and collect through Stripe Connect.",
    items: ["Text-to-approve estimates", "Stripe Connect payouts", "Invoice sharing", LABOR_PLAN_COPY.featuresIgnition],
    accent: "from-brand-light/10 to-brand-light/20 border-brand-light/30",
  },
  {
    icon: Star,
    title: "Growth Engine",
    description:
      "Marketing built in — booking, SMS, campaigns, and review management on Pro. Full AI suite on Elite.",
    items: ["Online booking", "SMS campaigns", "Review management", `AI Google Reviews on ${PLANS.ENTERPRISE.name}`],
    accent: "from-brand-light/20 to-brand-light/5 border-brand-light/50",
  },
  {
    icon: Globe,
    title: "Website & SEO",
    description:
      "Two separate monthly subscriptions — ShopSite for your hosted website and Local SEO for rankings, Search Console, and Autopilot.",
    items: ["ShopSite $59/mo", "Local SEO $79/mo", "Bundle $119/mo", `Launch setup included on ${PLANS.ENTERPRISE.name}`],
    accent: "from-brand-navy/5 to-white border-brand-navy/15",
  },
] as const;

const HIGHLIGHTS = [
  { icon: Calendar, label: "Appointments" },
  { icon: MessageSquare, label: "Two-way SMS" },
  { icon: ClipboardCheck, label: "Inspections" },
  { icon: Package, label: "Inventory" },
  { icon: Globe, label: "ShopSite" },
  { icon: Search, label: "Local SEO" },
  { icon: BarChart3, label: "Live dashboard & Daily Outline" },
] as const;

export function FeaturesPageContent() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  return (
    <>
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Product</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl lg:text-5xl">
            Premium shop software — one platform
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Between legacy desktop CRM and budget bolt-on stacks — ShopRally connects CRM, payments,
            marketing, and maintenance with training included on every tier.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm font-medium text-brand-navy">
            {PLANS.PROFESSIONAL.name}: ${repairPilotAllInMonthly(true)}/mo · {PLANS.ENTERPRISE.name}: $
            {repairPilotOverdriveMonthly(true)}/mo · vs ~${COMPETITOR_BENCHMARK.legacy.typicalMonthly}/mo legacy
            stacks
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-navy" asChild>
              <Link href={preLaunch ? MARKETING_LAUNCH.primaryHref : "/signup"}>
                {preLaunch ? MARKETING_LAUNCH.primaryCta : "Start free trial"}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-brand-navy text-brand-navy" asChild>
              <Link href={MARKETING_LAUNCH.secondaryHref}>
                {preLaunch ? MARKETING_LAUNCH.secondaryCta : "Book a demo"}
              </Link>
            </Button>
          </div>
          <div className="mx-auto mt-12 max-w-5xl">
            <HeroPlatformPreview className="mt-0" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.title}
                className={`rounded-2xl border-2 bg-gradient-to-br p-6 sm:p-8 ${mod.accent}`}
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-brand-navy text-white">
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-4 text-xl font-bold text-brand-navy">{mod.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{mod.description}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {mod.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="size-1.5 shrink-0 rounded-full bg-brand-red" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-brand-navy/10 bg-brand-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold">And dozens more capabilities</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div
                  key={h.label}
                  className="flex flex-col items-center rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-center"
                >
                  <Icon className="size-6 text-brand-light" />
                  <p className="mt-2 text-sm font-medium">{h.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-brand-navy">See how it fits your shop</h2>
        <p className="mt-3 text-slate-600">
          Compare plans or talk to our team about migration from Tekmetric, Shopmonkey, AutoLeap, or pen and paper.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="bg-brand-red hover:bg-brand-red/90" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href="/demo">Request demo</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
