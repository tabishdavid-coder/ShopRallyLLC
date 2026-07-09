import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { trendDirection, trendPercent } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export function PlatformKpiCard({
  icon: Icon,
  label,
  value,
  sub,
  isMoney,
  tint = "bg-brand-light/40 text-brand-navy",
  current,
  prior,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  isMoney?: boolean;
  tint?: string;
  current?: number;
  prior?: number;
}) {
  const direction =
    current !== undefined && prior !== undefined ? trendDirection(current, prior) : null;
  const pct =
    current !== undefined && prior !== undefined ? trendPercent(current, prior) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          {direction && pct !== null ? (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                direction === "up" && "text-emerald-600",
                direction === "down" && "text-brand-red",
                direction === "flat" && "text-muted-foreground",
              )}
            >
              {direction === "up" ? (
                <ArrowUp className="size-3" />
              ) : direction === "down" ? (
                <ArrowDown className="size-3" />
              ) : (
                <Minus className="size-3" />
              )}
              <span>
                {pct > 0 ? "+" : ""}
                {pct}%
              </span>
              <span className="font-normal text-muted-foreground">vs 30d</span>
            </div>
          ) : direction && pct === null && (current ?? 0) > 0 ? (
            <div className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
              <ArrowUp className="size-3" />
              <span>New</span>
            </div>
          ) : null}
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tint)}>
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className={`mt-2 font-bold tabular-nums tracking-tight ${isMoney ? "text-xl" : "text-2xl"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
