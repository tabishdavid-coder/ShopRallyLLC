import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ComparePageContent } from "@/lib/marketing-compare";
import { COMPARE_PAGES } from "@/lib/marketing-compare";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import { planMarketingDisplayName, PLANS, shoprallyStarterPricePairLabel } from "@/lib/plans";

const preLaunch = MARKETING_LAUNCH.preLaunch;
const ignitionName = planMarketingDisplayName(PLANS.STARTER);

export function CompareHubContent() {
  return (
    <>
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/25 to-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Compare</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            ShopRally vs other shop management software
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Honest category comparisons for shops evaluating a switch. {ignitionName} launches{" "}
            {MARKETING_LAUNCH.launchQuarter} at {shoprallyStarterPricePairLabel()} with PartsTech and
            digital vehicle inspections included — Growth Engine and licensed MOTOR stay on the Pro
            roadmap, clearly labeled.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <ul className="space-y-4">
          {COMPARE_PAGES.map((page) => (
            <li key={page.slug}>
              <Link
                href={page.path}
                className="group flex items-start justify-between gap-4 rounded-xl border border-brand-navy/15 bg-white px-5 py-4 transition-colors hover:border-brand-navy/35 hover:bg-brand-light/10"
              >
                <div>
                  <p className="font-semibold text-brand-navy group-hover:underline">
                    {page.competitor} alternative
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{page.h1}</p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0 text-brand-navy/50 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-10 text-sm text-slate-500">
          Also see{" "}
          <Link href="/features" className="font-medium text-brand-navy underline-offset-2 hover:underline">
            features
          </Link>
          ,{" "}
          <Link href="/pricing" className="font-medium text-brand-navy underline-offset-2 hover:underline">
            pricing
          </Link>
          , and the{" "}
          <Link href="/demo" className="font-medium text-brand-navy underline-offset-2 hover:underline">
            product walkthrough
          </Link>
          .
        </p>
      </section>
    </>
  );
}

export function CompareCompetitorPage({ page }: { page: ComparePageContent }) {
  return (
    <>
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/25 to-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
            {page.competitor} alternative
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            {page.h1}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600">{page.intro}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className="bg-brand-navy hover:bg-brand-navy/90" asChild>
              <Link href={marketingPrimaryHref(preLaunch)}>
                {marketingPrimaryCta({ preLaunch })}
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
              <Link href="/pricing">See {ignitionName} pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h2 className="text-2xl font-bold text-brand-navy">
          Why shops look at ShopRally vs {page.competitor}
        </h2>
        <ul className="mt-6 space-y-3">
          {page.whySwitch.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-navy" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-brand-navy/10 bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-brand-navy">Side-by-side (category view)</h2>
          <div className="mt-6 overflow-x-auto rounded-xl border border-brand-navy/15 bg-white">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-brand-navy/10 bg-brand-navy text-white">
                  <th className="px-4 py-3 font-semibold">Capability</th>
                  <th className="px-4 py-3 font-semibold">{page.competitor}</th>
                  <th className="px-4 py-3 font-semibold">ShopRally {ignitionName}</th>
                </tr>
              </thead>
              <tbody>
                {page.rows.map((row) => (
                  <tr key={row.label} className="border-b border-brand-navy/10 last:border-0">
                    <td className="px-4 py-3 font-medium text-brand-navy">{row.label}</td>
                    <td className="px-4 py-3 text-slate-600">{row.them}</td>
                    <td className="px-4 py-3 text-slate-800">{row.us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{page.footnote}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="text-2xl font-bold text-brand-navy">Next steps</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Review{" "}
          <Link href="/features" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
            Ignition features
          </Link>
          ,{" "}
          <Link href="/pricing" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
            shop management software pricing
          </Link>
          , or a{" "}
          <Link href="/demo" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
            3-minute walkthrough
          </Link>
          . Compare other platforms on the{" "}
          <Link href="/compare" className="font-semibold text-brand-navy underline-offset-2 hover:underline">
            compare hub
          </Link>
          .
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button className="bg-brand-red hover:bg-brand-red/90" asChild>
            <Link href={marketingPrimaryHref(preLaunch)}>
              {marketingPrimaryCta({ preLaunch })}
            </Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href={marketingSecondaryHref(preLaunch)}>
              {marketingSecondaryCta(preLaunch)}
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
