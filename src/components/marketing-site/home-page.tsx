"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Globe,
  MessageSquare,
  Shield,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import { HeroPlatformPreview } from "@/components/marketing-site/hero-platform-preview";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { PlatformValueSection } from "@/components/marketing-site/platform-value-section";
import { FoundingWaitlistForm } from "@/components/marketing-site/founding-waitlist-form";
import { OutcomeMetricsStrip } from "@/components/marketing-site/outcome-metrics-strip";
import { Button } from "@/components/ui/button";
import { getFoundingSpotMessaging, MARKETING_LAUNCH } from "@/lib/marketing-launch";
import { cn } from "@/lib/utils";
import { PLANS, DVI_PLAN_COPY, LABOR_PLAN_COPY, DASHBOARD_PLAN_COPY, PHASE_ONE_COPY, PHASE_ONE_LAUNCH, planMarketingDisplayName, shoprallyStarterMonthly } from "@/lib/plans";

const PILLARS = [
  {
    icon: Wrench,
    title: "Run your shop",
    description:
      "Repair orders, job board, canned jobs, and DVIs — licensed MOTOR on Pro+.",
    accent: "border-brand-navy/20 bg-brand-navy/5",
    iconBg: "bg-brand-navy text-white",
  },
  {
    icon: Zap,
    title: "Get paid faster",
    description:
      "Estimates, approval links, invoicing, and Stripe Connect payments. Customers approve from their phone.",
    accent: "border-brand-light/30 bg-brand-light/10",
    iconBg: "bg-brand-light text-brand-navy",
  },
  {
    icon: Sparkles,
    title: "Keep customers coming back",
    description:
      "Online booking, SMS campaigns, Google reviews, and maintenance programs — your Growth Engine built in.",
    accent: "border-brand-light/40 bg-brand-light/15",
    iconBg: "bg-brand-navy text-white",
  },
] as const;

const FEATURES = [
  { icon: Calendar, label: "Appointments & online booking" },
  { icon: BookOpen, label: "Licensed MOTOR on Pro+" },
  { icon: MessageSquare, label: "Two-way SMS & Growth Engine" },
  { icon: Globe, label: "ShopSite & Local SEO" },
  { icon: BarChart3, label: "Operations Daily Snapshot" },
  { icon: Shield, label: "Digital vehicle inspections" },
  { icon: Star, label: "Maintenance subscriptions" },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "We finally have one system for the front counter, the bays, and marketing — without stacking five different tools.",
    role: "Independent shop owner",
    metric: "3× faster estimates",
  },
  {
    quote:
      "They launched our website and SEO setup in a week. Customers find us on Google now — and book online.",
    role: "Shop owner, 4-bay independent",
    metric: "+40% online bookings",
  },
  {
    quote:
      "Customers approve jobs from a text link. That alone paid for the software in the first month.",
    role: "Service advisor",
    metric: "+28% approval rate",
  },
] as const;

const TESTIMONIAL_STYLES = [
  {
    card: "border-brand-navy/20 bg-gradient-to-br from-brand-navy/[0.07] via-white to-brand-light/15 shadow-lg shadow-brand-navy/10",
    stripe: "bg-brand-navy",
    metric: "bg-brand-navy text-white",
  },
  {
    card: "border-brand-light/50 bg-gradient-to-br from-brand-light/25 via-white to-brand-light/10 shadow-lg shadow-brand-light/20",
    stripe: "bg-brand-light",
    metric: "border border-brand-light/60 bg-brand-light/20 text-brand-navy",
  },
  {
    card: "border-brand-red/25 bg-gradient-to-br from-brand-red/[0.06] via-white to-brand-navy/[0.04] shadow-lg shadow-brand-red/10",
    stripe: "bg-brand-red",
    metric: "bg-brand-red/12 text-brand-red",
  },
] as const;

