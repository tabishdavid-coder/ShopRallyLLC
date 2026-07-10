import { Crown, Layers, Monitor } from "lucide-react";

import { cn } from "@/lib/utils";
import { MARKET_POSITIONING } from "@/lib/marketing-launch";
import { PLANS, repairPilotAllInMonthly, repairPilotOverdriveMonthly } from "@/lib/plans";

const TIER_STYLES = {
  legacy: {
    icon: Monitor,
    card: "border-slate-200 bg-slate-50/90",
    iconWrap: "bg-slate-200 text-slate-600",
    title: "text-slate-700",
    price: "text-slate-500",
  },
  budget: {
    icon: Layers,
    card: "border-amber-200/80 bg-amber-50/50",
    iconWrap: "bg-amber-100 text-amber-800",
    title: "text-amber-950",
    price: "text-amber-800",
  },
  premium: {
    icon: Crown,
    card: "border-brand-navy/25 bg-gradient-to-br from-brand-navy/[0.06] via-white to-brand-light/15 shadow-lg shadow-brand-navy/10 ring-2 ring-brand-navy/15",
    iconWrap: "bg-brand-navy text-white",
    title: "text-brand-navy",
    price: "text-brand-navy",
  },
} as const;

export function MarketPositioningSection({ compact = false }: { compact?: boolean }) {
  const momentumPrice = repairPilotAllInMonthly(true);
  const overdrivePrice = repairPilotOverdriveMonthly(true);

  const tiers = MARKET_POSITIONING.tiers.map((tier) => {
    if (tier.id === "premium") {
      return {
        ...tier,
        priceLabel: `From $${momentumPrice}/mo`,
        subPrice: `${PLANS.ENTERPRISE.name} $${overdrivePrice}/mo — AI, ShopSite & Local SEO`,
      };
    }
    return tier;
  });

  return (
    <section className={cn(compact ? "py-0" : "border-y border-brand-navy/10 bg-white py-16 sm:py-20")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {!compact ? (
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-red">
              {MARKET_POSITIONING.eyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-bold text-brand-navy sm:text-4xl">
              {MARKET_POSITIONING.headline}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 sm:text-lg">
              {MARKET_POSITIONING.subhead}
            </p>
          </div>
        ) : null}

        <div className={cn("grid items-stretch gap-4 lg:grid-cols-3 lg:gap-6", compact ? "mt-0" : "mt-12 lg:mt-14")}>
          {tiers.map((tier) => {
            const style = TIER_STYLES[tier.id];
            const Icon = style.icon;
            const isPremium = tier.id === "premium";

            return (
              <div key={tier.id} className="relative flex h-full">
                <div
                  className={cn(
                    "flex h-full flex-col rounded-2xl border p-6 sm:p-7",
                    style.card,
                  )}
                >
                  {/* Badge row — reserved height so premium aligns with siblings */}
                  <div className="mb-4 min-h-[1.375rem]">
                    {isPremium ? (
                      <span className="inline-flex rounded-full bg-brand-red px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        ShopRally
                      </span>
                    ) : null}
                  </div>

                  <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", style.iconWrap)}>
                    <Icon className="size-5" />
                  </div>

                  <div className="mt-4 flex min-h-[4.5rem] flex-col">
                    <h3 className={cn("text-lg font-bold leading-tight", style.title)}>{tier.label}</h3>
                    <p className="mt-1.5 text-sm leading-snug text-slate-600">{tier.summary}</p>
                  </div>

                  <div className="mt-4 min-h-[5.25rem]">
                    <p className={cn("text-2xl font-bold tabular-nums leading-none tracking-tight", style.price)}>
                      {tier.priceLabel}
                    </p>
                    <p className="mt-2 min-h-[2.5rem] text-xs font-medium leading-snug text-slate-500">
                      {"subPrice" in tier && tier.subPrice ? tier.subPrice : "\u00A0"}
                    </p>
                  </div>

                  <ul className="mt-5 flex-1 space-y-2.5 border-t border-brand-navy/8 pt-5">
                    {tier.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-sm leading-snug text-slate-700">
                        <span
                          className={cn(
                            "mt-[0.45rem] size-1.5 shrink-0 rounded-full",
                            isPremium ? "bg-brand-red" : "bg-slate-400",
                          )}
                          aria-hidden
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
