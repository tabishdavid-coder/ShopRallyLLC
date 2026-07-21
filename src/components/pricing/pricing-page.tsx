"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Minus, Sparkles } from "lucide-react";

import { AiPlusShowcase } from "@/components/marketing-site/ai-plus-showcase";
import { PricingUiShowcase } from "@/components/marketing-site/pricing-ui-showcase";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { PlatformValueSection } from "@/components/marketing-site/platform-value-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MARKETING_LAUNCH,
  marketingPrimaryCta,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import {
  IGNITION_COMING_LATER_FEATURES,
  IGNITION_LAUNCH_HIGHLIGHTS,
  INTEGRATION_PARTNERS,
  PHASE_ONE_COPY,
  PHASE_ONE_LAUNCH,
  PLANS,
  PRICING_FAQ,
  PUBLIC_PLAN_ORDER,
  aiPlusPriceLabel,
  getPublicComparisonRows,
  planMarketingDisplayName,
  publicPlanAddons,
  shoprallyStarterMonthly,
  shoprallyStarterPricePairLabel,
} from "@/lib/plans";
import { WEB_PRESENCE_MARKETING } from "@/lib/web-presence-marketing";
import { PricingBillingToggle } from "@/components/pricing/pricing-billing-toggle";
import { PricingPlanCard } from "@/components/pricing/pricing-plan-card";
import { IgnitionPlanShowcase } from "@/components/pricing/ignition-plan-showcase";
import { CorePlanWhatsIncluded } from "@/components/pricing/core-plan-whats-included";
import {
  PricingProductTabs,
  type PricingProductTab,
} from "@/components/pricing/pricing-product-tabs";
import { WebsiteSeoOffer } from "@/components/pricing/website-seo-offer";

