"use client";

import {
  HeroLifecycleRing,
  HERO_RO,
  type HeroLifecycleTone,
} from "@/components/marketing-site/hero-lifecycle-ring";
import { cn } from "@/lib/utils";

type HeroPlatformPreviewProps = {
  className?: string;
  /** lifecycle = RO path hero (default); modules = legacy grid stub */
  variant?: "lifecycle" | "job-board" | "modules";
  /** dark = on navy hero; light = on slate/white sections */
  tone?: HeroLifecycleTone;
};

export function HeroPlatformPreview({
  className,
  variant = "lifecycle",
  tone = "dark",
}: HeroPlatformPreviewProps) {
  if (variant === "modules") {
    return <LegacyModulePreview className={className} />;
  }

  const isDark = tone === "dark";

  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center gap-1.5 sm:gap-2 lg:items-end",
        className,
      )}
    >
      <div className="flex w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 sm:justify-end">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tabular-nums",
            isDark
              ? "border-white/20 bg-white/[0.09] text-white backdrop-blur-sm"
              : "border-brand-navy/15 bg-white text-brand-navy shadow-sm",
          )}
        >
          {HERO_RO.number}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
            isDark
              ? "border-brand-light/35 bg-brand-light/12 text-brand-light"
              : "border-brand-navy/20 bg-brand-navy/[0.07] text-brand-navy",
          )}
        >
          Same day
        </span>
        <span
          className={cn(
            "hidden text-[11px] sm:inline",
            isDark ? "text-white/70" : "text-slate-600",
          )}
        >
          {HERO_RO.customer} · {HERO_RO.vehicle}
        </span>
        <span
          className={cn(
            "ml-auto hidden text-xs font-bold tabular-nums sm:inline",
            isDark ? "text-brand-light" : "text-brand-navy",
          )}
        >
          {HERO_RO.total}
        </span>
      </div>
      <p
        className={cn(
          "truncate text-center text-[10px] sm:hidden",
          isDark ? "text-white/55" : "text-slate-600",
        )}
      >
        {HERO_RO.customer} · {HERO_RO.vehicle} · {HERO_RO.total}
      </p>

      <HeroLifecycleRing tone={tone} />
    </div>
  );
}

/** Prior multi-module chrome — kept for non-hero surfaces that may still import the old layout. */
function LegacyModulePreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto max-w-5xl", className ?? "mt-14")}>
      <div className="overflow-hidden rounded-2xl border-2 border-brand-navy/15 bg-white shadow-2xl shadow-brand-navy/10">
        <div className="flex items-center gap-2 border-b border-brand-navy/10 bg-brand-navy px-4 py-3">
          <div className="size-2.5 rounded-full bg-brand-red" />
          <div className="size-2.5 rounded-full bg-brand-light" />
          <div className="size-2.5 rounded-full bg-white/40" />
          <span className="ml-2 text-xs font-medium text-white/90">
            ShopRally Ignition · real product surface
          </span>
        </div>
        <div className="bg-brand-light/10 px-4 py-8 text-center text-sm text-brand-navy/70">
          Product preview — open the home hero for the live RO lifecycle.
        </div>
      </div>
    </div>
  );
}
