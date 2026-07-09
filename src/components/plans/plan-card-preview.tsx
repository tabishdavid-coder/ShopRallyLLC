"use client";

import { Shield, Sparkles, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPlanPriceOptions } from "@/lib/maintenance-programs";
import type { ResolvedPlansTheme } from "@/lib/plans-page-theme";
import { FONT_SCALE } from "@/lib/plans-page-theme";
import type { PlansPageTemplate } from "@/generated/prisma";
import { cn } from "@/lib/utils";

export type PlanCardPreviewData = {
  name: string;
  tagline?: string | null;
  idealFor?: string | null;
  featured?: boolean;
  retailCents?: number | null;
  payInFullCents?: number | null;
  monthlyCents?: number | null;
  monthlyTermMonths?: number | null;
  annualCents?: number | null;
  entitlements: {
    kind: string;
    label: string;
    quantity?: number | null;
  }[];
};

type Props = {
  plan: PlanCardPreviewData;
  selected?: boolean;
  onSelect?: () => void;
  signupDisabled?: boolean;
  className?: string;
  theme?: ResolvedPlansTheme;
};

function cardSurfaceClass(theme: ResolvedPlansTheme | undefined, template: PlansPageTemplate) {
  const style = theme?.cardStyle ?? "shadow";
  const base = "transition-all duration-200 hover:-translate-y-0.5";

  if (template === "PREMIUM") {
    return cn(
      base,
      "rounded-sm border border-neutral-800 bg-neutral-900 text-neutral-100",
      style === "shadow" && "shadow-lg shadow-black/30",
      style === "flat" && "border-neutral-700",
    );
  }

  if (template === "MODERN") {
    return cn(
      base,
      "rounded-2xl bg-white",
      style === "bordered" && "border-2 border-slate-200",
      style === "shadow" && "border border-slate-200/60 shadow-md hover:shadow-lg",
      style === "flat" && "border border-slate-100",
    );
  }

  if (template === "BOLD") {
    return cn(
      base,
      "rounded-xl bg-white",
      style === "bordered" && "border-2",
      style === "shadow" && "border shadow-md hover:shadow-xl",
      style === "flat" && "border bg-slate-50",
    );
  }

  return cn(
    base,
    "rounded-xl bg-card",
    style === "bordered" && "border-2",
    style === "shadow" && "border shadow-sm hover:shadow-md",
    style === "flat" && "border border-transparent bg-muted/40",
  );
}

function FeaturedBadge({
  template,
  theme,
}: {
  template: PlansPageTemplate;
  theme?: ResolvedPlansTheme;
}) {
  const Icon = template === "PREMIUM" ? Star : template === "BOLD" ? Sparkles : Shield;
  const label = template === "PREMIUM" ? "Recommended" : "Featured";

  if (template === "PREMIUM") {
    return (
      <div
        className="mb-3 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase"
        style={{ color: "var(--plans-accent)" }}
      >
        <Icon className="size-3.5" /> {label}
      </div>
    );
  }

  if (template === "BOLD") {
    return (
      <div
        className="mb-3 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold uppercase"
        style={{ backgroundColor: "var(--plans-accent)", color: "white" }}
      >
        <Icon className="size-3.5" /> {label}
      </div>
    );
  }

  return (
    <div
      className="mb-2 flex items-center gap-1 text-xs font-semibold"
      style={{ color: theme ? "var(--plans-accent)" : undefined }}
    >
      <Icon className="size-3.5" /> {label}
    </div>
  );
}

