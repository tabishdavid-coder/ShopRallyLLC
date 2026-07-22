import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Home,
  Scale,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ComparePageContent } from "@/lib/marketing-compare";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHint,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import { planMarketingDisplayName, PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** Hub redesign lives in compare-hub — re-export for existing page imports. */
export { CompareHubContent } from "@/components/marketing-site/compare-hub";

const preLaunch = MARKETING_LAUNCH.preLaunch;
const ignitionName = planMarketingDisplayName(PLANS.STARTER);

/**
 * Per-competitor compare article layout — shared chrome, competitor-specific data.
 * Visual bar: split hero + VS treatment, glance chips, choose-if cards, styled table, CTA band.
 */
export function CompareCompetitorPage({ page }: { page: ComparePageContent }) {
  return (
    <>
      <CompareCompetitorHero page={page} />
      <CompareGlanceStrip page={page} />
      <CompareChooseIf page={page} />
      <CompareWhySwitch page={page} />
      <CompareCapabilityTable page={page} />
      <ComparePricingCallout page={page} />
      <CompareBottomCta page={page} />
    </>
  );
}

function CompareCompetitorHero({ page }: { page: ComparePageContent }) {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy/10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_0%_0%,oklch(0.798_0.108_247_/_0.32),transparent_55%),radial-gradient(ellipse_45%_40%_at_100%_10%,oklch(0.449_0.109_249_/_0.1),transparent_50%),linear-gradient(180deg,#f8fbff_0%,#ffffff_78%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
          <div className="motion-safe:animate-[sr-wp-fade-up_0.55s_ease-out_both]">
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-1 transition-colors hover:text-brand-navy"
              >
                <Home className="size-3.5" aria-hidden />
                <span className="sr-only">Home</span>
              </Link>
              <span aria-hidden className="text-slate-300">
                /
              </span>
              <Link
                href="/compare"
                className="font-medium text-slate-600 underline-offset-2 hover:text-brand-navy hover:underline"
              >
                Comparisons
              </Link>
              <span aria-hidden className="text-slate-300">
                /
              </span>
              <span className="font-medium text-brand-navy">{page.competitor}</span>
            </nav>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              {page.competitor} alternative · honest compare
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-[2.55rem] lg:leading-[1.12]">
              {page.h1}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
              {page.intro}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="min-h-11 bg-brand-red px-6 text-base font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90"
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>
                  {marketingPrimaryCta({ preLaunch })}
                  <ArrowRight className="ml-2 size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="min-h-11 border-brand-navy/30 bg-white/80 text-brand-navy hover:bg-brand-light/20"
                asChild
              >
                <Link href="/pricing">See {ignitionName} pricing</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{marketingPrimaryHint(preLaunch)}</p>
          </div>

          <div className="motion-safe:animate-[sr-wp-fade-up_0.65s_ease-out_0.08s_both]">
            <CompareVsVisual
              competitor={page.competitor}
              wedge={page.heroWedge}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareVsVisual({
  competitor,
  wedge,
}: {
  competitor: string;
  wedge: string;
}) {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,oklch(0.798_0.108_247_/_0.4),transparent_68%)] blur-2xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_28px_64px_-28px_rgba(22,88,142,0.42)] ring-1 ring-brand-navy/5">
        {/* 3-col: equal name panels + centered VS on the diagonal seam */}
        <div className="relative grid min-h-[9.5rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] overflow-hidden sm:min-h-[11rem]">
          <div aria-hidden className="absolute inset-0 bg-slate-100" />
          <div
            aria-hidden
            className="absolute inset-0 bg-brand-navy"
            style={{
              clipPath: "polygon(0 0, 54% 0, 46% 100%, 0 100%)",
            }}
          />

          <div className="relative z-[1] flex flex-col justify-center py-6 pl-4 pr-3 sm:pl-6 sm:pr-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-brand-light">
              ShopRally
            </p>
            <p className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
              {ignitionName}
            </p>
            <p className="mt-2 max-w-[11rem] text-[11px] leading-snug text-white/75 sm:max-w-[12rem]">
              Founding plan · {MARKETING_LAUNCH.launchQuarter}
            </p>
          </div>

          <div
            aria-hidden
            className="relative z-10 flex items-center justify-center self-center"
          >
            <div className="flex size-12 items-center justify-center rounded-full bg-brand-red text-xs font-black lowercase leading-none tracking-wide text-white shadow-lg shadow-brand-red/30 ring-4 ring-white sm:size-14 sm:text-sm">
              <span className="translate-y-[0.5px]">vs</span>
            </div>
          </div>

          <div className="relative z-[1] flex flex-col justify-center py-6 pl-3 pr-4 sm:pl-4 sm:pr-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Competitor
            </p>
            <p className="mt-1 break-words text-xl font-bold tracking-tight text-slate-700 sm:text-2xl">
              {competitor}
            </p>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              Available today · verify live tiers
            </p>
          </div>
        </div>
        <div className="border-t border-brand-navy/10 bg-gradient-to-r from-brand-navy/[0.04] via-white to-slate-50 px-4 py-3.5 sm:px-5">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-navy" aria-hidden />
            <p className="text-sm font-medium leading-snug text-brand-navy">{wedge}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareGlanceStrip({ page }: { page: ComparePageContent }) {
  return (
    <section className="border-b border-brand-navy/8 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
          At a glance · {page.competitor}
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {page.glanceChips.map((chip, i) => (
            <li
              key={chip.label}
              className={cn(
                "rounded-xl border border-brand-navy/10 bg-gradient-to-b from-slate-50/90 to-white px-4 py-3.5 shadow-sm",
                "motion-safe:animate-[sr-wp-fade-up_0.45s_ease-out_both]",
                i === 1 && "motion-safe:[animation-delay:60ms]",
                i === 2 && "motion-safe:[animation-delay:120ms]",
                i === 3 && "motion-safe:[animation-delay:180ms]",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {chip.label}
              </p>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-brand-navy">
                {chip.value}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CompareChooseIf({ page }: { page: ComparePageContent }) {
  return (
    <section className="bg-gradient-to-b from-white via-slate-50/60 to-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
            Fair framing
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            Choose the fit — not a smear
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {page.competitor} wins for some shops. ShopRally wins for others. Pick based on
            what you actually need.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <ChooseCard
            tone="shoprally"
            title={`Choose ShopRally if…`}
            items={page.chooseShopRally}
          />
          <ChooseCard
            tone="them"
            title={`Choose ${page.competitor} if…`}
            items={page.chooseThem}
          />
        </div>
      </div>
    </section>
  );
}

function ChooseCard({
  tone,
  title,
  items,
}: {
  tone: "shoprally" | "them";
  title: string;
  items: string[];
}) {
  const isUs = tone === "shoprally";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-sm transition-shadow duration-300 hover:shadow-md",
        isUs
          ? "border-brand-navy/20 bg-white"
          : "border-slate-200 bg-white",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 px-5 py-3.5",
          isUs ? "bg-brand-navy text-white" : "bg-slate-700 text-white",
        )}
      >
        <Scale className="size-4 shrink-0 opacity-90" aria-hidden />
        <h3 className="text-sm font-bold tracking-tight sm:text-base">{title}</h3>
      </div>
      <ul className="space-y-3 px-5 py-5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
            <CheckCircle2
              className={cn(
                "mt-0.5 size-4 shrink-0",
                isUs ? "text-brand-navy" : "text-slate-500",
              )}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareWhySwitch({ page }: { page: ComparePageContent }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
      <h2 className="text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
        Why shops look at ShopRally vs {page.competitor}
      </h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {page.whySwitch.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 rounded-xl border border-brand-navy/10 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-700 shadow-sm"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CompareCapabilityTable({ page }: { page: ComparePageContent }) {
  return (
    <section className="border-y border-brand-navy/10 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Capability view
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
              Side-by-side (category)
            </h2>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-slate-500 sm:text-right">
            Rows are matchup-specific — not a copy-paste checklist with names swapped.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-navy/15 bg-white shadow-sm">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead>
              <tr className="border-b border-brand-navy/10">
                <th className="bg-slate-50 px-4 py-3.5 font-semibold text-slate-600">
                  Capability
                </th>
                <th className="bg-slate-100 px-4 py-3.5 font-semibold text-slate-700">
                  {page.competitor}
                </th>
                <th className="bg-brand-navy px-4 py-3.5 font-semibold text-white">
                  ShopRally {ignitionName}
                </th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map((row, i) => (
                <tr
                  key={row.label}
                  className={cn(
                    "border-b border-brand-navy/8 last:border-0",
                    i % 2 === 1 && "bg-slate-50/60",
                  )}
                >
                  <td className="px-4 py-3.5 font-medium text-brand-navy">{row.label}</td>
                  <td className="px-4 py-3.5 text-slate-600">{row.them}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-800">{row.us}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-slate-500">{page.footnote}</p>
      </div>
    </section>
  );
}

function ComparePricingCallout({ page }: { page: ComparePageContent }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14">
      <div className="overflow-hidden rounded-2xl border border-brand-navy/15 bg-gradient-to-br from-brand-navy/[0.06] via-white to-brand-light/20 shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              Pricing posture
            </p>
            <h2 className="mt-2 text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
              ShopRally vs {page.competitor} dollars
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">{page.pricing.summary}</p>
            {page.pricing.detail ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{page.pricing.detail}</p>
            ) : null}
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              {page.pricing.verifiedNote}
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 border-t border-brand-navy/10 bg-white/70 px-5 py-6 sm:px-8 lg:border-l lg:border-t-0">
            <Button className="bg-brand-navy hover:bg-brand-navy/90" asChild>
              <Link href="/pricing">
                Open ShopRally pricing
                <ArrowRight className="ml-2 size-4" aria-hidden />
              </Link>
            </Button>
            <p className="text-xs leading-relaxed text-slate-500">
              Always confirm {page.competitor} on their site before you buy — we link categories,
              not a live competitor price feed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareBottomCta({ page }: { page: ComparePageContent }) {
  return (
    <section className="relative overflow-hidden border-t border-brand-navy/10 bg-brand-navy">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,oklch(0.798_0.108_247_/_0.22),transparent_60%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-light">
          Next step · vs {page.competitor}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Reserve a founding seat — or keep comparing
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">
          Review{" "}
          <Link href="/features" className="font-semibold text-brand-light underline-offset-2 hover:underline">
            Ignition features
          </Link>
          ,{" "}
          <Link href="/pricing" className="font-semibold text-brand-light underline-offset-2 hover:underline">
            pricing
          </Link>
          , or a{" "}
          <Link href="/demo" className="font-semibold text-brand-light underline-offset-2 hover:underline">
            3-minute walkthrough
          </Link>
          . More matchups on the{" "}
          <Link href="/compare" className="font-semibold text-brand-light underline-offset-2 hover:underline">
            compare hub
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="min-h-11 bg-brand-red px-6 font-semibold text-white hover:bg-brand-red/90"
            asChild
          >
            <Link href={marketingPrimaryHref(preLaunch)}>
              {marketingPrimaryCta({ preLaunch })}
              <ArrowRight className="ml-2 size-4" aria-hidden />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="min-h-11 border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href={marketingSecondaryHref(preLaunch)}>
              {marketingSecondaryCta(preLaunch)}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