export function HomePageContent({ foundingSpotsClaimed = 0 }: { foundingSpotsClaimed?: number }) {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const foundingMessaging = getFoundingSpotMessaging(foundingSpotsClaimed);

  return (
    <>
      {/* Hero — centered copy, one preview below */}
      <section className="relative overflow-hidden border-b border-brand-navy/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,var(--brand-light)/35,transparent)]" />

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-red/25 bg-brand-red/5 px-4 py-1.5 text-xs font-semibold text-brand-red">
              <Star className="size-3.5 fill-brand-red" />
              {preLaunch ? foundingMessaging.primary : "Founding-shop pricing available"}
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
              {preLaunch ? (
                <>
                  Shop software built for{" "}
                  <span className="bg-gradient-to-r from-brand-navy to-brand-light bg-clip-text text-transparent">
                    growth
                  </span>
                </>
              ) : (
                <>
                  Premium shop software for{" "}
                  <span className="bg-gradient-to-r from-brand-navy to-brand-light bg-clip-text text-transparent">
                    CRM, growth &amp; AI
                  </span>
                </>
              )}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              {preLaunch
                ? "Between legacy desktop CRM and budget add-on stacks — one modern platform from job board to invoice."
                : PHASE_ONE_LAUNCH
                  ? `${PHASE_ONE_COPY.subhead} ${planMarketingDisplayName(PLANS.STARTER)} from $${shoprallyStarterMonthly(true)}/mo — AI Plus optional +$20/mo.`
                  : `Premium all-in-one for independents — ${PLANS.STARTER.name} from $${shoprallyStarterMonthly(true)}/mo.`}
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" className="min-w-44 gap-2 bg-brand-navy hover:bg-brand-navy/90" asChild>
                <Link href={preLaunch ? MARKETING_LAUNCH.primaryHref : "/signup"}>
                  {preLaunch ? MARKETING_LAUNCH.primaryCta : "Start 14-day trial"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-w-44 border-brand-navy/30 text-brand-navy hover:bg-brand-light/20"
                asChild
              >
                <Link href={MARKETING_LAUNCH.secondaryHref}>
                  {preLaunch ? MARKETING_LAUNCH.secondaryCta : "Book a demo"}
                </Link>
              </Button>
            </div>

            {preLaunch ? (
              <div className="mx-auto mt-8 max-w-xl">
                <FoundingWaitlistForm variant="compact" />
              </div>
            ) : null}
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <HeroPlatformPreview className="mt-0" />
          </div>
        </div>
      </section>

      <OutcomeMetricsStrip />

      <MarketPositioningSection />

      {/* Three pillars */}
      <section id="product" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">One platform</p>
          <h2 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">
            Enterprise-grade workflow. Training included.
          </h2>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className={cn("rounded-2xl border-2 p-6 transition-shadow hover:shadow-lg", pillar.accent)}
              >
                <div className={cn("flex size-11 items-center justify-center rounded-xl", pillar.iconBg)}>
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-brand-navy">{pillar.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{pillar.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-brand-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Shop management</p>
              <h2 className="mt-2 text-3xl font-bold text-brand-navy">
                Built for how repair shops actually work
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                From the first phone call to the final payment — repair orders, licensed MOTOR on Pro+, and
                customer history stay connected. No re-entry between systems.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  DASHBOARD_PLAN_COPY.featuresAllTiers,
                  DVI_PLAN_COPY.featuresAllTiers,
                  LABOR_PLAN_COPY.featuresIgnition,
                  "Job board, canned jobs & email estimates on Ignition",
                  "100 VIN/plate decodes on Ignition · unlimited on Pro+ (coming)",
                  PHASE_ONE_LAUNCH
                    ? "AI Plus add-on — freeform intake & advisor app (+$20/mo)"
                    : "Stripe Connect & two-way SMS on Pro+",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 bg-brand-navy" asChild>
                <Link href="/features">Explore features</Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.label}
                    className="rounded-xl border border-brand-navy/10 bg-brand-light/10 p-4"
                  >
                    <Icon className="size-5 text-brand-navy" />
                    <p className="mt-2 text-sm font-semibold text-brand-navy">{f.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Growth Engine — phase two teaser when single-plan launch */}
      <section id="growth" className="scroll-mt-20 bg-brand-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center lg:max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">Coming in phase two</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              {PHASE_ONE_LAUNCH
                ? "Growth Engine, licensed MOTOR & payments — on Pro"
                : `Growth tools included on ${PLANS.PROFESSIONAL.name} — not sold as bolt-ons`}
            </h2>
            <p className="mt-4 text-white/75">
              {PHASE_ONE_LAUNCH
                ? "Ignition covers your shop floor today. Pro adds two-way SMS, online booking, Growth Engine automations, Stripe Connect, and licensed MOTOR labor — we're building it now for shops that outgrow one plan."
                : `Budget CRMs charge extra for booking, SMS, and reviews. ShopRally ${PLANS.PROFESSIONAL.name} bundles Growth Engine automations & win-back with Google review management included.`}
            </p>
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {[
              "Two-way SMS",
              "Online booking",
              "Growth Engine — automations & win-back",
              "Google review management",
              "Unlimited VIN & plate decoding",
              "Stripe Connect payments",
            ].map((item) => (
              <li
                key={item}
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-sm"
              >
                <CheckCircle2 className="size-4 shrink-0 text-brand-light" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Elite AI */}
      <section className="border-b border-brand-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              {PLANS.ENTERPRISE.name}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-brand-navy">
              {PLANS.ENTERPRISE.name} — white-glove AI &amp; web stack
            </h2>
            <p className="mt-4 text-slate-600">
              After-hours SMS and voice reception, AI review replies, ShopSite, Local SEO, and maintenance
              programs — included on {PLANS.ENTERPRISE.name}, not a pile of separate add-ons.
            </p>
            {preLaunch ? (
              <Button className="mt-8 bg-brand-red hover:bg-brand-red/90" asChild>
                <Link href="/launch">Join the waitlist</Link>
              </Button>
            ) : (
              <Button className="mt-8 bg-brand-navy" asChild>
                <Link href="/pricing">See {PLANS.ENTERPRISE.name} pricing</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <PlatformValueSection />

      {/* Social proof */}
      <section className="border-t border-brand-navy/10 bg-gradient-to-b from-brand-light/[0.1] via-white to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">
            Built with shop owners in mind
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Early feedback from advisors and beta shops shaping launch.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t, index) => {
              const style = TESTIMONIAL_STYLES[index] ?? TESTIMONIAL_STYLES[0];
              return (
                <blockquote
                  key={t.role}
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden rounded-2xl border py-6 pl-6 pr-6",
                    style.card,
                  )}
                >
                  <div className={cn("absolute inset-y-0 left-0 w-1", style.stripe)} aria-hidden />
                  <Star className="size-5 shrink-0 fill-brand-light text-brand-light" aria-hidden />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-brand-navy/90">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <footer className="mt-6 shrink-0 border-t border-brand-navy/10 pt-4">
                    <p className="text-xs font-semibold text-brand-navy">{t.role}</p>
                    <p
                      className={cn(
                        "mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                        style.metric,
                      )}
                    >
                      {t.metric}
                    </p>
                  </footer>
                </blockquote>
              );
            })}
          </div>
        </div>
      </section>

      {preLaunch ? (
        <section className="border-t border-brand-navy/10 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <FoundingWaitlistForm />
          </div>
        </section>
      ) : null}

      <section className="border-t border-brand-navy/10">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-brand-navy">
            {preLaunch ? "Be first when we launch" : "Ready to see ShopRally in action?"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            {preLaunch
              ? "Join the founding shop waitlist or book an early demo."
              : "Start a 14-day free trial or talk to us about migration."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-red hover:bg-brand-red/90" asChild>
              <Link href={preLaunch ? "/launch" : "/demo"}>
                {preLaunch ? "Join waitlist" : "Book a demo"}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-brand-navy text-brand-navy" asChild>
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
