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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportChartPoint } from "@/lib/reports";
import { formatCents } from "@/lib/format";

type ReportBarChartProps = {
  title: string;
  subtitle?: string;
  data: ReportChartPoint[];
  valueIsCurrency?: boolean;
};

function ChartTooltip({
  active,
  payload,
  label,
  valueIsCurrency,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: ReportChartPoint }>;
  label?: string;
  valueIsCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const raw = payload[0].value ?? 0;
  const display =
    valueIsCurrency || point?.cents != null
      ? formatCents(point?.cents ?? Math.round(raw * 100))
      : String(raw);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground">{display}</p>
    </div>
  );
}

export function ReportBarChart({
  title,
  subtitle,
  data,
  valueIsCurrency,
}: ReportBarChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    display: d.cents != null ? d.cents / 100 : d.value,
  }));

  if (chartData.length === 0) return null;

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (valueIsCurrency ? `$${v.toLocaleString()}` : String(v))}
                width={52}
              />
              <Tooltip
                content={<ChartTooltip valueIsCurrency={valueIsCurrency} />}
                cursor={{ fill: "var(--accent)" }}
              />
              <Bar dataKey="display" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i % 2 === 0 ? "var(--chart-1)" : "var(--chart-2)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
