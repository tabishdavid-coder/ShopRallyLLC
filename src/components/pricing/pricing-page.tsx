"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Minus, Sparkles } from "lucide-react";

import { HeroPlatformPreview } from "@/components/marketing-site/hero-platform-preview";
import { MarketPositioningSection } from "@/components/marketing-site/market-positioning-section";
import { PlatformValueSection } from "@/components/marketing-site/platform-value-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { foundingSpotsRemaining, getFoundingSpotMessaging, MARKETING_LAUNCH } from "@/lib/marketing-launch";
import {
  COMPARISON_ROWS,
  COMPETITOR_BENCHMARK,
  INTEGRATION_PARTNERS,
  PHASE_ONE_COPY,
  PHASE_ONE_LAUNCH,
  PLANS,
  PRICING_FAQ,
  PUBLIC_PLAN_ORDER,
  WEB_PRESENCE_SERVICES,
  publicPlanAddons,
  repairPilotStarterMonthly,
  webPresenceAlaCarteMonthlyCents,
} from "@/lib/plans";
import { WebPresenceLaunchSetupDetails, WebPresenceSetupLine } from "@/components/marketing-site/web-presence-launch-setup-details";
import { PricingBillingToggle } from "@/components/pricing/pricing-billing-toggle";
import { PricingPlanCard } from "@/components/pricing/pricing-plan-card";

