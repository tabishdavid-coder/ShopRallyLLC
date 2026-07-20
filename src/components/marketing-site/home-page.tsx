"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Mail,
  Package,
  Shield,
  Star,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { AiPlusShowcase } from "@/components/marketing-site/ai-plus-showcase";
import { HomeHeroVisual } from "@/components/marketing-site/home-hero-visual";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { PlatformValueSection } from "@/components/marketing-site/platform-value-section";
import { FoundingWaitlistForm } from "@/components/marketing-site/founding-waitlist-form";
import { OutcomeMetricsStrip } from "@/components/marketing-site/outcome-metrics-strip";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_POSITIONING,
  HOME_HERO,
  HOW_SHOPRALLY_WORKS,
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHint,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import { cn } from "@/lib/utils";
import {
  PLANS,
  DVI_PLAN_COPY,
  DASHBOARD_PLAN_COPY,
  aiPlusPriceLabel,
  planMarketingDisplayName,
} from "@/lib/plans";

const HOW_IT_WORKS_ICONS = [Wrench, Zap, BarChart3] as const;
const HOW_IT_WORKS_ACCENTS = [
  {
    accent: "border-brand-navy/20 bg-brand-navy/5",
    iconBg: "bg-brand-navy text-white",
  },
  {
    accent: "border-brand-light/30 bg-brand-light/10",
    iconBg: "bg-brand-light text-brand-navy",
  },
  {
    accent: "border-brand-light/40 bg-brand-light/15",
    iconBg: "bg-brand-navy text-white",
  },
] as const;

/** Ignition / Core launch — only what ships now. */
const FEATURES = [
  { icon: Calendar, label: "Appointments" },
  { icon: BookOpen, label: "Canned jobs & shop labor" },
  { icon: Mail, label: "Email estimates & approvals" },
  { icon: ClipboardCheck, label: "Digital vehicle inspections" },
  { icon: BarChart3, label: "Operations Daily Snapshot" },
  { icon: Shield, label: "Unlimited NHTSA VIN" },
  { icon: Package, label: "PartsTech punchout" },
  { icon: Users, label: "Unlimited users & ROs" },
] as const;

