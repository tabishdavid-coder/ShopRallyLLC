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
} from "@/components/dashboard/chart-theme";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { appointmentBarColor, CHART_CURSOR_FILL } from "@/lib/chart-colors";
import type { TrendPoint } from "@/lib/dashboard";

type AppointmentsChartProps = {
  data: TrendPoint[];
  appointmentsThisWeek: number;
  compact?: boolean;
};

function ApptTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0].value ?? 0} appointments</p>
    </div>
  );
}

export function AppointmentsChart({
  data,
  appointmentsThisWeek,
  compact = false,
}: AppointmentsChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    count: d.cents,
    date: d.date,
  }));
  const todayKey = new Date().toISOString().slice(0, 10);
  const tick = compact ? CHART_TICK_COMPACT : CHART_TICK;

  function exportCsv() {
    const rows = chartData.map((d) => ({
      date: d.date,
      label: d.label,
      appointments: d.count,
    }));
    downloadCsv("appointments-this-week.csv", toCsv(rows));
  }

  return (
    <ChartCard
      title="Appointments"
      variant="appointments"
      subtitle={
        compact
          ? `${appointmentsThisWeek} scheduled this week`
          : `${appointmentsThisWeek} scheduled this week`
      }
      compact={compact}
      empty={chartData.length === 0}
      emptyMessage="No appointments this week."
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
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={false}
              interval={0}
              dy={4}
              height={compact ? 28 : 36}
            />
            <YAxis
              allowDecimals={false}
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={compact ? 28 : 32}
            />
            <Tooltip content={<ApptTooltip />} cursor={{ fill: CHART_CURSOR_FILL }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={compact ? 28 : 40}>
              {chartData.map((d) => (
                <Cell
                  key={d.date}
                  fill={appointmentBarColor(d.count, d.date === todayKey)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
