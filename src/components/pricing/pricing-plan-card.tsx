import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MARKETING_LAUNCH } from "@/lib/marketing-launch";
import {
  annualSavingsDollars,
  planCardBullets,
  planDisplayPrice,
  planListPrice,
  type PlanDefinition,
} from "@/lib/plans";
import type { ShopPlan } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type PricingPlanCardProps = {
  plan: PlanDefinition;
  planId: ShopPlan;
  annual: boolean;
  preLaunch: boolean;
  onCompareFeatures?: () => void;
  compareLabel?: string;
};

export function PricingPlanCard({
  plan,
  planId,
  annual,
  preLaunch,
  onCompareFeatures,
  compareLabel = "Compare all features",
}: PricingPlanCardProps) {
  const price = planDisplayPrice(plan, annual);
  const listPrice = planListPrice(plan);
  const yearSaved = annualSavingsDollars(plan);
  const isPopular = plan.popular === true;
  const isTop = planId === "ENTERPRISE";
  const badgeLabel = isPopular ? "Most popular" : isTop ? "White-glove" : null;
  const bullets = planCardBullets(plan);
  const { bestFor } = plan.pricingCard;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-white/95 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.28)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)]",
        isPopular
          ? "border-brand-navy ring-2 ring-brand-navy/15"
          : "border-slate-200/80",
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-light/30 to-transparent opacity-70"
        aria-hidden
      />

      {isPopular ? (
        <div
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-red via-brand-light to-brand-navy"
          aria-hidden
        />
      ) : null}

      <div className="relative flex h-full flex-col p-6 sm:p-8">
        <div className="flex h-7 items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-navy/50">
            {plan.subtitle}
          </p>
          {badgeLabel ? (
            <span
              className={cn(
                "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
                isPopular ? "bg-brand-red" : "bg-brand-navy",
              )}
            >
              {badgeLabel}
            </span>
          ) : (
            <span className="invisible text-[10px]">.</span>
          )}
        </div>

        <header className="mt-3">
          <h2 className="text-[1.75rem] font-bold leading-none tracking-tight text-brand-navy">
            {plan.name}
          </h2>
          <p className="mt-3 min-h-[2.75rem] text-sm leading-relaxed text-slate-600">
            {bestFor}
          </p>
        </header>

        <div className="mt-6">
          <div className="flex items-end gap-2.5">
            {annual ? (
              <span className="mb-1 text-sm font-medium tabular-nums text-slate-400 line-through">
                {listPrice}
              </span>
            ) : null}
            <span className="text-[2.75rem] font-bold tabular-nums leading-none tracking-tight text-brand-navy">
              {price}
            </span>
            <span className="mb-1.5 text-sm font-medium text-slate-500">/mo</span>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            {annual
              ? `Billed annually · save $${yearSaved}/yr`
              : "Billed monthly · cancel anytime"}
          </p>
        </div>

        <div className="mt-7 flex-1 border-t border-slate-200 pt-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Included
          </p>
          <ul className="mt-4 space-y-3">
            {bullets.map((highlight, i) => {
              const isUpgradeHeader = i === 0 && highlight.startsWith("Everything in");
              return (
                <li
                  key={highlight}
                  className={cn(
                    "flex gap-3 text-sm leading-snug",
                    isUpgradeHeader ? "font-semibold text-brand-navy" : "text-slate-700",
                  )}
                >
                  {!isUpgradeHeader ? (
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-navy/8 text-brand-navy">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden />
                    </span>
                  ) : (
                    <span className="size-5 shrink-0" aria-hidden />
                  )}
                  <span>{highlight}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 space-y-3">
          <Button
            className={cn(
              "h-11 w-full font-semibold",
              isPopular
                ? "bg-brand-navy text-white hover:bg-brand-navy/90"
                : "border-brand-navy/20 bg-white text-brand-navy hover:bg-slate-50",
            )}
            variant={isPopular ? "default" : "outline"}
            asChild
          >
            <Link href={preLaunch ? MARKETING_LAUNCH.primaryHref : "/signup"}>
              {preLaunch ? MARKETING_LAUNCH.primaryCta : "Start 14-day trial"}
              <ArrowRight className="ml-1.5 size-4 opacity-80" aria-hidden />
            </Link>
          </Button>
          {onCompareFeatures ? (
            <button
              type="button"
              onClick={onCompareFeatures}
              className="w-full text-left text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-brand-navy hover:underline"
            >
              {compareLabel}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
