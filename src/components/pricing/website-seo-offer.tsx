"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  Globe,
  MapPin,
  Package,
  Search,
  Sparkles,
} from "lucide-react";

import { WebPresenceLaunchSetupDetails, WebPresenceSetupLine } from "@/components/marketing-site/web-presence-launch-setup-details";
import { Button } from "@/components/ui/button";
import {
  MARKETING_LAUNCH,
  marketingPrimaryHref,
  marketingPrimaryCta,
} from "@/lib/marketing-launch";
import { WEB_PRESENCE_SERVICES } from "@/lib/plans";
import {
  WEB_PRESENCE_MARKETING,
  webPresenceAlaCarteLabel,
  webPresenceRequestDemoHref,
} from "@/lib/web-presence-marketing";
import { cn } from "@/lib/utils";

const SERVICE_ICONS = {
  "shopsite-monthly": Globe,
  "seo-monthly": MapPin,
  "web-seo-bundle-monthly": Package,
} as const;

const DELIVERABLE_ICONS = [Globe, Search, MapPin, Package] as const;

export function WebsiteSeoOffer({ className }: { className?: string }) {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const demoHref = webPresenceRequestDemoHref();
  const bundle = WEB_PRESENCE_SERVICES.find((s) => s.id === "web-seo-bundle-monthly");
  const secondaryHref = preLaunch ? marketingPrimaryHref(preLaunch) : "/pricing";
  const secondaryLabel = preLaunch
    ? marketingPrimaryCta({ preLaunch })
    : WEB_PRESENCE_MARKETING.ctaSecondary;

  return (
    <section
      id="website-seo"
      className={cn("sr-website-seo scroll-mt-24 border-b border-brand-navy/10", className)}
    >
      <div className="relative overflow-hidden px-4 py-14 sm:px-6 sm:py-16">
        {/* Atmosphere — navy / light-blue / red, not purple or cream */}
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,oklch(0.798_0.108_247_/_0.34),transparent_48%),radial-gradient(ellipse_at_92%_8%,oklch(0.596_0.226_25.5_/_0.08),transparent_42%),linear-gradient(180deg,#eef5fb_0%,#ffffff_48%,#f7fafc_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(oklch(0.449_0.109_249_/_0.06)_1px,transparent_1px),linear-gradient(90deg,oklch(0.449_0.109_249_/_0.06)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_50%_20%,black_20%,transparent_72%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-24 top-24 size-72 rounded-full bg-brand-light/25 blur-3xl sr-wp-drift"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-10 size-64 rounded-full bg-brand-navy/10 blur-3xl sr-wp-drift-slow"
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl">
          {/* Outcome header + signature local-pack preview */}
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <header className="sr-wp-fade">
              <p className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/15 bg-white/90 px-3 py-1 text-xs font-semibold text-brand-navy shadow-sm">
                <Sparkles className="size-3.5 text-brand-red" aria-hidden />
                {WEB_PRESENCE_MARKETING.eyebrow}
              </p>
              <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
                {WEB_PRESENCE_MARKETING.headline}
              </h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {WEB_PRESENCE_MARKETING.subhead}
              </p>
              {preLaunch ? (
                <p className="mt-3 text-sm font-medium text-brand-navy/75">
                  Available at the Q4 2026 launch window — request interest now. Not bundled into
                  Ignition founding seats.
                </p>
              ) : null}
              <p className="mt-4 max-w-lg border-l-2 border-brand-light pl-3 text-sm leading-snug text-slate-600">
                {WEB_PRESENCE_MARKETING.agencyContrast}
              </p>
            </header>

            {/* Signature: local search outcome — visual “get found” without fake meters */}
            <aside
              className="sr-wp-fade sr-wp-fade-delay-1 rounded-2xl border border-brand-navy/12 bg-white/95 p-4 shadow-[0_20px_50px_-28px_rgba(22,88,142,0.45)] ring-1 ring-brand-navy/5"
              aria-hidden
            >
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <Search className="size-3.5 text-brand-navy" />
                <span className="truncate">auto repair near me</span>
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="rounded-xl border border-brand-red/25 bg-gradient-to-br from-brand-light/20 to-white p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-brand-navy">Your shop name</p>
                      <p className="mt-0.5 text-[11px] font-medium text-brand-navy/70">
                        Open · Auto repair · 4.8 ★
                      </p>
                    </div>
                    <span className="rounded-md bg-brand-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Local
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Branded site · Google Business Profile · book from search
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-md bg-brand-navy px-2.5 py-1 text-[11px] font-semibold text-white">
                      Website
                    </span>
                    <span className="rounded-md border border-brand-navy/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-navy">
                      Directions
                    </span>
                    <span className="rounded-md border border-brand-navy/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-navy">
                      Call
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-dashed border-brand-navy/15 px-3 py-2 text-[11px] text-slate-500">
                  Companion offer — not sold inside Ignition CRM
                </div>
              </div>
            </aside>
          </div>

          {/* Reciprocity: deliverables before CTA */}
          <div className="mt-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/45">
              {WEB_PRESENCE_MARKETING.valueLead}
            </p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {WEB_PRESENCE_MARKETING.whatYouGet.map((item, index) => {
                const Icon = DELIVERABLE_ICONS[index] ?? Package;
                return (
                  <li
                    key={item.title}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-brand-navy/10 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-navy/20 hover:shadow-[0_16px_36px_-24px_rgba(22,88,142,0.45)]",
                      "sr-wp-fade",
                      index === 0 && "sr-wp-fade-delay-1",
                      index === 1 && "sr-wp-fade-delay-2",
                      index === 2 && "sr-wp-fade-delay-3",
                      index === 3 && "sr-wp-fade-delay-4",
                    )}
                  >
                    <div
                      className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-navy via-brand-light to-brand-red opacity-80"
                      aria-hidden
                    />
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-lg bg-brand-navy/8 text-brand-navy transition group-hover:bg-brand-light/40">
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <h3 className="text-sm font-bold text-brand-navy">{item.title}</h3>
                    </div>
                    <ul className="mt-3.5 flex flex-col gap-0.5">
                      {item.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 rounded-md py-1 text-[13px] leading-snug tracking-[-0.01em] text-slate-700"
                        >
                          <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand-light/50 text-brand-navy">
                            <Check className="size-2.5" strokeWidth={3} aria-hidden />
                          </span>
                          <span className="min-w-0">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Pricing — Ignition-style bullet cards, horizontal on desktop */}
          <div className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/45">
                  Pick a plan
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Flat monthly rates · one-time launch setup · billed apart from Ignition
                </p>
              </div>
              {bundle ? (
                <p className="text-xs font-medium text-brand-navy/70">
                  Bundle {bundle.priceLabel} vs {webPresenceAlaCarteLabel()}
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {WEB_PRESENCE_SERVICES.map((service, index) => {
                const Icon =
                  SERVICE_ICONS[service.id as keyof typeof SERVICE_ICONS] ?? Package;
                const featured = service.id === "web-seo-bundle-monthly";
                return (
                  <article
                    key={service.id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-2xl border bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-0.5",
                      featured
                        ? "border-brand-red/40 shadow-[0_18px_44px_-26px_rgba(231,34,46,0.45)] ring-1 ring-brand-red/15"
                        : "border-brand-navy/12 hover:border-brand-navy/25 hover:shadow-[0_16px_36px_-24px_rgba(22,88,142,0.4)]",
                      "sr-wp-fade",
                      index === 0 && "sr-wp-fade-delay-3",
                      index === 1 && "sr-wp-fade-delay-4",
                      index === 2 && "sr-wp-fade-delay-5",
                    )}
                  >
                    {featured ? (
                      <div
                        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-red via-brand-light to-brand-navy"
                        aria-hidden
                      />
                    ) : null}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "flex size-8 items-center justify-center rounded-lg",
                            featured
                              ? "bg-brand-red/10 text-brand-red"
                              : "bg-brand-navy/8 text-brand-navy",
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <h3 className="text-base font-bold text-brand-navy">{service.name}</h3>
                      </div>
                      {featured ? (
                        <span className="rounded-full bg-brand-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          Best value
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-3 text-[2rem] font-bold leading-none tracking-tight text-brand-navy">
                      {service.priceLabel}
                    </p>
                    <WebPresenceSetupLine setupCents={service.setupCents} />

                    <div className="mt-4 flex-1 border-t border-slate-200 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        What&apos;s included
                      </p>
                      <ul className="mt-2.5 flex flex-col gap-0.5">
                        {service.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex items-start gap-2.5 rounded-md px-0.5 py-1.5 text-[13px] leading-snug tracking-[-0.01em] text-slate-700"
                          >
                            <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-brand-light/50 text-brand-navy">
                              <Check className="size-2.5" strokeWidth={3} aria-hidden />
                            </span>
                            <span className="min-w-0">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {service.savingsNote ? (
                      <p className="mt-3 text-[11px] font-medium leading-snug text-brand-navy/70">
                        {service.savingsNote}
                      </p>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            {WEB_PRESENCE_MARKETING.honestyNote}
          </p>

          <div className="mt-6 max-w-2xl">
            <WebPresenceLaunchSetupDetails />
          </div>

          {/* One primary CTA; secondary demoted to text */}
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6">
            <Button
              size="lg"
              className="h-12 gap-2 bg-brand-red px-6 text-base font-semibold shadow-[0_12px_28px_-14px_rgba(231,34,46,0.7)] hover:bg-brand-red/90"
              asChild
            >
              <Link href={demoHref}>
                {WEB_PRESENCE_MARKETING.ctaPrimary}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Link
              href={secondaryHref}
              className="text-sm font-medium text-brand-navy/70 underline-offset-4 transition hover:text-brand-navy hover:underline"
            >
              {secondaryLabel} →
            </Link>
          </div>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-500">
            {WEB_PRESENCE_MARKETING.ctaHint}
          </p>
        </div>
      </div>
    </section>
  );
}
