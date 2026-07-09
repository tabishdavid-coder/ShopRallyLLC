"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";
import { ChartFrame } from "@/components/dashboard/chart-frame";
import { CHART_GRID, CHART_HEIGHT, CHART_MARGIN, CHART_TICK } from "@/components/dashboard/chart-theme";
import type { SeoAnalyticsView } from "@/lib/seo-analytics";

function ClicksTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const clicks = payload.find((p) => p.dataKey === "clicks")?.value ?? 0;
  const impressions = payload.find((p) => p.dataKey === "impressions")?.value ?? 0;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{clicks} clicks</p>
      <p className="text-muted-foreground">{impressions.toLocaleString()} impressions</p>
    </div>
  );
}

export function SeoSearchTrendChart({ analytics }: { analytics: SeoAnalyticsView }) {
  const totalClicks = analytics.totals?.clicks ?? 0;

  return (
    <ChartCard
      title="Search traffic trend"
      subtitle={`${totalClicks.toLocaleString()} clicks · last 28 days · Google Search Console`}
      empty={analytics.daily.length === 0}
      emptyMessage="No daily data yet — check back after Search Console syncs."
    >
      <ChartFrame height={CHART_HEIGHT.full}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={analytics.daily} margin={CHART_MARGIN.bar}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={CHART_TICK} width={36} allowDecimals={false} />
            <Tooltip content={<ClicksTooltip />} />
            <Line
              type="monotone"
              dataKey="clicks"
              stroke="oklch(0.449 0.109 249)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}

export function SeoImpressionsChart({ analytics }: { analytics: SeoAnalyticsView }) {
  return (
    <ChartCard
      title="Impressions"
      subtitle="How often your site appeared in Google search"
      empty={analytics.daily.length === 0}
    >
      <ChartFrame height={CHART_HEIGHT.compact}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analytics.daily} margin={CHART_MARGIN.barCompact}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={28} hide />
            <YAxis tick={CHART_TICK} width={40} allowDecimals={false} />
            <Tooltip content={<ClicksTooltip />} />
            <Bar dataKey="impressions" fill="oklch(0.798 0.108 247)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