/** Public-facing plan card — shared by catalog, editor preview, and hub preview. */
export function PlanCardPreview({
  plan,
  selected,
  onSelect,
  signupDisabled = false,
  className,
  theme,
}: Props) {
  const template = theme?.template ?? "CLASSIC";
  const fonts = FONT_SCALE[theme?.fontScale ?? "md"];

  const pricing = formatPlanPriceOptions({
    retailCents: plan.retailCents ?? null,
    payInFullCents: plan.payInFullCents ?? null,
    monthlyCents: plan.monthlyCents ?? null,
    monthlyTermMonths: plan.monthlyTermMonths ?? 12,
    annualCents: plan.annualCents ?? null,
  });

  const featuredRing =
    plan.featured && template === "BOLD"
      ? { boxShadow: `0 0 0 3px var(--plans-accent)` }
      : plan.featured && template === "PREMIUM"
        ? { boxShadow: `inset 0 2px 0 var(--plans-accent)` }
        : undefined;

  const titleColor =
    template === "PREMIUM" ? "text-white" : template === "MODERN" ? "text-slate-900" : "";

  return (
    <article
      className={cn(
        "flex flex-col p-5",
        cardSurfaceClass(theme, template),
        selected && "ring-2",
        plan.featured && template === "CLASSIC" && "border-[color:var(--plans-primary)]/30",
        plan.featured && template === "MODERN" && "ring-1 ring-[color:var(--plans-accent)]/40",
        className,
      )}
      style={{
        ...(theme ? { "--plans-primary": `#${theme.primaryColor}`, "--plans-accent": `#${theme.accentColor}` } : {}),
        ...(selected ? { ringColor: "var(--plans-primary)" } : {}),
        ...(plan.featured && template === "BOLD" ? featuredRing : {}),
        ...(plan.featured && template === "CLASSIC" ? { borderColor: "color-mix(in srgb, var(--plans-primary) 30%, transparent)" } : {}),
      }}
    >
      {plan.featured ? <FeaturedBadge template={template} theme={theme} /> : null}
      <h3
        className={cn("font-bold", fonts.cardTitle, titleColor)}
        style={!titleColor && theme ? { color: "var(--plans-primary)" } : !titleColor ? undefined : undefined}
      >
        {plan.name}
      </h3>
      {plan.tagline ? (
        <p className={cn("mt-1.5 text-sm leading-snug", template === "PREMIUM" ? "text-neutral-400" : "text-muted-foreground")}>
          {plan.tagline}
        </p>
      ) : null}
      {plan.idealFor ? (
        <p className={cn("mt-2 text-xs italic", template === "PREMIUM" ? "text-neutral-500" : "text-muted-foreground")}>
          {plan.idealFor}
        </p>
      ) : null}

      {plan.entitlements.length > 0 ? (
        <ul className="mt-4 flex-1 space-y-2 text-sm">
          {plan.entitlements.map((e, i) => (
            <li key={i} className="flex gap-2.5">
              <span
                className="mt-0.5 shrink-0 font-bold"
                style={theme ? { color: "var(--plans-accent)" } : undefined}
              >
                ✓
              </span>
              <span className={template === "PREMIUM" ? "text-neutral-300" : undefined}>
                {e.kind === "COUNTED" && e.quantity != null ? `${e.quantity}× ${e.label}` : e.label}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className={cn(
            "mt-4 flex-1 text-sm",
            template === "PREMIUM" ? "text-neutral-500" : "text-muted-foreground",
          )}
        >
          Add included services…
        </p>
      )}

      <div className={cn("mt-5 border-t pt-4", template === "PREMIUM" ? "border-neutral-800" : "")}>
        {pricing.savingsBadge ? (
          <span
            className={cn(
              "mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
              pricing.retailDiscount
                ? "bg-brand-red/10 text-brand-red"
                : template === "PREMIUM"
                  ? "bg-[color:var(--plans-accent)]/20 text-[color:var(--plans-accent)]"
                  : "bg-brand-light/30 text-brand-navy",
            )}
          >
            {pricing.savingsBadge}
          </span>
        ) : null}
        {pricing.compareAt ? (
          <p
            className={cn(
              "text-sm line-through tabular-nums",
              template === "PREMIUM" ? "text-neutral-500" : "text-muted-foreground",
            )}
          >
            {pricing.retailDiscount ? `Was ${pricing.compareAt}` : pricing.compareAt}
          </p>
        ) : null}
        <p
          className={cn("font-bold tabular-nums", fonts.price)}
          style={theme ? { color: "var(--plans-primary)" } : undefined}
        >
          {pricing.retailDiscount ? `Now ${pricing.primary}` : pricing.primary}
        </p>
        {pricing.altOption ? (
          <p className={cn("text-sm", template === "PREMIUM" ? "text-neutral-400" : "text-muted-foreground")}>
            {pricing.altOption}
          </p>
        ) : null}
        {!signupDisabled ? (
          <Button
            className={cn(
              "mt-4 w-full",
              theme?.buttonStyle === "outline" && "bg-transparent",
            )}
            style={
              theme?.buttonStyle === "outline"
                ? { borderColor: "var(--plans-primary)", color: "var(--plans-primary)" }
                : theme
                  ? { backgroundColor: "var(--plans-primary)", color: "white" }
                  : undefined
            }
            variant={theme?.buttonStyle === "outline" ? "outline" : "default"}
            onClick={onSelect}
            type="button"
          >
            Choose plan
          </Button>
        ) : null}
      </div>
    </article>
  );
}
