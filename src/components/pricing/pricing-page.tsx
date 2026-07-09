"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Minus, Sparkles } from "lucide-react";

import { HeroPlatformPreview } from "@/components/marketing-site/hero-platform-preview";
import { PlatformValueSection } from "@/components/marketing-site/platform-value-section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { foundingSpotsRemaining, getFoundingSpotMessaging, MARKETING_LAUNCH } from "@/lib/marketing-launch";
import {
  COMPARISON_ROWS,
  INTEGRATION_PARTNERS,
  PLAN_ORDER,
  PLANS,
  PRICING_FAQ,
  WEB_PRESENCE_SERVICES,
  annualSavingsDollars,
  annualSavingsPercent,
  planDisplayPrice,
  repairPilotStarterMonthly,
  webPresenceAlaCarteMonthlyCents,
} from "@/lib/plans";
import { WebPresenceLaunchSetupDetails, WebPresenceSetupLine } from "@/components/marketing-site/web-presence-launch-setup-details";

export function PricingPageContent({ foundingSpotsClaimed = 0 }: { foundingSpotsClaimed?: number }) {
  const [annual, setAnnual] = useState(true);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const foundingRemaining = foundingSpotsRemaining(foundingSpotsClaimed);
  const foundingMessaging = getFoundingSpotMessaging(foundingSpotsClaimed);
  const samplePlan = PLANS.PROFESSIONAL;

  return (
    <div>
      {/* Hero — copy first, calm and centered */}
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/5 px-3 py-1 text-xs font-semibold text-brand-red">
            <Sparkles className="size-3.5" />
            {preLaunch ? foundingMessaging.primary : "Per-location pricing"}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
            Simple plans for independent shops
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Three tiers — {PLANS.STARTER.name}, {PLANS.PROFESSIONAL.name}, and {PLANS.ENTERPRISE.name}. CRM,
            marketing, and AI in one monthly bill. From ${repairPilotStarterMonthly(annual)}/mo per location.
          </p>

          <BillingToggle annual={annual} onAnnualChange={setAnnual} samplePlan={samplePlan} />

          <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-slate-600 sm:text-sm">
            {["No CRM setup fees", "In-depth training on every plan", "Cancel anytime", "Founding rates on annual"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-brand-navy" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Plan cards */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <p className="text-center text-sm text-slate-600">
          {preLaunch
            ? `${foundingRemaining} founding spots · ${foundingMessaging.secondary}`
            : `14-day trial · ${annual ? "annual" : "monthly"} billing per location`}
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {PLAN_ORDER.map((planId) => {
            const plan = PLANS[planId];
            const price = planDisplayPrice(plan, annual);
            const yearSaved = annualSavingsDollars(plan);
            const isPopular = plan.popular;
            const isTop = planId === "ENTERPRISE";

            return (
              <div
                key={planId}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm",
                  isPopular && "border-brand-navy ring-2 ring-brand-navy/20",
                  isTop && "border-brand-red/25 ring-1 ring-brand-red/15",
                )}
              >
                {isPopular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-red px-3 py-0.5 text-xs font-semibold text-white">
                    Most popular
                  </span>
                ) : isTop ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-navy px-3 py-0.5 text-xs font-semibold text-white">
                    Full stack
                  </span>
                ) : null}

                <h2 className="text-xl font-bold text-brand-navy">{plan.name}</h2>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-red/80">
                  {plan.subtitle}
                </p>
                <p className="mt-2 text-sm text-slate-600">{plan.tagline}</p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums text-brand-navy">{price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {annual ? `Billed annually · save $${yearSaved}/yr` : "Billed monthly"}
                </p>
                {plan.savingsNote ? (
                  <p className="mt-2 text-xs font-medium text-brand-red">{plan.savingsNote}</p>
                ) : null}

                <ul className="mt-6 flex-1 space-y-2">
                  {plan.highlights.map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-slate-700">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-navy" />
                      {h}
                    </li>
                  ))}
                </ul>

                <Button
                  className={cn("mt-6 w-full", isPopular && "bg-brand-navy")}
                  variant={isPopular ? "default" : "outline"}
                  asChild
                >
                  <Link href={preLaunch ? MARKETING_LAUNCH.primaryHref : "/signup"}>
                    {preLaunch ? MARKETING_LAUNCH.primaryCta : "Start 14-day trial"}
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Web presence — separate monthly subscriptions */}
      <section className="border-y border-brand-navy/8 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">Web presence</p>
          <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
            ShopSite and Local SEO — always monthly
          </h2>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Your CRM plan covers the shop floor. Add a hosted website and local SEO as separate monthly
            subscriptions — or get both on {PLANS.ENTERPRISE.name} (launch setup included).
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {WEB_PRESENCE_SERVICES.map((service) => {
            const isBundle = service.id === "web-seo-bundle-monthly";
            return (
              <div
                key={service.id}
                className={cn(
                  "flex flex-col rounded-xl border bg-white p-6 shadow-sm",
                  isBundle ? "border-brand-red/30 ring-1 ring-brand-red/20" : "border-brand-navy/12",
                )}
              >
                {isBundle ? (
                  <span className="mb-3 inline-flex w-fit rounded-full bg-brand-red/10 px-2.5 py-0.5 text-xs font-semibold text-brand-red">
                    Best value
                  </span>
                ) : null}
                <h3 className="text-lg font-bold text-brand-navy">{service.name}</h3>
                <p className="mt-1 text-2xl font-bold text-brand-navy">{service.priceLabel}</p>
                <WebPresenceSetupLine setupCents={service.setupCents} />
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{service.description}</p>
                {service.savingsNote ? (
                  <p className="mt-3 text-xs font-medium text-brand-navy/80">{service.savingsNote}</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-slate-500">
          À la carte total ${(webPresenceAlaCarteMonthlyCents() / 100).toFixed(0)}/mo · billed separately from
          your CRM tier · cancel either subscription anytime
        </p>
        <div className="mx-auto mt-6 max-w-2xl">
          <WebPresenceLaunchSetupDetails />
        </div>
      </section>

      {/* Single product preview */}
      <section className="border-y border-brand-navy/8 bg-slate-50/80 px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">The platform</p>
          <h2 className="mt-2 text-2xl font-bold text-brand-navy sm:text-3xl">
            Job board to invoice — one screen
          </h2>
          <p className="mt-3 text-sm text-slate-600">
            Repair orders, inspections, payments, and Growth Engine marketing share the same customer record.
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
      </section>

      {/* Feature comparison — opt-in */}
      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <button
          type="button"
          onClick={() => setFeaturesOpen((o) => !o)}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-full border border-brand-navy/15 bg-white px-6 py-3 text-sm font-semibold text-brand-navy shadow-sm hover:bg-brand-light/10"
        >
          {featuresOpen ? "Hide" : "View"} full feature comparison
          <ChevronDown className={cn("size-4 transition", featuresOpen && "rotate-180")} />
        </button>
        {featuresOpen ? (
          <div className="mt-8 overflow-x-auto rounded-xl border bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-semibold">Feature</th>
                  {PLAN_ORDER.map((id) => (
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
                            colSpan={PLAN_ORDER.length + 1}
                            className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-navy"
                          >
                            {row.category}
                          </td>
                        </tr>
                      ) : null}
                      <tr className="border-b border-border/60 last:border-0">
                        <td className="px-4 py-2.5 text-muted-foreground">{row.label}</td>
                        {PLAN_ORDER.map((id) => (
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
              <p className="text-xl font-bold text-brand-navy">Try {PLANS.PROFESSIONAL.name} free for 14 days</p>
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

function BillingToggle({
  annual,
  onAnnualChange,
  samplePlan,
}: {
  annual: boolean;
  onAnnualChange: (v: boolean) => void;
  samplePlan: (typeof PLANS)[keyof typeof PLANS];
}) {
  return (
    <div className="mt-8 inline-flex items-center gap-2 rounded-full border bg-white p-1 shadow-sm">
      {(["Monthly", "Annual"] as const).map((label, i) => {
        const isAnnual = i === 1;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onAnnualChange(isAnnual)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition",
              annual === isAnnual ? "bg-brand-navy text-white" : "text-slate-500 hover:text-brand-navy",
            )}
          >
            {label}
          </button>
        );
      })}
      <span className="hidden pr-2 text-xs font-medium text-brand-red sm:inline">
        Save {annualSavingsPercent(samplePlan)}% annual
      </span>
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