function openFeatureComparison(setFeaturesOpen: (v: boolean | ((o: boolean) => boolean)) => void) {
  setFeaturesOpen(true);
  requestAnimationFrame(() => {
    document.getElementById("feature-comparison")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function PricingPageContent({ foundingSpotsClaimed = 0 }: { foundingSpotsClaimed?: number }) {
  const [annual, setAnnual] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const foundingRemaining = foundingSpotsRemaining(foundingSpotsClaimed);
  const foundingMessaging = getFoundingSpotMessaging(foundingSpotsClaimed);
  const ignitionPrice = repairPilotStarterMonthly(annual);
  const ignitionPlan = PLANS.STARTER;
  const phaseOneAddons = publicPlanAddons();
  const legacyStack = COMPETITOR_BENCHMARK.legacy.typicalMonthly;
  const budgetStack = COMPETITOR_BENCHMARK.typicalStackMonthly;
  const entryCrm = COMPETITOR_BENCHMARK.entryCrmMonthly;

  return (
    <div>
      {/* Hero — phase-one single plan */}
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/5 px-3 py-1 text-xs font-semibold text-brand-red">
            <Sparkles className="size-3.5" />
            {preLaunch ? foundingMessaging.primary : "Phase one · one plan"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            {PHASE_ONE_COPY.headline}
            <span className="mt-2 block pb-1 leading-[1.15] bg-gradient-to-r from-brand-navy to-brand-light bg-clip-text text-transparent">
              {ignitionPlan.name} — ${ignitionPrice}/mo
            </span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            {PHASE_ONE_COPY.subhead}
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legacy stack</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-slate-500">~${legacyStack}/mo</p>
              <p className="mt-1 text-[11px] text-slate-500">{COMPETITOR_BENCHMARK.legacy.examples}</p>
            </div>
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">Budget CRM + bolt-ons</p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-amber-900 line-through decoration-brand-red/35">
                ~${budgetStack}/mo
              </p>
              <p className="mt-1 text-[11px] text-amber-900/80">Garage360 / Torque360 + marketing extras</p>
            </div>
            <div className="rounded-xl border-2 border-brand-navy/20 bg-brand-navy/5 p-4 text-left ring-1 ring-brand-navy/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
                ShopRally {ignitionPlan.name}
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-brand-navy">${ignitionPrice}/mo</p>
              <p className="mt-1 text-[11px] text-slate-600">vs ~${entryCrm}/mo entry DVI-class CRMs</p>
            </div>
          </div>

          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-600 sm:text-sm">
            {[
              "No CRM setup fees",
              "Cancel anytime",
              "AI Plus optional +$20/mo",
              "Pro & Elite tiers coming later",
            ].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-brand-navy" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <MarketPositioningSection />

      {/* Plan card — single plan centered */}
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.798_0.108_247_/_0.22),transparent_55%),linear-gradient(180deg,#f8fbff_0%,#ffffff_45%,#f4f8fc_100%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">
              {ignitionPlan.name}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              Your shop plan
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {preLaunch
                ? `${foundingRemaining} founding spots · ${foundingMessaging.secondary}`
                : "Per location · no CRM setup fees · month-to-month"}
            </p>
          </div>

          <PricingBillingToggle
            annual={annual}
            onAnnualChange={setAnnual}
            className="mt-10"
          />

          <div className="mx-auto mt-12 max-w-md">
            {PUBLIC_PLAN_ORDER.map((planId) => (
              <PricingPlanCard
                key={planId}
                planId={planId}
                plan={PLANS[planId]}
                annual={annual}
                preLaunch={preLaunch}
                onCompareFeatures={() => openFeatureComparison(setFeaturesOpen)}
              />
            ))}
          </div>

          {/* AI Plus add-on */}
          {phaseOneAddons.length > 0 ? (
            <div className="mx-auto mt-14 max-w-2xl">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-red">
                  {PHASE_ONE_COPY.addonHeadline}
                </p>
                <h3 className="mt-2 text-2xl font-bold text-brand-navy">Stack AI when you&apos;re ready</h3>
                <p className="mt-2 text-sm text-slate-600">{PHASE_ONE_COPY.addonSubhead}</p>
              </div>
              <div className="mt-8 grid gap-4">
                {phaseOneAddons.map((addon) => (
                  <div
                    key={addon.id}
                    className="flex flex-col gap-3 rounded-2xl border border-brand-navy/15 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <h4 className="text-lg font-bold text-brand-navy">{addon.name}</h4>
                      <p className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">{addon.priceLabel}</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{addon.description}</p>
                      {addon.vsIndustry ? (
                        <p className="mt-2 text-xs font-medium text-brand-navy/70">{addon.vsIndustry}</p>
                      ) : null}
                    </div>
                    <Button variant="outline" className="shrink-0 border-brand-navy text-brand-navy" asChild>
                      <Link href={preLaunch ? MARKETING_LAUNCH.primaryHref : "/signup"}>
                        {preLaunch ? "Join waitlist" : "Add with trial"}
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-slate-500">
                Total with AI Plus: ${(ignitionPrice + 20).toFixed(2)}/mo{annual ? " (annual billing on base plan)" : ""}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* Web presence — de-emphasized in phase one */}
      {!PHASE_ONE_LAUNCH ? (
        <section className="border-y border-brand-navy/8 bg-white px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Web presence</p>
            <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
              ShopSite and Local SEO — always monthly
            </h2>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
            {WEB_PRESENCE_SERVICES.map((service) => (
              <div key={service.id} className="flex flex-col rounded-xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-brand-navy">{service.name}</h3>
                <p className="mt-1 text-2xl font-bold text-brand-navy">{service.priceLabel}</p>
                <WebPresenceSetupLine setupCents={service.setupCents} />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{service.description}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500">
            À la carte total ${(webPresenceAlaCarteMonthlyCents() / 100).toFixed(0)}/mo · billed separately
          </p>
          <div className="mx-auto mt-6 max-w-2xl">
            <WebPresenceLaunchSetupDetails />
          </div>
        </section>
      ) : null}

      {/* Single product preview */}
      <section className="border-y border-brand-navy/8 bg-slate-50/80 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">The platform</p>
          <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
            Job board to invoice — one screen
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Repair orders, inspections, and customer history share the same record from day one.
          </p>
        </div>
        <div className="mx-auto mt-10 max-w-5xl">
          <HeroPlatformPreview className="mt-0" />
        </div>
      </section>

      <PlatformValueSection />

      {/* Integrations */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Integrations</p>
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
        {PHASE_ONE_LAUNCH ? (
          <p className="mt-4 text-xs text-slate-500">
            PartsTech, Stripe Connect, and Growth Engine ship on Pro & Elite — coming in a later phase.
          </p>
        ) : null}
      </section>

      {/* Feature comparison — Ignition only in phase one */}
      <section id="feature-comparison" className="mx-auto max-w-6xl scroll-mt-8 px-4 pb-14 sm:px-6">
        <button
          type="button"
          onClick={() => setFeaturesOpen((o) => !o)}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-brand-navy/15 bg-white px-6 py-3 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-light/10"
        >
          {featuresOpen ? "Hide" : "View"} {ignitionPlan.name} feature list
          <ChevronDown className={cn("size-4 transition", featuresOpen && "rotate-180")} />
        </button>
        {featuresOpen ? (
          <div className="mt-8 overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold">Feature</th>
                  {PUBLIC_PLAN_ORDER.map((id) => (
                    <th key={id} className="px-4 py-3 text-center font-semibold">
                      {PLANS[id].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => {
                  const showCategory =
                    row.category && (i === 0 || COMPARISON_ROWS[i - 1]?.category !== row.category);
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
              <p className="text-xl font-bold text-brand-navy">Join the founding shop waitlist</p>
              <p className="mt-2 text-sm text-slate-600">{foundingRemaining} spots remaining</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Button className="bg-brand-navy" asChild>
                  <Link href={MARKETING_LAUNCH.primaryHref}>{MARKETING_LAUNCH.primaryCta}</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={MARKETING_LAUNCH.secondaryHref}>{MARKETING_LAUNCH.secondaryCta}</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xl font-bold text-brand-navy">
                Start {ignitionPlan.name} — ${ignitionPrice}/mo
              </p>
              <p className="mt-2 text-sm text-slate-600">14-day trial · add AI Plus anytime for $20/mo</p>
              <Button className="mt-6 bg-brand-navy" asChild>
                <Link href="/signup">Start trial</Link>
              </Button>
            </>
          )}
        </div>
      </section>
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
