import Link from "next/link";
import { CheckCircle2, Smartphone, Sparkles, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AI_PLUS_MARKETING,
  MARKETING_LAUNCH,
  marketingPrimaryHref,
} from "@/lib/marketing-launch";
import { aiPlusPriceLabel, shoprallyStarterMonthly } from "@/lib/plans";
import { cn } from "@/lib/utils";

type AiPlusShowcaseProps = {
  className?: string;
  /** denser layout for pricing page */
  compact?: boolean;
};

/**
 * AI Plus sell block — live-UI-inspired teaser (not a full product dump).
 * Mirrors freeform intake / Parse with AI without exposing the full model.
 */
export function AiPlusShowcase({ className, compact }: AiPlusShowcaseProps) {
  const preLaunch = MARKETING_LAUNCH.preLaunch;
  const ignitionMo = shoprallyStarterMonthly(true);

  return (
    <section
      id="ai-plus"
      className={cn(
        "scroll-mt-20 border-y border-brand-navy/10 bg-gradient-to-b from-brand-navy/[0.04] via-white to-brand-light/10",
        className,
      )}
    >
      <div className={cn("mx-auto max-w-7xl px-4 sm:px-6", compact ? "py-14" : "py-16 sm:py-20")}>
        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-red">
            <Sparkles className="size-3.5" aria-hidden />
            {AI_PLUS_MARKETING.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            {AI_PLUS_MARKETING.headline}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">{AI_PLUS_MARKETING.subhead}</p>
          <p className="mt-2 text-sm font-semibold text-brand-navy">{AI_PLUS_MARKETING.priceNote}</p>
          <p className="mt-1 text-xs text-slate-500">
            {AI_PLUS_MARKETING.bundleHint(ignitionMo)} · {AI_PLUS_MARKETING.easeLine}
          </p>
        </div>

        <div className="mt-12 grid items-start gap-10 lg:grid-cols-2">
          <AiIntakeTeaser />
          <div>
            <ul className="space-y-4">
              {AI_PLUS_MARKETING.benefits.map((b) => (
                <li key={b.title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-navy" aria-hidden />
                  <div>
                    <p className="font-semibold text-brand-navy">{b.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{b.detail}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" className="gap-2 bg-brand-navy hover:bg-brand-navy/90" asChild>
                <Link href={`${marketingPrimaryHref(preLaunch)}?ai=1`}>
                  {AI_PLUS_MARKETING.ctaWithAi}
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-brand-navy/30 text-brand-navy"
                asChild
              >
                <Link href={marketingPrimaryHref(preLaunch)}>{AI_PLUS_MARKETING.ctaIgnitionOnly}</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              AI Plus is {aiPlusPriceLabel()} — include it when you reserve. Ignition alone is fine;
              add AI at launch if you prefer.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Desktop intake mock + phone advisor tease — styled like live UI, results veiled. */
function AiIntakeTeaser() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border-2 border-brand-navy/15 bg-white shadow-xl shadow-brand-navy/10">
        <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-brand-navy px-4 py-2.5">
          <Sparkles className="size-3.5 text-brand-light" aria-hidden />
          <span className="text-xs font-semibold text-white">Smart AI intake</span>
          <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-brand-light">
            AI Plus
          </span>
        </div>

        <div className="space-y-3 bg-gradient-to-br from-brand-navy/[0.04] via-white to-brand-light/[0.12] p-4 sm:p-5">
          <p className="text-xs font-medium text-slate-600">What does the customer need?</p>
          <div className="relative rounded-lg border border-brand-navy/20 bg-white/95 p-3 pl-9 shadow-sm">
            <Sparkles className="absolute left-3 top-3 size-4 text-brand-red" aria-hidden />
            <p className="text-sm leading-relaxed text-slate-700">{AI_PLUS_MARKETING.teaserPrompt}</p>
          </div>
          <div className="flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white">
              <Sparkles className="size-3" aria-hidden />
              Parse with AI
            </span>
          </div>

          {/* Veiled preview — show outcome chips, blur the detail */}
          <div className="relative overflow-hidden rounded-xl border border-brand-navy/10 bg-slate-50/80 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Draft ready to confirm
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {AI_PLUS_MARKETING.teaserPreviewLabels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border border-brand-navy/15 bg-white px-2.5 py-1 text-[11px] font-medium text-brand-navy"
                >
                  <CheckCircle2 className="size-3 text-brand-navy" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
            <div className="relative mt-3 space-y-2 select-none" aria-hidden>
              <div className="rounded-lg border bg-white px-3 py-2 blur-[2.5px]">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="font-medium text-slate-800">2014 Honda Accord</span>
                  <span className="text-xs text-slate-500">82,000 mi</span>
                </div>
              </div>
              <div className="rounded-lg border bg-white px-3 py-2 blur-[2.5px]">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Front brake service</span>
                  <span className="tabular-nums text-xs text-slate-500">·· hrs</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Customer concern · · ·</p>
              </div>
              <div className="rounded-lg border bg-white px-3 py-2 blur-[2.5px]">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Oil change</span>
                  <span className="tabular-nums text-xs text-slate-500">·· hrs</span>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center bg-gradient-to-t from-white via-white/70 to-transparent pb-2">
                <span className="rounded-full border border-brand-navy/20 bg-white/95 px-3 py-1 text-[11px] font-semibold text-brand-navy shadow-sm">
                  Full draft unlocks in your shop
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advisor app phone tease */}
      <div className="absolute -bottom-4 -right-2 hidden w-[7.5rem] sm:block md:-right-4 md:w-36">
        <div className="rounded-[1.35rem] border-2 border-brand-navy/20 bg-brand-navy p-1.5 shadow-2xl">
          <div className="overflow-hidden rounded-[1.1rem] bg-white">
            <div className="flex items-center justify-between bg-brand-navy px-2.5 py-1.5">
              <Smartphone className="size-3 text-brand-light" aria-hidden />
              <span className="text-[9px] font-semibold text-white">Advisor</span>
              <Wrench className="size-3 text-brand-light" aria-hidden />
            </div>
            <div className="space-y-1.5 p-2">
              <div className="h-1.5 w-3/4 rounded bg-brand-navy/15" />
              <div className="h-8 rounded border border-brand-navy/10 bg-brand-light/20 p-1">
                <div className="h-full rounded bg-white/80 blur-[1px]" />
              </div>
              <div className="rounded bg-brand-navy py-1 text-center text-[8px] font-semibold text-white">
                Capture note
              </div>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-center text-[10px] font-medium text-slate-500">Advisor app</p>
      </div>
    </div>
  );
}
