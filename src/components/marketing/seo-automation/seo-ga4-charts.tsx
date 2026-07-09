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
import type { SeoGa4AnalyticsView } from "@/lib/seo-ga4-analytics";

function SessionsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; dataKey?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const sessions = payload.find((p) => p.dataKey === "sessions")?.value ?? 0;
  const organic = payload.find((p) => p.dataKey === "organicSessions")?.value ?? 0;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{sessions} sessions</p>
      <p className="text-muted-foreground">{organic} organic</p>
    </div>
  );
}

export function SeoGa4SessionsChart({ ga4 }: { ga4: SeoGa4AnalyticsView }) {
  const total = ga4.totals?.sessions ?? 0;

  return (
    <ChartCard
      title="Site sessions"
      subtitle={`${total.toLocaleString()} sessions · last 28 days · Google Analytics`}
      empty={ga4.daily.length === 0}
      emptyMessage="No session data yet — check GA4 property access."
    >
      <ChartFrame height={CHART_HEIGHT.full}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ga4.daily} margin={CHART_MARGIN.bar}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tick={CHART_TICK} width={36} allowDecimals={false} />
            <Tooltip content={<SessionsTooltip />} />
            <Line
              type="monotone"
              dataKey="sessions"
              stroke="oklch(0.449 0.109 249)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="organicSessions"
              stroke="oklch(0.596 0.226 25.5)"
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

export function SeoGa4OrganicChart({ ga4 }: { ga4: SeoGa4AnalyticsView }) {
  return (
    <ChartCard
      title="Organic search sessions"
      subtitle="Sessions from Google organic search"
      empty={ga4.daily.length === 0}
    >
      <ChartFrame height={CHART_HEIGHT.compact}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ga4.daily} margin={CHART_MARGIN.barCompact}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="label" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={28} hide />
            <YAxis tick={CHART_TICK} width={40} allowDecimals={false} />
            <Tooltip content={<SessionsTooltip />} />
            <Bar dataKey="organicSessions" fill="oklch(0.596 0.226 25.5)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
