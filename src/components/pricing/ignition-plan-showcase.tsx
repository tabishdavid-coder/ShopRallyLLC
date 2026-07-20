"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PricingBillingToggle } from "@/components/pricing/pricing-billing-toggle";
import {
  AI_PLUS_MARKETING,
  IGNITION_PLAN_MARKETING,
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import {
  PLANS,
  annualSavingsDollars,
  aiPlusPriceLabel,
  planDisplayPrice,
  planListPrice,
  planMarketingDisplayName,
} from "@/lib/plans";

type IgnitionPlanShowcaseProps = {
  annual: boolean;
  onAnnualChange: (annual: boolean) => void;
};

/**
 * Phase-one Ignition — competitor-style plan card:
 * name → price → feature bullets → CTA. AI Plus as secondary add-on strip.
 */
export function IgnitionPlanShowcase({
  annual,
  onAnnualChange,
}: IgnitionPlanShowcaseProps) {
  const plan = PLANS.STARTER;
  const name = planMarketingDisplayName(plan);
  const price = planDisplayPrice(plan, annual);
  const listPrice = planListPrice(plan);
  const yearSaved = annualSavingsDollars(plan);
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const m = IGNITION_PLAN_MARKETING;

  return (
    <section className="relative overflow-hidden border-y border-brand-navy/10 px-4 py-14 sm:px-6 sm:py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.798_0.108_247_/_0.14),transparent_55%),linear-gradient(180deg,#f8fbff_0%,#ffffff_50%,#f4f8fc_100%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">
            {m.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            One plan to run the shop
          </h2>
          <PricingBillingToggle annual={annual} onAnnualChange={onAnnualChange} className="mt-6" />
        </div>

        {/* Competitor-style card: name / price / bullets / CTA */}
        <article className="relative mx-auto mt-8 max-w-md overflow-hidden rounded-2xl border-2 border-brand-navy bg-white shadow-[0_16px_48px_-20px_rgba(22,88,142,0.35)] ring-1 ring-brand-navy/10">
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-red via-brand-light to-brand-navy"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-light/25 to-transparent"
            aria-hidden
          />

          <div className="relative flex flex-col p-6 sm:p-8">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/50">
                Phase one
              </p>
              <span className="inline-flex rounded-full bg-brand-red px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Launch plan
              </span>
            </div>

            <header className="mt-3">
              <h3 className="text-[1.75rem] font-bold leading-none tracking-tight text-brand-navy">
                {name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{m.bestFor}</p>
            </header>

            <div className="mt-6">
              <div className="flex items-end gap-2.5">
                {annual ? (
                  <span className="mb-1 text-sm font-medium tabular-nums text-slate-400 line-through">
                    {listPrice}
                  </span>
                ) : null}
                <span className="text-[2.75rem] font-bold tabular-nums leading-none tracking-tight text-brand-navy">
                  {price}
                </span>
                <span className="mb-1.5 text-sm font-medium text-slate-500">/mo</span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {annual
                  ? `Billed annually · save $${yearSaved}/yr`
                  : "Billed monthly · switch to annual anytime"}
              </p>
            </div>

            <div className="mt-7 flex-1 border-t border-slate-200 pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                What&apos;s included
              </p>
              <ul className="mt-3.5 flex flex-col gap-0.5">
                {m.features.map((feature) => (
                  <li
                    key={feature.label}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] leading-snug tracking-[-0.01em] text-slate-700"
                  >
                    <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand-light/50 text-brand-navy">
                      <Check className="size-2.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span className="min-w-0">{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 space-y-3">
              <Button
                size="lg"
                className="h-12 w-full gap-2 bg-brand-navy text-base font-semibold hover:bg-brand-navy/90"
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>
                  {marketingPrimaryCta({ preLaunch })}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <p className="text-center text-[11px] leading-relaxed text-slate-500">{m.ctaHint}</p>
            </div>

            <button
              type="button"
              onClick={() =>
                document.getElementById("core-whats-included")?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
              }
              className="mt-5 text-center text-xs font-medium text-brand-navy underline-offset-2 hover:underline"
            >
              See everything by area ↓
            </button>
          </div>
        </article>

        {/* AI Plus — secondary add-on strip (AutoLeap AIR / Shopmonkey add-on pattern) */}
        <aside className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {m.addonTeaser.eyebrow}
              </p>
              <p className="mt-0.5 text-sm font-bold text-brand-navy">
                {m.addonTeaser.title}{" "}
                <span className="font-semibold text-slate-500">+{aiPlusPriceLabel()}</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{m.addonTeaser.blurb}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Link
                href={`${marketingPrimaryHref(preLaunch)}?ai=1`}
                className="text-xs font-semibold text-brand-navy underline-offset-2 hover:underline"
              >
                {AI_PLUS_MARKETING.ctaWithAi}
              </Link>
              <Link
                href="#ai-plus"
                className="text-[11px] text-slate-500 underline-offset-2 hover:underline"
              >
                How it works
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
