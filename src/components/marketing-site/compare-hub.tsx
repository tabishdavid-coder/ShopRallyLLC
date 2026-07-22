import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Home,
  Mail,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { COMPARE_PAGES } from "@/lib/marketing-compare";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHint,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import { planMarketingDisplayName, PLANS, shoprallyStarterPricePairLabel } from "@/lib/plans";
import { cn } from "@/lib/utils";

const preLaunch = MARKETING_LAUNCH.preLaunch;
const ignitionName = planMarketingDisplayName(PLANS.STARTER);

/** Demo RO labels — mirrors hero marketing preview (keep server-safe; no client import). */
const HUB_RO = {
  number: "#1046",
  customer: "Luis Hernandez",
  total: "$1,240.00",
} as const;

/** Short marks for floating chips — fair nominative use of competitor names only. */
const COMPETITOR_MARKS = COMPARE_PAGES.map((p) => ({
  name: p.competitor,
  href: p.path,
}));

export function CompareHubContent() {
  return (
    <>
      <CompareHubHero />
      <CompareVsGrid />
      <CompareHubFooterLinks />
    </>
  );
}

function CompareHubHero() {
  return (
    <section className="relative overflow-hidden border-b border-brand-navy/10">
      {/* Atmosphere — soft navy→light wash, not flat white */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_10%_0%,oklch(0.798_0.108_247_/_0.35),transparent_55%),radial-gradient(ellipse_50%_40%_at_90%_20%,oklch(0.449_0.109_249_/_0.08),transparent_50%),linear-gradient(180deg,#f8fbff_0%,#ffffff_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand-navy/15 to-transparent"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-14 xl:gap-16">
          {/* Left — SEO + honest overview + CTAs */}
          <div className="motion-safe:animate-[sr-wp-fade-up_0.55s_ease-out_both]">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-1.5 text-xs text-slate-500"
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
              <span className="font-medium text-brand-navy">Comparisons</span>
            </nav>

            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
              ShopRally vs the field
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-[2.65rem] lg:leading-[1.12]">
              Compare{" "}
              <span className="bg-gradient-to-r from-brand-navy to-[oklch(0.52_0.14_249)] bg-clip-text text-transparent">
                ShopRally
              </span>{" "}
              with other shop management software
            </h1>

            <div className="mt-5 space-y-3 text-base leading-relaxed text-slate-600">
              <p>
                Evaluating a switch? Here&apos;s a quick, honest overview of how{" "}
                {ignitionName} stacks up against Tekmetric, AutoLeap, Shopmonkey, ARI, and
                other shop CRMs — so you can decide with clear eyes.
              </p>
              <p>
                ShopRally launches {MARKETING_LAUNCH.launchQuarter} at{" "}
                {shoprallyStarterPricePairLabel()} with PartsTech, Carfax, two-way SMS, Google
                Reviews inbox, and digital vehicle inspections on Ignition. Growth Engine
                campaigns and licensed MOTOR stay on Pro — labeled honestly, not buried.
              </p>
            </div>

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
                <Link href={marketingSecondaryHref(preLaunch)}>
                  {marketingSecondaryCta(preLaunch)}
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">{marketingPrimaryHint(preLaunch)}</p>
          </div>

          {/* Right — product UI credibility hub + competitor marks */}
          <div className="motion-safe:animate-[sr-wp-fade-up_0.65s_ease-out_0.08s_both]">
            <CompareCredibilityHub />
          </div>
        </div>
      </div>
    </section>
  );
}

function CompareCredibilityHub() {
  const top = COMPETITOR_MARKS.slice(0, 4);
  const bottom = COMPETITOR_MARKS.slice(4);

  return (
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Soft glow behind product */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,oklch(0.798_0.108_247_/_0.45),transparent_65%)] blur-2xl sm:-inset-6"
      />

      {/* Top competitor marks */}
      <div className="relative mb-3 flex flex-wrap justify-center gap-2 sm:mb-4 sm:gap-2.5 lg:justify-between">
        {top.map((mark, i) => (
          <CompetitorMarkChip
            key={mark.name}
            name={mark.name}
            href={mark.href}
            className={cn(
              "motion-safe:animate-[sr-wp-fade-up_0.5s_ease-out_both]",
              i === 0 && "motion-safe:[animation-delay:120ms]",
              i === 1 && "motion-safe:[animation-delay:180ms]",
              i === 2 && "motion-safe:[animation-delay:240ms]",
              i === 3 && "motion-safe:[animation-delay:300ms]",
            )}
          />
        ))}
      </div>

      {/* Dominant product visual */}
      <div className="relative overflow-hidden rounded-2xl border border-brand-navy/12 bg-white shadow-[0_28px_64px_-28px_rgba(22,88,142,0.45)] ring-1 ring-brand-navy/5 transition-shadow duration-300 hover:shadow-[0_32px_72px_-24px_rgba(22,88,142,0.5)]">
        <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-brand-navy px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2 rounded-full bg-brand-red/90" />
            <span className="size-2 rounded-full bg-brand-light/90" />
            <span className="size-2 rounded-full bg-white/35" />
          </div>
          <span className="text-xs font-semibold text-white/95">
            ShopRally {ignitionName} · Live Operations
          </span>
          <span className="ml-auto hidden items-center gap-1 text-[10px] font-medium text-brand-light sm:inline-flex">
            <TrendingUp className="size-3" aria-hidden />
            Same record · bay to paid
          </span>
        </div>

        <HubSnapshotStrip />
        <div className="grid gap-0 border-t border-brand-navy/8 sm:grid-cols-[1.25fr_0.85fr]">
          <HubKanbanPeek />
          <HubApprovalPeek />
        </div>
      </div>

      {/* Bottom competitor marks */}
      {bottom.length > 0 ? (
        <div className="relative mt-3 flex flex-wrap justify-center gap-2 sm:mt-4 sm:gap-2.5 lg:justify-evenly">
          {bottom.map((mark, i) => (
            <CompetitorMarkChip
              key={mark.name}
              name={mark.name}
              href={mark.href}
              className={cn(
                "motion-safe:animate-[sr-wp-fade-up_0.5s_ease-out_both]",
                i === 0 && "motion-safe:[animation-delay:360ms]",
                i === 1 && "motion-safe:[animation-delay:420ms]",
                i === 2 && "motion-safe:[animation-delay:480ms]",
                i === 3 && "motion-safe:[animation-delay:540ms]",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompetitorMarkChip({
  name,
  href,
  className,
}: {
  name: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center rounded-lg border border-brand-navy/12 bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 shadow-sm backdrop-blur-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-brand-navy/30 hover:text-brand-navy hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40",
        className,
      )}
    >
      {name}
    </Link>
  );
}

function HubSnapshotStrip() {
  const kpis = [
    { label: "Open ROs", value: "12" },
    { label: "WIP today", value: "5" },
    { label: "Collected", value: "$8.4k" },
    { label: "Avg ticket", value: "$412" },
  ] as const;

  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-brand-navy/6 sm:grid-cols-4 sm:divide-y-0">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="px-3 py-3 text-center sm:px-4">
          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
            {kpi.label}
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-brand-navy sm:text-xl">
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function HubKanbanPeek() {
  return (
    <div className="border-b border-brand-navy/8 p-3 sm:border-b-0 sm:border-r sm:p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <BarChart3 className="size-3.5 text-brand-navy" aria-hidden />
        <p className="text-xs font-bold text-brand-navy">Job board</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { title: "Estimates", tone: "bg-sky-500/15 text-sky-800", n: "2" },
          { title: "WIP", tone: "bg-brand-light/40 text-brand-navy", n: "1", active: true },
          { title: "Done", tone: "bg-emerald-500/15 text-emerald-800", n: "1" },
        ].map((col) => (
          <div
            key={col.title}
            className={cn(
              "rounded-lg border px-2 py-2",
              col.active
                ? "border-brand-navy/25 bg-brand-light/20 shadow-sm"
                : "border-brand-navy/8 bg-slate-50/80",
            )}
          >
            <span
              className={cn(
                "inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide",
                col.tone,
              )}
            >
              {col.title}
            </span>
            <p className="mt-1.5 text-[10px] font-bold tabular-nums text-brand-navy">
              {col.active ? HUB_RO.number : `#10${40 + Number(col.n)}`}
            </p>
            <p className="truncate text-[9px] text-slate-500">
              {col.active ? HUB_RO.customer : "RO card"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HubApprovalPeek() {
  return (
    <div className="flex flex-col justify-center gap-2.5 bg-slate-50/50 p-3 sm:p-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-brand-navy/10 bg-white p-2.5 shadow-sm">
        <Mail className="mt-0.5 size-3.5 shrink-0 text-brand-navy" aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-brand-navy">
            Estimate sent · {HUB_RO.number}
          </p>
          <p className="text-[10px] text-slate-500">{HUB_RO.total}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-2.5 py-2">
        <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden />
        <p className="text-[11px] font-bold text-emerald-800">Approved · moved to WIP</p>
      </div>
    </div>
  );
}

function CompareVsGrid() {
  return (
    <section className="bg-gradient-to-b from-white via-slate-50/80 to-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-red">
            Side-by-side
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
            ShopRally vs the alternatives
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Pick a comparison for category detail — what ships on Ignition at launch, what stays
            on Pro, and where competitors typically differ.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {COMPARE_PAGES.map((page) => (
            <li key={page.slug}>
              <CompareVsCard
                competitor={page.competitor}
                href={page.path}
                blurb={page.heroWedge}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CompareVsCard({
  competitor,
  href,
  blurb,
}: {
  competitor: string;
  href: string;
  blurb: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-navy/12 bg-white",
        "shadow-[0_12px_32px_-24px_rgba(22,88,142,0.35)] transition-all duration-300",
        "hover:-translate-y-1 hover:border-brand-navy/30 hover:shadow-[0_20px_40px_-20px_rgba(22,88,142,0.4)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy/40",
      )}
    >
      {/* VS graphic — slanted banners + 3-col name | badge | name (equal columns) */}
      <div className="relative h-[7.25rem] overflow-hidden bg-gradient-to-b from-slate-100 to-slate-50">
        <div
          aria-hidden
          className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,oklch(0.449_0.109_249_/_0.12)_1px,transparent_0)] [background-size:12px_12px]"
        />

        {/* Banner band — vertically centered so the seam + badge share one axis */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 h-12 -translate-y-1/2"
        >
          <div className="absolute -left-2 top-0 h-full w-[58%] -skew-x-12 bg-gradient-to-r from-brand-navy to-[oklch(0.52_0.12_249)] shadow-md transition-transform duration-300 group-hover:translate-x-0.5" />
          <div className="absolute -right-2 top-0 h-full w-[58%] skew-x-12 bg-gradient-to-l from-slate-600 to-slate-500 shadow-md transition-transform duration-300 group-hover:-translate-x-0.5" />
        </div>

        {/* Equal flex columns keep the badge on the seam; names truncate inside their half */}
        <div className="relative z-10 grid h-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 sm:gap-2.5 sm:px-4">
          <span className="min-w-0 truncate text-left text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
            ShopRally
          </span>
          <div
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white bg-brand-red text-[11px] font-black lowercase leading-none tracking-wide text-white shadow-lg shadow-brand-red/30 transition-transform duration-300 group-hover:scale-110"
          >
            <span className="translate-y-[0.5px]">vs</span>
          </div>
          <span className="min-w-0 truncate text-right text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
            {competitor}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 py-4">
        <p className="text-sm font-bold text-brand-navy">
          ShopRally vs {competitor}
        </p>
        <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
          {blurb}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-navy transition-colors group-hover:text-brand-red">
          Read comparison
          <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function CompareHubFooterLinks() {
  return (
    <section className="border-t border-brand-navy/10 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="text-center text-sm text-slate-500">
          Also see{" "}
          <Link
            href="/features"
            className="font-medium text-brand-navy underline-offset-2 hover:underline"
          >
            features
          </Link>
          ,{" "}
          <Link
            href="/pricing"
            className="font-medium text-brand-navy underline-offset-2 hover:underline"
          >
            pricing
          </Link>
          , and the{" "}
          <Link
            href="/demo"
            className="font-medium text-brand-navy underline-offset-2 hover:underline"
          >
            product walkthrough
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
