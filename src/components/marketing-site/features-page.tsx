"use client";

import Link from "next/link";
import { useEffect } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";

import { AiPlusShowcase } from "@/components/marketing-site/ai-plus-showcase";
import { Button } from "@/components/ui/button";
import {
  AI_PLUS_MARKETING,
  CATEGORY_POSITIONING,
  MARKETING_LAUNCH,
  marketingPrimaryHref,
  marketingSecondaryCta,
  marketingSecondaryHref,
} from "@/lib/marketing-launch";
import {
  FEATURES_MENU_COLUMNS,
  featuresMenuHash,
  type FeaturesMenuItem,
} from "@/lib/marketing-features-menu";
import {
  PHASE_ONE_LAUNCH,
  PLANS,
  aiPlusPriceLabel,
  planMarketingDisplayName,
  shoprallyStarterPricePairLabel,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

const ignitionName = planMarketingDisplayName(PLANS.STARTER);

/** Short catalog blurbs — honest Ignition / AI Plus / Soon from plans + GROWTH-POSITIONING. */
const FEATURE_BLURBS: Record<string, string> = {
  "AI Plus":
    "Recommended Ignition add-on: freeform RO intake, labor-hour assist, and the advisor mobile app — less double-entry at the counter.",
  "Digital vehicle inspections":
    "Photo checklists customers can see — included with Ignition so approvals happen without phone tag.",
  "PartsTech catalog & punchout":
    "Search vendors and drop parts onto the RO — PartsTech ships with Ignition, not a later add-on.",
  "Carfax service history":
    "Service history on the vehicle / RO — included with Ignition for every founding shop.",
  "Email & SMS approvals":
    "Send estimate and approval links by email or two-way SMS — customers tap yes without a callback loop.",
  "Estimates & RO workspace":
    "Full repair-order workspace with jobs, labor, parts, and matrix pricing — the bay and counter stay in one login.",
  "Job board":
    "Kanban board for Estimates / WIP / Completed — drag work across the floor without a second system.",
  Appointments:
    "Keep the calendar tied to customers, vehicles, and ROs — day-to-day scheduling inside Ignition.",
  "Canned jobs & shop labor":
    "Reusable job templates and the shop labor library (not licensed MOTOR — that stays Pro+).",
  "VIN decode":
    "Unlimited NHTSA VIN decode on Ignition — plate→VIN lookup is Pro+.",
  "Inventory basics":
    "Track parts inventory basics alongside the RO — enough for most independents at launch.",
  "Live Operations Daily Snapshot":
    "Morning view of what’s open, owed, and moving — live ops without exporting to a spreadsheet.",
  "Shop reports":
    "Core shop reporting for work and money in motion — advanced analytics stay on the Pro+ roadmap.",
  "Payment tracking":
    "See paid-to-date and balance due on the RO — manual capture in-shop at Ignition launch.",
  "Customers & vehicles":
    "Unlimited customers and vehicles tied to every RO — history stays with the shop, not a sticky note.",
  "Advanced reporting":
    "Deeper analytics and custom reporting — Pro+ roadmap, not sold with founding Ignition seats.",
  "QuickBooks sync":
    "Accounting sync — roadmap only until Pro/Elite open; not on Ignition at launch.",
  "Two-way SMS":
    "Estimate, approval, and invoice threads with the customer — two-way SMS included with Ignition.",
  "Google Reviews inbox":
    "Connect Google Business Profile, sync reviews, and reply from the CRM — on Ignition. Review-request campaigns stay Pro+; AI reply drafts are Elite.",
  "Digital estimates & invoices":
    "Share digital estimates and invoices by email or SMS — transparency without printing a stack.",
  "Inspection share links":
    "Send inspection links customers can open on their phone — pairs with DVI on Ignition.",
  "Advisor mobile app":
    "ShopRally advisor app ships with AI Plus — intake and labor assist away from the desktop.",
  "Online booking":
    "Customer self-booking — Growth Engine / Pro+ roadmap, not Ignition at launch.",
};

const COMING_LATER_EXTRA = [
  "Licensed MOTOR labor data",
  "Stripe Connect card capture",
  "Growth Engine campaigns & review-request automations",
  "AI receptionist · Elite AI suite",
  "Maintenance / care programs",
] as const;

/** Legacy mega-menu / SEO hashes → first matching catalog id (aliases). */
const LEGACY_HASH_ALIASES: Record<string, string> = {
  "shop-crm": "estimates",
  operations: "daily-snapshot",
};

function availabilityLabel(item: FeaturesMenuItem): {
  label: string;
  className: string;
} {
  if (item.soon) {
    return {
      label: "Soon · Pro+",
      className: "border-slate-200 bg-slate-50 text-slate-500",
    };
  }
  if (item.badge === "AI" || item.label === "Advisor mobile app") {
    return {
      label: "AI Plus add-on",
      className: "border-brand-red/25 bg-brand-red/10 text-brand-red",
    };
  }
  return {
    label: `On ${ignitionName}`,
    className: "border-brand-navy/20 bg-brand-light/25 text-brand-navy",
  };
}

function scrollToHashTarget(hash: string) {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const resolved = LEGACY_HASH_ALIASES[id] ?? id;
  const el = document.getElementById(resolved) ?? document.getElementById(id);
  if (el) {
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start" });
    });
  }
}

