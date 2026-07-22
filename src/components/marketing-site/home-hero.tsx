"use client";

import Link from "next/link";
import { ArrowRight, Play, RefreshCw } from "lucide-react";

import { HeroCrmPeeks } from "@/components/marketing-site/hero-crm-peeks";
import { HeroPlatformPreview } from "@/components/marketing-site/hero-platform-preview";
import { Button } from "@/components/ui/button";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHint,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import { shoprallyStarterPricePairLabel } from "@/lib/plans";

export function HomeHero() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const pricePair = shoprallyStarterPricePairLabel();

  return (
    <section className="relative overflow-hidden bg-brand-navy text-white">
      {/* Ambient depth — static, no motion */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_15%_0%,var(--brand-light)/12,transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-36 top-[8%] hidden h-[84%] w-[min(38vw,400px)] opacity-[0.035] lg:block"
        aria-hidden
      >
        <svg viewBox="0 0 400 600" className="h-full w-full" fill="none" preserveAspectRatio="xMaxYMid slice">
          <path d="M120 0 L240 300 L120 600" stroke="currentColor" strokeWidth="40" className="text-brand-red" />
          <path d="M220 0 L340 300 L220 600" stroke="currentColor" strokeWidth="40" className="text-brand-light" />
          <path d="M320 0 L440 300 L320 600" stroke="currentColor" strokeWidth="40" className="text-white" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:py-11">
        <div className="grid items-center gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-5 xl:gap-7">
          {/* Left — copy & CTAs */}
          <div className="max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-light">
              Ignition · {MARKETING_LAUNCH.launchWindowLabel}
            </p>

            <h1 className="mt-2 text-3xl font-bold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.55rem] lg:leading-[1.08]">
              Auto repair shop management software that runs the bay and the counter from one board.
            </h1>

            <p className="mt-3 text-base leading-relaxed text-white/72 sm:text-[1.02rem]">
              Job board, estimates with PartsTech punchout, digital inspections, email approvals,
              appointments, and Live Operations Daily Snapshot — one Ignition plan. Founding price
              locked at <span className="font-semibold text-white">{pricePair}</span>.
            </p>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Button
                size="lg"
                className="min-h-11 gap-2 bg-brand-red px-6 text-base font-semibold text-white hover:bg-brand-red/90"
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>
                  {marketingPrimaryCta({ preLaunch })}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-11 gap-2 border-white/25 bg-transparent px-6 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href={marketingSecondaryHref(preLaunch)}>
                  <Play className="size-4 fill-current" aria-hidden />
                  {marketingSecondaryCta(preLaunch)}
                </Link>
              </Button>
            </div>

            <p className="mt-1.5 text-xs text-white/58">{marketingPrimaryHint(preLaunch)}</p>

            <div className="mt-3.5 rounded-xl border border-brand-light/20 bg-brand-navy/60 p-3 sm:p-3.5">
              <div className="flex gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-light/15 text-brand-light">
                  <RefreshCw className="size-3.5" aria-hidden />
                </div>
                <p className="text-sm leading-snug text-white/75">
                  <span className="font-semibold text-white">
                    Switching from Tekmetric, Shopmonkey, or Mitchell?
                  </span>{" "}
                  Founding shops get priority cutover help — tell us what you use today and
                  we&apos;ll plan the move. We won&apos;t invent one-click imports that aren&apos;t
                  built yet.
                </p>
              </div>
            </div>
          </div>

          {/* Right — RO lifecycle preview (dial on navy, no window chrome) */}
          <div className="mx-auto w-full max-w-lg sm:max-w-xl lg:mx-0 lg:max-w-none lg:justify-self-end">
            <HeroPlatformPreview variant="lifecycle" tone="dark" />
          </div>
        </div>

        {/* Product peeks — bridge from lifecycle dial; speed contrast + one walkthrough CTA */}
        <div className="mt-4 border-t border-white/10 pt-4 sm:mt-5 sm:pt-4">
          <HeroCrmPeeks />
        </div>
      </div>
    </section>
  );
}
