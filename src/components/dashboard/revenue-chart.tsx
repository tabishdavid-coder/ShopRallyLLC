"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";
import { ChartFrame } from "@/components/dashboard/chart-frame";
import {
  CHART_GRID,
  CHART_HEIGHT,
  CHART_MARGIN,
  CHART_TICK,
  CHART_TICK_COMPACT,
  chartDayTickIndices,
  formatAxisDollars,
  formatChartDayLabel,
} from "@/components/dashboard/chart-theme";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { CHART_CURSOR_FILL, revenueBarColor } from "@/lib/chart-colors";
import type { TrendPoint } from "@/lib/dashboard";
import { formatCents } from "@/lib/format";

type RevenueChartProps = {
  data: TrendPoint[];
  rangeLabel: string;
  compact?: boolean;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { tooltipLabel?: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const cents = Math.round((payload[0].value ?? 0) * 100);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{row?.tooltipLabel ?? ""}</p>
      <p className="text-muted-foreground">{formatCents(cents)}</p>
    </div>
  );
}

export function RevenueChart({ data, rangeLabel, compact = false }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    date: d.date,
    axisLabel: formatChartDayLabel(d.date, compact ? "compact" : "full"),
    tooltipLabel: formatChartDayLabel(d.date, "full"),
    dollars: d.cents / 100,
    cents: d.cents,
  }));
  const totalCents = data.reduce((s, d) => s + d.cents, 0);
  const maxDollars = Math.max(...chartData.map((d) => d.dollars), 0);
  const tick = compact ? CHART_TICK_COMPACT : CHART_TICK;
  const tickIndices = chartDayTickIndices(chartData.length, compact ? 6 : 8);
  const xTicks = tickIndices.map((i) => chartData[i]?.axisLabel).filter(Boolean);

  function exportCsv() {
    const rows = data.map((d) => ({
      date: d.date,
      label: d.label,
      revenue_cents: d.cents,
      revenue_usd: (d.cents / 100).toFixed(2),
    }));
    downloadCsv(`revenue-${rangeLabel.toLowerCase().replace(/\s+/g, "-")}.csv`, toCsv(rows));
  }

  return (
    <ChartCard
      title="Revenue trend"
      variant="revenue"
      subtitle={
        compact
          ? `${formatCents(totalCents)} · ${rangeLabel}`
          : `Collected payments · ${rangeLabel}`
      }
      compact={compact}
      empty={chartData.length === 0}
      emptyMessage="No payments in this period."
      action={
        !compact ? (
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        ) : undefined
      }
    >
      <ChartFrame height={compact ? CHART_HEIGHT.compact : CHART_HEIGHT.full}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart
            data={chartData}
            margin={compact ? CHART_MARGIN.barCompact : CHART_MARGIN.bar}
          >
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="axisLabel"
              ticks={xTicks}
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval={0}
              dy={4}
              height={compact ? 32 : 36}
            />
            <YAxis
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisDollars}
              width={compact ? 44 : 52}
              domain={[0, "auto"]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: CHART_CURSOR_FILL }} />
            <Bar dataKey="dollars" radius={[6, 6, 0, 0]} maxBarSize={compact ? 32 : 48}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={revenueBarColor(entry.dollars, maxDollars)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
