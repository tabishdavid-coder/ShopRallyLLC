"use client";

import Link from "next/link";
import { Check, Minus, Sparkles, ArrowRight } from "lucide-react";

import {
  CORE_OFFERING_MOCK,
  type CoreOfferingGroup,
} from "@/lib/core-plan-offering-proposal";
import { cn } from "@/lib/utils";

function GroupCard({ group }: { group: CoreOfferingGroup }) {
  return (
    <section
      id={group.id}
      className="scroll-mt-24 border-b border-brand-navy/10 py-10 last:border-b-0 sm:py-12"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] lg:gap-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-red">
            Included
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-brand-navy sm:text-3xl">
            {group.title}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600 sm:text-base">
            {group.blurb}
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {group.items.map((item) => (
            <li
              key={item.name}
              className={cn(
                "flex gap-2.5 rounded-md px-2.5 py-2",
                item.highlight && "bg-brand-navy/[0.04] ring-1 ring-brand-navy/10",
              )}
            >
              <Check
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  item.highlight ? "text-brand-red" : "text-brand-navy",
                )}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-brand-navy">{item.name}</span>
                {item.detail ? (
                  <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.detail}</span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Review-only mockup — not live /pricing until you approve. */
export function CorePlanOfferingMockup() {
  const m = CORE_OFFERING_MOCK;
  const totalFeatures = m.groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="min-h-svh bg-[#F7FAFD] text-slate-900">
      {/* Atmosphere */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_0%,oklch(0.798_0.108_247_/_0.28),transparent_50%),radial-gradient(ellipse_at_90%_10%,oklch(0.596_0.226_25.5_/_0.08),transparent_40%),linear-gradient(180deg,#eef5fc_0%,#F7FAFD_35%,#ffffff_100%)]"
        aria-hidden
      />

      <header className="border-b border-brand-navy/10 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-navy">
              Live catalog mirror
            </p>
            <p className="text-sm font-semibold text-brand-navy">
              Core plan offering — deep feature breakdown
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href="/pricing"
              className="rounded-md border border-brand-navy/15 bg-white px-3 py-1.5 font-medium text-brand-navy hover:bg-brand-navy/5"
            >
              Current /pricing
            </Link>
            <a
              href="#card-preview"
              className="rounded-md bg-brand-navy px-3 py-1.5 font-medium text-white hover:bg-brand-navy/90"
            >
              Jump to card preview
            </a>
          </div>
        </div>
      </header>

      {/* Hero composition */}
      <section className="relative overflow-hidden border-b border-brand-navy/10">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:py-20">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-brand-navy/5 px-3 py-1 text-xs font-semibold text-brand-navy">
              <Sparkles className="size-3.5" aria-hidden />
              Live · wired to PLANS.STARTER · {totalFeatures}+ capabilities
            </div>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-brand-navy sm:text-5xl sm:leading-[1.08]">
              ShopRally{" "}
              <span className="bg-gradient-to-r from-brand-navy to-[#4A8FCB] bg-clip-text text-transparent">
                {m.planName}
              </span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              {m.tagline}
            </p>
            <p className="mt-2 text-sm text-slate-500">{m.bestFor}</p>
            <div className="mt-8 flex flex-wrap items-end gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Monthly
                </p>
                <p className="text-4xl font-bold tabular-nums text-brand-navy">${m.priceMonthly}</p>
              </div>
              <div className="pb-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Annual
                </p>
                <p className="text-xl font-semibold tabular-nums text-brand-navy">
                  ${m.priceAnnualMonthly}
                  <span className="text-sm font-normal text-slate-500">/mo</span>
                </p>
              </div>
              <p className="pb-1.5 text-xs text-slate-500">{m.priceNote}</p>
            </div>
          </div>

          <aside className="rounded-xl border border-brand-navy/15 bg-white/90 p-5 shadow-[0_12px_40px_-20px_rgba(22,88,142,0.45)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-navy">
              Why expand the list
            </p>
            <ul className="mt-3 space-y-2.5 text-sm leading-snug text-slate-600">
              <li>
                Today’s card shows ~10 bullets — customers under-count DVIs, approvals, job board,
                GP, assignments, inventory, and snapshot.
              </li>
              <li>
                This mock breaks Core into <strong className="font-semibold text-brand-navy">{m.groups.length} groups</strong> so
                every shipped surface is visible before Pro upsells.
              </li>
              <li>Red checks = hero value props. Gray “Not on Core” block stays honest.</li>
            </ul>
            <a
              href="#groups"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-navy hover:underline"
            >
              Browse all groups
              <ArrowRight className="size-3.5" aria-hidden />
            </a>
          </aside>
        </div>
      </section>

      {/* Group nav */}
      <nav
        className="sticky top-0 z-20 border-b border-brand-navy/10 bg-white/85 backdrop-blur-md"
        aria-label="Feature groups"
      >
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {m.groups.map((g) => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-brand-navy/5 hover:text-brand-navy"
            >
              {g.title}
            </a>
          ))}
        </div>
      </nav>

      <div id="groups" className="mx-auto max-w-6xl px-4 sm:px-6">
        {m.groups.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </div>

      {/* AI Plus + not included */}
      <section className="border-y border-brand-navy/10 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2">
          <div className="rounded-xl border-2 border-brand-navy/20 bg-gradient-to-br from-brand-navy/[0.06] to-brand-light/20 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-red">
              Optional add-on
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-navy">
              {m.addon.name}{" "}
              <span className="text-lg font-medium text-slate-500">{m.addon.price}</span>
            </h2>
            <p className="mt-2 text-sm text-slate-600">{m.addon.blurb}</p>
            <ul className="mt-4 space-y-2">
              {m.addon.items.map((item) => (
                <li key={item.name} className="flex gap-2 text-sm text-brand-navy">
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-red" aria-hidden />
                  {item.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Not on Core
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-800">Upgrade later</h2>
            <p className="mt-2 text-sm text-slate-600">
              Keep Core honest — these stay on Pro / Elite / add-ons.
            </p>
            <ul className="mt-4 space-y-2">
              {m.notIncluded.map((item) => (
                <li key={item.name} className="flex items-start gap-2 text-sm text-slate-600">
                  <Minus className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                  <span>
                    {item.name}
                    <span className="ml-1.5 text-xs font-medium text-slate-400">{item.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Proposed short card */}
      <section id="card-preview" className="scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-red">
              /pricing card proposal
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-brand-navy">
              Compact card + deep breakdown
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Keep the purchase card scannable (~10 bullets). Link “See everything included” to the
              full group list above — or expand below the fold on /pricing after you approve.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="rounded-2xl border-2 border-brand-navy bg-white p-6 shadow-[0_20px_50px_-28px_rgba(22,88,142,0.55)]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-red">
                Shop plan
              </p>
              <h3 className="mt-1 text-2xl font-bold text-brand-navy">
                {m.marketingName}{" "}
                <span className="text-base font-medium text-slate-500">({m.planName})</span>
              </h3>
              <p className="mt-1 text-sm text-slate-500">{m.bestFor}</p>
              <p className="mt-4 text-4xl font-bold tabular-nums text-brand-navy">
                ${m.priceMonthly}
                <span className="text-base font-normal text-slate-500">/mo</span>
              </p>
              <ul className="mt-6 space-y-2.5">
                {m.proposedCardBullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-navy" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-center text-xs font-semibold text-brand-navy">
                See all {totalFeatures}+ included features ↓
              </p>
            </div>

            <div className="flex flex-col justify-center rounded-2xl border border-brand-navy/15 bg-brand-navy/[0.03] p-6">
              <h3 className="text-lg font-semibold text-brand-navy">Approval checklist</h3>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-600">
                <li>Edit group names / items in this mock if anything is overstated.</li>
                <li>Confirm AI Plus stays Core-only at $20/mo.</li>
                <li>Confirm “Not on Core” list matches sales conversation.</li>
                <li>
                  After you say go: wire `proposedCardBullets` + group copy into `plans.ts` /
                  `/pricing` / Subscription panel system-wide.
                </li>
              </ol>
              <p className="mt-6 text-xs text-slate-500">
                Source of truth for this mock:{" "}
                <code className="rounded bg-white px-1.5 py-0.5 text-[11px] text-brand-navy">
                  src/lib/core-plan-offering-proposal.ts
                </code>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-brand-navy/10 bg-white py-8 text-center text-xs text-slate-500">
        Live catalog: card bullets come from{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-brand-navy">
          PLANS.STARTER.pricingCard.bullets
        </code>
        . This page is the deep breakdown also shown on{" "}
        <a href="/pricing#core-whats-included" className="font-medium text-brand-navy hover:underline">
          /pricing
        </a>
        .
      </footer>
    </div>
  );
}
