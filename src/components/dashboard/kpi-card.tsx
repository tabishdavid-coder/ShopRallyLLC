"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/format";
import {
  trendDirection,
  trendPercent,
  type TrendPoint,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tint: string;
  current?: number;
  prior?: number;
  formatTrend?: "money" | "count" | "percent";
  sparkline?: TrendPoint[];
  sparklineIsMoney?: boolean;
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tint,
  current,
  prior,
  formatTrend = "count",
  sparkline,
  sparklineIsMoney = false,
}: KpiCardProps) {
  const direction =
    current !== undefined && prior !== undefined
      ? trendDirection(current, prior)
      : null;
  const pct =
    current !== undefined && prior !== undefined ? trendPercent(current, prior) : null;

  const sparkData =
    sparkline?.map((p) => ({
      label: p.label,
      value: sparklineIsMoney ? p.cents / 100 : p.cents,
    })) ?? [];

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-subtle-foreground">{label}</CardTitle>
          {direction && pct !== null ? (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
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
              <span className="text-muted-foreground font-normal">vs prior</span>
            </div>
          ) : direction && pct === null && (current ?? 0) > 0 ? (
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
              <ArrowUp className="size-3" />
              <span>New</span>
            </div>
          ) : null}
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tint)}>
          <Icon className="size-4.5" />
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        {sparkData.length > 1 ? (
          <div className="h-10 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--brand-navy)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        {current !== undefined && prior !== undefined && formatTrend === "money" ? (
          <p className="text-[11px] text-muted-foreground">
            Prior: {formatCents(prior)}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
