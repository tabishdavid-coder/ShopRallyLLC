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
  formatAxisDollars,
} from "@/components/dashboard/chart-theme";
import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv } from "@/lib/csv";
import { CHART_CURSOR_FILL, paymentMethodColor } from "@/lib/chart-colors";
import type { PaymentMixSlice } from "@/lib/dashboard";
import { formatCents } from "@/lib/format";

type PaymentMixChartProps = {
  data: PaymentMixSlice[];
  rangeLabel: string;
  compact?: boolean;
};

function MixTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: PaymentMixSlice & { dollars: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  if (!item) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-foreground">{item.label}</p>
      <p className="text-muted-foreground">
        {formatCents(item.cents)} · {item.count} payments
      </p>
    </div>
  );
}

export function PaymentMixChart({ data, rangeLabel, compact = false }: PaymentMixChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    dollars: d.cents / 100,
  }));
  const totalCents = data.reduce((s, d) => s + d.cents, 0);
  const tick = compact ? CHART_TICK_COMPACT : CHART_TICK;

  function exportCsv() {
    const rows = data.map((d) => ({
      method: d.method,
      label: d.label,
      payment_count: d.count,
      amount_cents: d.cents,
      amount_usd: (d.cents / 100).toFixed(2),
    }));
    downloadCsv(`payment-mix-${rangeLabel.toLowerCase().replace(/\s+/g, "-")}.csv`, toCsv(rows));
  }

  return (
    <ChartCard
      title="Payment mix"
      variant="payments"
      subtitle={
        compact
          ? `${formatCents(totalCents)} · ${rangeLabel}`
          : `By method · ${rangeLabel}`
      }
      compact={compact}
      empty={data.length === 0}
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
            layout="vertical"
            margin={compact ? CHART_MARGIN.horizontalCompact : CHART_MARGIN.horizontal}
          >
            <CartesianGrid {...CHART_GRID} horizontal={false} />
            <XAxis
              type="number"
              tick={tick}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatAxisDollars}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={tick}
              tickLine={false}
              axisLine={false}
              width={compact ? 72 : 96}
            />
            <Tooltip content={<MixTooltip />} cursor={{ fill: CHART_CURSOR_FILL }} />
            <Bar dataKey="dollars" radius={[0, 6, 6, 0]} barSize={compact ? 20 : 26}>
              {chartData.map((entry, i) => (
                <Cell key={entry.method} fill={paymentMethodColor(entry.method, i)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </ChartCard>
  );
}
