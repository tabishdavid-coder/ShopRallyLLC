"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/format";

export type DonutSlice = {
  label: string;
  value: number;
  cents?: number;
};

type ReportDonutChartProps = {
  title: string;
  subtitle?: string;
  data: DonutSlice[];
  valueIsCurrency?: boolean;
};

const SLICE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function DonutTooltip({
  active,
  payload,
  valueIsCurrency,
}: {
  active?: boolean;
  payload?: Array<{ payload?: DonutSlice; value?: number }>;
  valueIsCurrency?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  if (!item) return null;
  const display =
    valueIsCurrency && item.cents != null
      ? formatCents(item.cents)
      : valueIsCurrency
        ? formatCents(Math.round((payload[0].value ?? 0) * 100))
        : String(item.value);
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground">{item.label}</p>
      <p className="text-muted-foreground">{display}</p>
    </div>
  );
}

export function ReportDonutChart({
  title,
  subtitle,
  data,
  valueIsCurrency,
}: ReportDonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) return null;

  return (
    <Card className="shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <div className="relative h-[200px] w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip valueIsCurrency={valueIsCurrency} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums tracking-tight text-brand-navy">
                {valueIsCurrency ? formatCents(Math.round(total * 100)) : total}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Total
              </span>
            </div>
          </div>
          <ul className="w-full space-y-2.5 sm:w-1/2">
            {data.map((item, i) => (
              <li
                key={item.label}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="ml-2 shrink-0 font-semibold tabular-nums">
                  {valueIsCurrency && item.cents != null
                    ? formatCents(item.cents)
                    : valueIsCurrency
                      ? formatCents(Math.round(item.value * 100))
                      : item.value}
                  {!valueIsCurrency && total > 0 ? (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({Math.round((item.value / total) * 100)}%)
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
