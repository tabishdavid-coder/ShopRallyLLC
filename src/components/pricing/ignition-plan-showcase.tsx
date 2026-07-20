"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Check, Sparkles } from "lucide-react";

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
 * No brand logo inside the card (pill + PHASE ONE eyebrow only).
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.798_0.108_247_/_0.12),transparent_55%),linear-gradient(180deg,#f7fafc_0%,#ffffff_48%,#f3f7fb_100%)]"
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

        {/* White navy-bordered plan card — screenshot layout, no SR logo */}
        <article className="relative mx-auto mt-8 max-w-[22.5rem] overflow-hidden rounded-2xl border-2 border-brand-navy bg-white shadow-[0_18px_44px_-22px_rgba(22,88,142,0.38)] sm:max-w-md">
          <div className="flex flex-col px-5 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <div className="flex justify-end">
              <span className="inline-flex rounded-full bg-brand-red px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">
                Launch plan
              </span>
            </div>

            <header className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-light">
                Phase one
              </p>
              <h3 className="mt-1.5 text-[2rem] font-bold leading-none tracking-tight text-brand-navy sm:text-[2.25rem]">
                {name}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-slate-600 sm:text-sm">
                {m.bestFor}
              </p>
            </header>

            <div className="mt-6">
              <div className="flex items-end gap-2.5">
                {annual ? (
                  <span className="mb-1.5 text-base font-medium tabular-nums text-slate-400 line-through decoration-slate-400/80">
                    {listPrice}
                  </span>
                ) : null}
                <span className="text-[2.85rem] font-bold tabular-nums leading-none tracking-tight text-brand-navy sm:text-[3.15rem]">
                  {price}
                </span>
                <span className="mb-1.5 text-base font-semibold text-brand-navy/70">/mo</span>
              </div>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {annual
                  ? `Billed annually · save $${yearSaved}/yr`
                  : "Billed monthly · switch to annual anytime"}
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/40 px-3.5 py-4 sm:px-4">
              <div className="flex items-center gap-3">
                <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-light">
                  What&apos;s included
                </p>
                <span className="h-px min-w-0 flex-1 bg-slate-200" aria-hidden />
              </div>
              <ul className="mt-3.5 flex flex-col gap-2">
                {m.features.map((feature) => (
                  <li
                    key={feature.label}
                    className="flex items-start gap-2.5 text-[13px] leading-snug text-slate-700"
                  >
                    <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand-navy text-white">
                      <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                    </span>
                    <span className="min-w-0">{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 space-y-2.5">
              <Button
                size="lg"
                className="h-12 w-full gap-2 rounded-xl bg-brand-navy text-[15px] font-semibold shadow-[0_8px_20px_-10px_rgba(22,88,142,0.65)] hover:bg-brand-navy/90"
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>
                  <CalendarDays className="size-4 opacity-90" aria-hidden />
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
              className="mt-4 text-center text-xs font-semibold text-brand-navy underline-offset-2 hover:underline"
            >
              See everything by area ↓
            </button>
          </div>
        </article>

        {/* AI Plus — add-on strip under card (not a peer plan) */}
        <aside className="relative mx-auto mt-5 max-w-[22.5rem] overflow-hidden rounded-xl border border-brand-navy/12 bg-[#f4f8fc] px-5 py-4 sm:max-w-md">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-light">
                {m.addonTeaser.eyebrow}
              </p>
              <p className="mt-1 text-sm font-bold text-brand-navy">
                {m.addonTeaser.title} — {aiPlusPriceLabel()}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{m.addonTeaser.blurb}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <Link
                href={`${marketingPrimaryHref(preLaunch)}?ai=1`}
                className="text-xs font-bold text-brand-navy underline-offset-2 hover:underline"
              >
                {AI_PLUS_MARKETING.ctaWithAi}
              </Link>
              <Link
                href="#ai-plus"
                className="text-[10px] font-medium text-slate-500 underline-offset-2 hover:underline"
              >
                How it works
              </Link>
            </div>
          </div>
          <span
            className="pointer-events-none absolute bottom-3 right-3 flex size-7 items-center justify-center rounded-md border border-brand-red/30 bg-brand-red/10 text-brand-red"
            aria-hidden
          >
            <Sparkles className="size-3.5" strokeWidth={2.25} />
          </span>
        </aside>
      </div>
    </section>
  );
}