export function FeaturesPageContent() {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const pricePair = shoprallyStarterPricePairLabel();
  const soonItems = FEATURES_MENU_COLUMNS.flatMap((col) =>
    col.items.filter((item) => item.soon),
  );

  // Mega-menu deep links use /features#… — scroll after client nav + same-page hash changes.
  useEffect(() => {
    const onHash = () => scrollToHashTarget(window.location.hash);
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <>
      <section className="border-b border-brand-navy/10 bg-gradient-to-b from-brand-light/15 to-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              Features catalog
            </p>
            <h1 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl lg:text-5xl">
              Everything in the Features menu — {ignitionName}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 sm:text-lg">
              Same four columns as the nav: increase revenue, operate efficiently, real-time
              insights, and delight customers. What&apos;s on {ignitionName}, what&apos;s AI Plus,
              and what&apos;s honestly Soon — {CATEGORY_POSITIONING.productLine}.
              {preLaunch ? ` Launching ${MARKETING_LAUNCH.launchQuarter}.` : ""}
            </p>
            {PHASE_ONE_LAUNCH ? (
              <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-brand-navy">
                {ignitionName} — {pricePair} · AI Plus recommended {aiPlusPriceLabel()}
              </p>
            ) : null}
          </div>

          <nav
            aria-label="Feature categories"
            className="mx-auto mt-8 flex max-w-4xl flex-wrap items-center justify-center gap-2"
          >
            {FEATURES_MENU_COLUMNS.map((col) => (
              <a
                key={col.id}
                href={`#${col.id}`}
                className="rounded-lg border border-brand-navy/15 bg-white px-3 py-1.5 text-sm font-semibold text-brand-navy shadow-sm transition-colors hover:border-brand-navy/30 hover:bg-brand-light/20"
              >
                {col.title}
              </a>
            ))}
            <a
              href="#coming-later"
              className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              Coming later
            </a>
          </nav>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="bg-brand-navy" asChild>
              <Link href={`${marketingPrimaryHref(preLaunch)}?ai=1`}>
                {AI_PLUS_MARKETING.ctaWithAi}
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-brand-navy text-brand-navy" asChild>
              <Link href="/pricing">View {ignitionName} pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <AiPlusShowcase />

      <section
        id="catalog"
        className="scroll-mt-20 border-b border-brand-navy/10 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              Full catalog
            </p>
            <h2 className="mt-2 text-3xl font-bold text-brand-navy">
              All Features menu items
            </h2>
            <p className="mt-3 text-slate-600">
              Scannable list matching the mega-menu — not a homepage teaser.{" "}
              <Link
                href="/pricing"
                className="font-semibold text-brand-navy underline-offset-2 hover:underline"
              >
                See Ignition pricing
              </Link>
              .
            </p>
          </div>

          <div className="mt-12 space-y-14">
            {FEATURES_MENU_COLUMNS.map((col) => (
              <section
                key={col.id}
                id={col.id}
                className="scroll-mt-24"
                aria-labelledby={`${col.id}-heading`}
              >
                <div className="mb-5 flex items-end justify-between gap-4 border-b border-brand-navy/10 pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-light">
                      Menu column
                    </p>
                    <h3
                      id={`${col.id}-heading`}
                      className="mt-1 text-2xl font-bold text-brand-navy"
                    >
                      {col.title}
                    </h3>
                  </div>
                  <p className="hidden text-sm text-slate-500 sm:block">
                    {col.items.length} capabilities
                  </p>
                </div>

                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {col.items.map((item) => {
                    const hash = featuresMenuHash(item.href);
                    const Icon = item.icon;
                    const blurb = FEATURE_BLURBS[item.label] ?? item.label;
                    const avail = availabilityLabel(item);
                    // AI Plus → showcase (#ai-plus). Soon ids live under #coming-later.
                    const cardId =
                      hash === "ai-plus"
                        ? "ai-plus-catalog"
                        : item.soon
                          ? undefined
                          : hash || undefined;

                    return (
                      <li key={`${col.id}-${item.label}`}>
                        <article
                          id={cardId}
                          className={cn(
                            "flex h-full flex-col rounded-xl border bg-white p-4 shadow-sm transition-colors scroll-mt-24",
                            item.soon
                              ? "border-dashed border-slate-200 bg-slate-50/80"
                              : "border-brand-navy/12 hover:border-brand-navy/25",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                                item.soon
                                  ? "bg-slate-200/80 text-slate-500"
                                  : "bg-brand-navy text-white",
                              )}
                            >
                              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <h4 className="text-base font-bold text-brand-navy">
                                  {item.label}
                                </h4>
                                {item.badge === "AI" ? (
                                  <span className="rounded bg-brand-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    AI
                                  </span>
                                ) : null}
                              </div>
                              <span
                                className={cn(
                                  "mt-1.5 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                  avail.className,
                                )}
                              >
                                {avail.label}
                              </span>
                            </div>
                          </div>
                          <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                            {blurb}
                          </p>
                          {hash === "ai-plus" ? (
                            <a
                              href="#ai-plus"
                              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
                            >
                              <Sparkles className="size-3.5 text-brand-red" aria-hidden />
                              Jump to AI Plus details
                            </a>
                          ) : null}
                          {item.soon && hash ? (
                            <a
                              href={`#${hash}`}
                              className="mt-3 text-sm font-semibold text-slate-500 underline-offset-2 hover:underline"
                            >
                              See roadmap note ↓
                            </a>
                          ) : null}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section id="coming-later" className="scroll-mt-20 bg-brand-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
              Coming later · Pro &amp; Elite
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Not on {ignitionName} at launch
            </h2>
            <p className="mt-3 text-white/75">
              Roadmap only — not sold with founding Ignition seats. Soon items from the Features
              menu land here with the same honesty as pricing.
            </p>
          </div>

          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {soonItems.map((item) => {
              const hash = featuresMenuHash(item.href);
              const Icon = item.icon;
              return (
                <li
                  key={item.label}
                  id={hash || undefined}
                  className="scroll-mt-24 rounded-xl border border-dashed border-white/25 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-brand-light" aria-hidden />
                    <h3 className="font-semibold text-white">{item.label}</h3>
                    <span className="ml-auto rounded border border-white/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                      Soon
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/70">
                    {FEATURE_BLURBS[item.label] ?? "On the Pro / Elite roadmap."}
                  </p>
                </li>
              );
            })}
          </ul>

          <ul className="mx-auto mt-8 grid max-w-2xl gap-2">
            {COMING_LATER_EXTRA.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/75"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-white/40" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-brand-navy">
          Next: pricing, walkthrough, or a founding seat
        </h2>
        <p className="mt-3 text-slate-600">
          Review {ignitionName} pricing, see how the bay workflow runs, or reserve a founding
          seat for {MARKETING_LAUNCH.launchQuarter}. Switching from another platform? See{" "}
          <Link
            href="/compare"
            className="font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            ShopRally vs Tekmetric, Garage360, Torque360, and more
          </Link>
          .
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="bg-brand-red hover:bg-brand-red/90" asChild>
            <Link href="/pricing">View pricing</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href={marketingSecondaryHref(preLaunch)}>{marketingSecondaryCta(preLaunch)}</Link>
          </Button>
          <Button variant="outline" className="border-brand-navy text-brand-navy" asChild>
            <Link href={marketingPrimaryHref(preLaunch)}>Reserve a founding seat</Link>
          </Button>
        </div>
        <p className="mt-6 text-sm text-slate-500">
          <Link href="/" className="font-medium text-brand-navy underline-offset-2 hover:underline">
            Back to ShopRally home
          </Link>
          {" · "}
          <Link
            href="/compare"
            className="font-medium text-brand-navy underline-offset-2 hover:underline"
          >
            Compare alternatives
          </Link>
        </p>
      </section>
    </>
  );
}