const TESTIMONIALS = [
  {
    quote:
      "We finally have one system for the front counter and the bays — estimates, digital vehicle inspections, and the job board in one place.",
    role: "Independent shop owner",
    metric: "3× faster estimates",
  },
  {
    quote:
      "Advisors build the RO once. Customers get a clear email estimate. No more chasing paper around the shop.",
    role: "Shop owner, 4-bay independent",
    metric: "Less double-entry",
  },
  {
    quote:
      "Customers approve jobs from an email link. That alone paid for the software in the first month.",
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

const COMING_LATER = [
  "Licensed MOTOR labor data",
  "Two-way SMS & Growth Engine",
  "Online booking & review automation",
  "Stripe Connect card capture",
  "AI receptionist & maintenance programs",
] as const;

export function HomePageContent() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const ignitionName = planMarketingDisplayName(PLANS.STARTER);

  return (
    <>
      {/*
        Competitor-pattern hero:
        AutoLeap = split copy | static product screenshot (board + messages).
        Shopmonkey = light cool field + dominant product weight.
        ShopRally = brand-first → one headline → short support → one Reserve CTA.
        Static only — no motion UI, bay collage, dual CTAs, or seat counts.
      */}
      <section className="sr-home-hero relative overflow-hidden border-b border-brand-navy/10">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Shopmonkey-adjacent cool field (#F9FBFE family) with ShopRally navy/light wash */}
          <div className="absolute inset-0 bg-[linear-gradient(165deg,#e8f3fc_0%,#f9fbfe_38%,#ffffff_100%)]" />
          <div className="absolute -left-[16%] top-[-14%] h-[58%] w-[48%] bg-[radial-gradient(ellipse_at_center,rgb(129_196_255/0.28),transparent_70%)]" />
          <div className="absolute -right-[10%] bottom-[-10%] h-[50%] w-[44%] bg-[radial-gradient(ellipse_at_center,rgb(22_88_142/0.07),transparent_72%)]" />
        </div>

        <div className="relative mx-auto grid min-h-[calc(100svh-5.5rem)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.22fr)] lg:gap-10 lg:py-14 xl:gap-14">
          <div className="relative z-10 max-w-xl">
            <p className="text-[clamp(2.85rem,6.4vw,4.5rem)] font-bold leading-[0.88] tracking-tight text-brand-navy">
              ShopRally
            </p>
            <h1 className="mt-4 text-[clamp(1.55rem,3.2vw,2.2rem)] font-semibold leading-[1.15] tracking-tight text-brand-navy">
              {HOME_HERO.headline}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
              {preLaunch ? HOME_HERO.supportPreLaunch : HOME_HERO.supportLive}
            </p>

            <div className="mt-8 flex flex-col items-start gap-2.5">
              <Button
                size="lg"
                className="min-w-52 gap-2 bg-brand-navy px-7 text-base hover:bg-brand-navy/90"
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>
                  {marketingPrimaryCta({ preLaunch })}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-xs text-slate-500">{marketingPrimaryHint(preLaunch)}</p>
              {preLaunch ? (
                <p className="text-[11px] font-medium text-brand-navy/70">
                  {HOME_HERO.proofLine}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative min-w-0 lg:justify-self-stretch lg:pl-2">
            <HomeHeroVisual />
          </div>
        </div>
      </section>

      {preLaunch ? (
        <section className="border-b border-brand-navy/10 bg-white">
          <div className="mx-auto max-w-xl px-4 py-12 text-center sm:px-6">
            <p className="mb-4 text-sm font-medium text-slate-600">{HOME_HERO.reciprocityLead}</p>
            <FoundingWaitlistForm variant="compact" />
          </div>
        </section>
      ) : null}

      <OutcomeMetricsStrip />

      <AiPlusShowcase />

      <MarketPositioningSection />

      <section id="product" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center lg:max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            {HOW_SHOPRALLY_WORKS.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">
            {HOW_SHOPRALLY_WORKS.headline}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            {HOW_SHOPRALLY_WORKS.subhead}
            {preLaunch ? ` Founding seats open for the ${MARKETING_LAUNCH.launchQuarter} launch.` : ""}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {HOW_SHOPRALLY_WORKS.steps.map((step, index) => {
            const Icon = HOW_IT_WORKS_ICONS[index] ?? Wrench;
            const style = HOW_IT_WORKS_ACCENTS[index] ?? HOW_IT_WORKS_ACCENTS[0];
            return (
              <div
                key={step.title}
                className={cn("rounded-2xl border-2 p-6 transition-shadow hover:shadow-lg", style.accent)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={cn("flex size-11 items-center justify-center rounded-xl", style.iconBg)}>
                    <Icon className="size-5" />
                  </div>
                  <span className="text-xs font-bold tabular-nums tracking-wider text-brand-navy/40">
                    {step.step}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-brand-navy">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-brand-navy/10 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                {CATEGORY_POSITIONING.shortCategory}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-brand-navy">
                Purpose-built for how repair shops actually work
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                ShopRally is all-in-one auto repair shop management software — customers, vehicles,
                repair orders, PartsTech, digital vehicle inspections, and payment tracking stay
                connected. No re-entry between systems.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  DASHBOARD_PLAN_COPY.featuresAllTiers,
                  DVI_PLAN_COPY.featuresAllTiers,
                  "Job board, canned jobs & shop labor library",
                  "Digital estimates, approvals & invoices via email",
                  "Unlimited NHTSA VIN decode",
                  "PartsTech catalog & punchout — parts on the estimate fast",
                  `AI Plus recommended — freeform intake & advisor app (+${aiPlusPriceLabel()})`,
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 bg-brand-navy" asChild>
                <Link href="/features">See what&apos;s included</Link>
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

      {/* Coming later — Pro / Elite roadmap (not sold now) */}
      <section id="coming-later" className="scroll-mt-20 bg-brand-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center lg:max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
              Coming later · Pro &amp; Elite
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              Beyond Ignition — when those plans open
            </h2>
            <p className="mt-4 text-white/75">
              {ignitionName} launches Q4 2026. These Pro &amp; Elite capabilities stay on the
              roadmap — not included with founding Ignition seats.
            </p>
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
            {COMING_LATER.map((item) => (
              <li
                key={item}
                className="rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-3 text-left text-sm text-white/85"
              >
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-brand-light/80">
                  Coming later
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-xl text-center text-sm text-white/60">
            Start with {ignitionName}. Upgrade when Pro and Elite open — not before.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm text-white/70">
            Need a shop website, local SEO, and local Google presence (Business Profile + Ads) at
            launch?{" "}
            <Link
              href="/pricing?tab=website"
              className="font-semibold text-brand-light underline-offset-2 hover:underline"
            >
              Website &amp; SEO — separate from Ignition
            </Link>
          </p>
        </div>
      </section>

      <PlatformValueSection />

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
            <div className="mx-auto mb-8 max-w-2xl text-center">
              <h2 className="text-2xl font-bold text-brand-navy sm:text-3xl">
                Prefer a guided reserve?
              </h2>
              <p className="mt-2 text-slate-600">
                Tell us what&apos;s slowing the shop — we&apos;ll show how Ignition will help at the Q4
                2026 launch, then reserve a founding seat. No instant access.
              </p>
              <Button className="mt-5 bg-brand-navy" asChild>
                <Link href="/launch">
                  Reserve a founding seat
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
            <FoundingWaitlistForm />
          </div>
        </section>
      ) : null}

      <section className="border-t border-brand-navy/10">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold text-brand-navy">
            {preLaunch ? `Reserve a seat for ${MARKETING_LAUNCH.launchQuarter}` : `Ready for ${ignitionName}?`}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            {preLaunch
              ? `Software launches ${MARKETING_LAUNCH.launchQuarter} — reserving a seat does not give access today.`
              : "Start a 14-day trial with no card, or book a walkthrough if you'd rather see it first."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-navy hover:bg-brand-navy/90" asChild>
              <Link href={marketingPrimaryHref(preLaunch)}>
                {marketingPrimaryCta({ preLaunch })}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-brand-navy text-brand-navy" asChild>
              <Link href="/pricing">See {ignitionName} pricing</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
