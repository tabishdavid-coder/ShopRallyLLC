"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartCard } from "@/components/dashboard/chart-card";
import { ChartFrame } from "@/components/dashboard/chart-frame";
import {
  CHART_HEIGHT,
  CHART_MARGIN,
  CHART_TICK,
  CHART_TICK_COMPACT,
} from "@/components/dashboard/chart-theme";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { CHART_CURSOR_FILL } from "@/lib/chart-colors";
import type { StatusSlice } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type RoStatusChartProps = {
  data: StatusSlice[];
  compact?: boolean;
};

function StatusTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: StatusSlice }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  if (!item) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{item.label}</p>
      <p className="text-muted-foreground">{item.count} repair orders</p>
    </div>
  );
}

function StatusLegend({ data, total, compact }: { data: StatusSlice[]; total: number; compact: boolean }) {
  return (
    <ul
      className={cn(
        "space-y-1.5",
        compact ? "mt-2 border-t border-border/60 pt-2" : "w-full sm:w-1/2",
      )}
    >
      {data.map((item) => (
        <li
          key={item.key}
          className="flex items-center justify-between gap-2 rounded-md bg-white/60 px-2 py-1 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate font-medium text-foreground">{item.label}</span>
          </span>
          <span className="shrink-0 font-semibold tabular-nums text-brand-navy">
            {item.count}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function RoStatusChart({ data, compact = false }: RoStatusChartProps) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const tick = compact ? CHART_TICK_COMPACT : CHART_TICK;

  function exportCsv() {
    const rows = data.map((d) => ({
      status: d.key,
      label: d.label,
      count: d.count,
    }));
    downloadCsv("ro-status-breakdown.csv", toCsv(rows));
  }

  return (
    <ChartCard
      title="RO status"
      variant="status"
      subtitle={compact ? `${total} on the board` : `${total} total on the board`}
      compact={compact}
      empty={data.length === 0}
      emptyMessage="No repair orders yet."
      action={
        !compact ? (
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            Export CSV
          </Button>
        ) : undefined
      }
    >
      {compact ? (
        <div className="flex flex-col">
          <ChartFrame height={CHART_HEIGHT.compact - 56}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data}
                layout="vertical"
                margin={CHART_MARGIN.horizontalCompact}
              >
                <XAxis type="number" hide allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={tick}
                  tickLine={false}
                  axisLine={false}
                  width={76}
                />
                <Tooltip content={<StatusTooltip />} cursor={{ fill: CHART_CURSOR_FILL }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
          <StatusLegend data={data} total={total} compact />
        </div>
      ) : (
        <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          <ChartFrame height={CHART_HEIGHT.full} className="w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="52%"
                  outerRadius="78%"
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<StatusTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartFrame>
          <StatusLegend data={data} total={total} compact={false} />
        </div>
      )}
    </ChartCard>
  );
}