function openFeatureComparison(setFeaturesOpen: (v: boolean | ((o: boolean) => boolean)) => void) {
  setFeaturesOpen(true);
  requestAnimationFrame(() => {
    document.getElementById("feature-comparison")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function tabFromSearchParam(raw: string | null): PricingProductTab {
  if (raw === "website" || raw === WEB_PRESENCE_MARKETING.needQuery) return "website";
  return "crm";
}

export function PricingPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [productTab, setProductTab] = useState<PricingProductTab>(() =>
    tabFromSearchParam(searchParams.get("tab")),
  );
  const [annual, setAnnual] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const ignitionPrice = shoprallyStarterMonthly(annual);
  const ignitionPlan = PLANS.STARTER;
  const ignitionMarketingName = planMarketingDisplayName(ignitionPlan);
  const phaseOneAddons = publicPlanAddons();
  const comparisonRows = getPublicComparisonRows();

  useEffect(() => {
    setProductTab(tabFromSearchParam(searchParams.get("tab")));
  }, [searchParams]);

  function selectProductTab(tab: PricingProductTab) {
    setProductTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "website") params.set("tab", "website");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div>
      {/* Hero — short thesis; plan card below is the scannable detail */}
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-12">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/5 px-3 py-1 text-xs font-semibold text-brand-red">
            <Sparkles className="size-3.5" />
            {productTab === "website"
              ? WEB_PRESENCE_MARKETING.eyebrow
              : preLaunch
                ? MARKETING_LAUNCH.launchWindowLabel
                : "Phase one · one plan"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            {productTab === "website"
              ? WEB_PRESENCE_MARKETING.websiteTabLabel
              : PHASE_ONE_COPY.headline}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
            {productTab === "website" ? (
              <>{WEB_PRESENCE_MARKETING.heroBridge}</>
            ) : (
              <>
                Transparent pricing for auto repair shop management software:{" "}
                {ignitionMarketingName} at {shoprallyStarterPricePairLabel()} with PartsTech
                included.{" "}
                {preLaunch ? "Launching Q4 2026." : "No CRM setup fees · month-to-month."}
              </>
            )}
          </p>
          <PricingProductTabs
            value={productTab}
            onChange={selectProductTab}
            className="mt-8"
          />
          {productTab === "crm" ? (
            <p className="mt-3 text-xs text-slate-500">
              Need a website too?{" "}
              <button
                type="button"
                onClick={() => selectProductTab("website")}
                className="font-semibold text-brand-navy underline-offset-2 hover:underline"
              >
                {WEB_PRESENCE_MARKETING.crossLinkLabel}
              </button>
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Looking for shop software?{" "}
              <button
                type="button"
                onClick={() => selectProductTab("crm")}
                className="font-semibold text-brand-navy underline-offset-2 hover:underline"
              >
                Back to Ignition CRM
              </button>
            </p>
          )}
        </div>
      </section>

      {productTab === "website" ? (
        <>
          <WebsiteSeoOffer />
          <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-brand-navy">Website &amp; SEO questions</h2>
            <ul className="mt-8 space-y-2">
              {PRICING_FAQ.filter((item) =>
                /website|ShopSite|Local SEO|setup fee|web presence/i.test(`${item.q} ${item.a}`),
              ).map((item) => (
                <li key={item.q}>
                  <details className="rounded-xl border bg-white shadow-sm">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-navy">
                      {item.q}
                    </summary>
                    <p className="border-t px-4 py-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <>
          {PHASE_ONE_LAUNCH ? (
            <IgnitionPlanShowcase annual={annual} onAnnualChange={setAnnual} />
          ) : (
            <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.798_0.108_247_/_0.22),transparent_55%),linear-gradient(180deg,#f8fbff_0%,#ffffff_45%,#f4f8fc_100%)]"
                aria-hidden
              />
              <div className="relative mx-auto max-w-6xl">
                <div className="mx-auto max-w-2xl text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">
                    {ignitionMarketingName}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
                    Your shop plan
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                    Per location · no CRM setup fees · month-to-month
                  </p>
                </div>
                <PricingBillingToggle annual={annual} onAnnualChange={setAnnual} className="mt-10" />
                <div className="mx-auto mt-12 max-w-md">
                  {PUBLIC_PLAN_ORDER.map((planId) => (
                    <PricingPlanCard
                      key={planId}
                      planId={planId}
                      plan={PLANS[planId]}
                      annual={annual}
                      preLaunch={preLaunch}
                      compareLabel="Compare all features"
                      onCompareFeatures={() => openFeatureComparison(setFeaturesOpen)}
                    />
                  ))}
                </div>
              </div>
            </section>
          )}

          {phaseOneAddons.length > 0 ? <AiPlusShowcase compact /> : null}

          {/* Positioning after shop plan + AI — competitors lead with cards, then context */}
          <MarketPositioningSection />

          {PHASE_ONE_LAUNCH ? <CorePlanWhatsIncluded /> : null}

          {/* Companion product teaser — full offer lives on Website & SEO tab */}
          <section className="border-y border-brand-navy/8 bg-gradient-to-r from-brand-navy/[0.04] via-white to-brand-light/20 px-4 py-10 sm:px-6">
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                  {WEB_PRESENCE_MARKETING.eyebrow}
                </p>
                <p className="mt-1 text-lg font-bold text-brand-navy">
                  ShopSite &amp; Local SEO — available at launch as its own offer
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Not inside the Ignition price card. Includes Google Business Profile and local
                  Google Ads optimization when applicable. Separate monthly + launch setup.
                </p>
              </div>
              <Button
                className="shrink-0 bg-brand-navy"
                onClick={() => selectProductTab("website")}
              >
                View Website &amp; SEO
              </Button>
            </div>
          </section>

          {/* Single product preview */}
          <section className="border-y border-brand-navy/8 bg-slate-50/80 px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">The platform</p>
              <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
                Daily Snapshot, board, and approvals
              </h2>
              <p className="mt-3 text-sm text-slate-600">
                See today&apos;s work, move ROs on the kanban, and get customer yes without phone tag.
              </p>
            </div>
            <div className="mx-auto mt-10 max-w-5xl text-left">
              <PricingUiShowcase />
            </div>
          </section>

          <PlatformValueSection />

          {/* Phase one: Ignition founding scope (not an integrations partner matrix). */}
          <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6">
            {PHASE_ONE_LAUNCH ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                  Ignition launch scope
                </p>
                <h2 className="mt-2 text-lg font-semibold text-brand-navy sm:text-xl">
                  What founding shops get with {ignitionMarketingName}
                </h2>
                <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                  {preLaunch
                    ? "Q4 2026 founding invite. This is Ignition's launch checklist, not a Pro integrations matrix."
                    : "Everything below ships with Ignition. Pro-class integrations stay off this list until those plans open."}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {IGNITION_LAUNCH_HIGHLIGHTS.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-brand-navy/12 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Optional AI Plus stacks on Ignition. Licensed MOTOR, Stripe Connect, SMS, Growth Engine,
                  and similar Pro+ tools are{" "}
                  <Link
                    href="/features#coming-later"
                    className="font-medium text-brand-navy underline-offset-2 hover:underline"
                  >
                    coming later
                  </Link>
                  — not mixed into Ignition.{" "}
                  <button
                    type="button"
                    onClick={() => selectProductTab("website")}
                    className="font-medium text-brand-navy underline-offset-2 hover:underline"
                  >
                    Website &amp; SEO is a separate tab
                  </button>
                  .
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
                  Integrations
                </p>
                <p className="mt-2 text-sm text-slate-600">Works with the tools your shop already uses</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {INTEGRATION_PARTNERS.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-brand-navy/12 bg-white px-4 py-2 text-sm font-medium text-brand-navy"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          {/* Feature comparison — Ignition launch-true list in phase one */}
          <section id="feature-comparison" className="mx-auto max-w-6xl scroll-mt-8 px-4 pb-14 sm:px-6">
            <button
              type="button"
              onClick={() => setFeaturesOpen((o) => !o)}
              className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-brand-navy/15 bg-white px-6 py-3 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-light/10"
            >
              {featuresOpen ? "Hide" : "View"} {planMarketingDisplayName(ignitionPlan)} feature list
              <ChevronDown className={cn("size-4 transition", featuresOpen && "rotate-180")} />
            </button>
            {featuresOpen ? (
              <>
                {PHASE_ONE_LAUNCH ? (
                  <p className="mx-auto mt-4 max-w-xl text-center text-xs text-slate-500">
                    Launch checklist for founding shops — only what ships with Ignition. Deferred Pro/Elite
                    tools are listed separately below, not as Ignition includes. ShopSite &amp; Local SEO
                    are on the Website &amp; SEO tab — not Ignition-included.
                  </p>
                ) : null}
                <div className="mt-8 overflow-x-auto rounded-xl border bg-card shadow-sm">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/40">
                        <th className="px-4 py-3 text-left font-semibold">Feature</th>
                        {PUBLIC_PLAN_ORDER.map((id) => (
                          <th key={id} className="px-4 py-3 text-center font-semibold">
                            {planMarketingDisplayName(PLANS[id])}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row, i) => {
                        const showCategory =
                          row.category && (i === 0 || comparisonRows[i - 1]?.category !== row.category);
                        return (
                          <Fragment key={row.label}>
                            {showCategory ? (
                              <tr className="bg-brand-light/10">
                                <td
                                  colSpan={PUBLIC_PLAN_ORDER.length + 1}
                                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-navy"
                                >
                                  {row.category}
                                </td>
                              </tr>
                            ) : null}
                            <tr className="border-b border-border/60 last:border-0">
                              <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                              {PUBLIC_PLAN_ORDER.map((id) => (
                                <td key={id} className="px-4 py-2.5 text-center">
                                  <CellValue value={row.values[id]} />
                                </td>
                              ))}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {PHASE_ONE_LAUNCH ? (
                  <div className="mx-auto mt-6 max-w-3xl rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Coming later · Pro / Elite (not Ignition)
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      {IGNITION_COMING_LATER_FEATURES.map((item) => (
                        <li key={item.name}>
                          {item.name}
                          <span className="ml-1 text-xs text-slate-400">({item.note})</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-slate-500">
                      Want a site + SEO at launch? See the{" "}
                      <button
                        type="button"
                        onClick={() => selectProductTab("website")}
                        className="font-medium text-brand-navy underline-offset-2 hover:underline"
                      >
                        Website &amp; SEO
                      </button>{" "}
                      tab — separate from this CRM roadmap list.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </section>

          {/* FAQ */}
          <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
            <h2 className="text-center text-2xl font-bold text-brand-navy">Common questions</h2>
            <ul className="mt-8 space-y-2">
              {PRICING_FAQ.map((item) => (
                <li key={item.q}>
                  <details className="rounded-xl border bg-white shadow-sm">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-navy">
                      {item.q}
                    </summary>
                    <p className="border-t px-4 py-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>

          {/* CTA */}
          <section className="border-t bg-brand-light/10 px-4 py-14 sm:px-6">
            <div className="mx-auto max-w-lg text-center">
              {preLaunch ? (
                <>
                  <p className="text-xl font-bold text-brand-navy">Reserve Ignition for Q4 2026</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Launching Q4 2026 · we&apos;ll invite you at launch
                  </p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Button className="bg-brand-navy" asChild>
                      <Link href={marketingPrimaryHref(true)}>{marketingPrimaryCta({ preLaunch: true })}</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={marketingSecondaryHref(true)}>{marketingSecondaryCta(true)}</Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-brand-navy">
                    Start {ignitionMarketingName} — ${ignitionPrice}/mo
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    14-day trial · AI Plus recommended at {aiPlusPriceLabel()}
                  </p>
                  <Button className="mt-6 bg-brand-navy" asChild>
                    <Link href={marketingPrimaryHref(false)}>{marketingPrimaryCta({ preLaunch: false })}</Link>
                  </Button>
                </>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="mx-auto size-4 text-brand-navy" />
    ) : (
      <Minus className="mx-auto size-4 text-muted-foreground/40" />
    );
  }
  return <span className="text-xs font-medium">{value}</span>;
}
