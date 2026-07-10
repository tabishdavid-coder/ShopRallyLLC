import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared "identity hero" strip for Admin/Settings sections — the same navy
 * gradient + icon-tile + title/description language as Shop Profile's
 * `ShopProfileHero`, minus the inline name editor. Used at the top of every
 * settings section (single-page and multi-page) so the whole area reads as
 * one coherent system instead of ad-hoc `<h2>` headers.
 */
export function SettingsHero({
  icon: Icon,
  title,
  description,
  meta,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Small badges/status chips rendered under the title. */
  meta?: React.ReactNode;
  /** Right-aligned button(s). */
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy/85 px-5 py-5 text-white shadow-sm sm:px-6 sm:py-6",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm text-white/75">{description}</p>
            ) : null}
            {meta ? <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">{meta}</div> : null}
          </div>
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">{action}</div> : null}
      </div>
    </div>
  );
}

/** Pill badge for hero `meta` slots (status, mode, plan, etc.). */
export function HeroBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
        tone === "positive" && "bg-emerald-400/20 text-emerald-100",
        tone === "warning" && "bg-amber-400/20 text-amber-100",
        tone === "neutral" && "bg-white/15 text-white",
      )}
    >
      {children}
    </span>
  );
}

/** Consistent centered empty-state used in place of noisy link walls / bare "coming soon" boxes. */
export function SettingsEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-4.5 text-muted-foreground" aria-hidden />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
