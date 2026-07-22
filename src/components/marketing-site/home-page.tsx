"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Wrench, Zap } from "lucide-react";

import { Hero } from "@/components/marketing-site/Hero";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { FoundingWaitlistForm } from "@/components/marketing-site/founding-waitlist-form";
import { Button } from "@/components/ui/button";
import {
  HOME_FAQ,
  HOME_FAQ_RELATED_LINKS,
  HOW_SHOPRALLY_WORKS,
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import { cn } from "@/lib/utils";
import {
  PLANS,
  aiPlusPriceLabel,
  planMarketingDisplayName,
  shoprallyStarterPricePairLabel,
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

export function HomePageContent() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const ignitionName = planMarketingDisplayName(PLANS.STARTER);
  const ignitionPrice = shoprallyStarterPricePairLabel();

  return (
    <>
      <Hero />

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
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            ShopRally is all-in-one auto repair shop management software — customers, vehicles, repair
            orders, PartsTech, Carfax, two-way SMS, digital vehicle inspections, and payment tracking stay
            connected.{" "}
            <Link
              href="/features"
              className="font-semibold text-brand-navy underline-offset-2 hover:underline"
            >
              See features
            </Link>
            .
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

      <section
        id="pricing-wedge"
        className="scroll-mt-20 border-y border-brand-navy/10 bg-gradient-to-b from-brand-light/[0.12] via-white to-white"
      >
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            Founding plan
          </p>
          <h2 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">{ignitionName}</h2>
          <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-brand-navy">
            {ignitionPrice}
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600">
            {PLANS.STARTER.tagline} Optional AI Plus ({aiPlusPriceLabel()}) for freeform intake.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-navy hover:bg-brand-navy/90" asChild>
              <Link href="/pricing">
                See {ignitionName} pricing
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-brand-navy text-brand-navy"
              asChild
            >
              <Link href="/features">See what&apos;s included</Link>
            </Button>
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-t border-brand-navy/10 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-bold text-brand-navy sm:text-3xl">
            Auto repair shop management software — FAQ
          </h2>
          <dl className="mt-10 space-y-6">
            {HOME_FAQ.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-brand-navy/10 bg-brand-light/5 px-5 py-4"
              >
                <dt className="text-sm font-bold text-brand-navy">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-center text-sm text-slate-500">
            Explore{" "}
            {HOME_FAQ_RELATED_LINKS.map((link, i) => (
              <span key={link.href}>
                {i > 0 ? (i === HOME_FAQ_RELATED_LINKS.length - 1 ? ", or " : ", ") : null}
                <Link
                  href={link.href}
                  className="font-semibold text-brand-navy underline-offset-2 hover:underline"
                >
                  {link.label}
                </Link>
              </span>
            ))}
            .
          </p>
        </div>
      </section>

      <section
        id="reserve"
        className="scroll-mt-20 border-t border-brand-navy/10 bg-slate-50"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-brand-navy">
              {preLaunch
                ? `Reserve a seat for ${MARKETING_LAUNCH.launchQuarter}`
                : `Ready for ${ignitionName}?`}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              {preLaunch ? (
                <>
                  Software launches {MARKETING_LAUNCH.launchQuarter} — reserving a seat does not give
                  access today. Prefer a guided path?{" "}
                  <Link
                    href="/launch"
                    className="font-semibold text-brand-navy underline-offset-2 hover:underline"
                  >
                    Open Launch
                  </Link>
                  .
                </>
              ) : (
                "Start a 14-day trial with no card, or book a walkthrough if you'd rather see it first."
              )}
            </p>
            {!preLaunch ? (
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" className="bg-brand-navy hover:bg-brand-navy/90" asChild>
                  <Link href={marketingPrimaryHref(preLaunch)}>
                    {marketingPrimaryCta({ preLaunch })}
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-brand-navy text-brand-navy"
                  asChild
                >
                  <Link href="/pricing">See {ignitionName} pricing</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-6">
                <Button className="bg-brand-navy" asChild>
                  <Link href={marketingPrimaryHref(preLaunch)}>
                    {marketingPrimaryCta({ preLaunch })}
                    <ArrowRight className="ml-2 size-4" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
          {preLaunch ? (
            <div className="mt-10">
              <FoundingWaitlistForm />
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
