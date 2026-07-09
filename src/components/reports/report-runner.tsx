"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download,
  FileSpreadsheet,
  SearchX,
  Table2,
} from "lucide-react";

import { ReportBarChart } from "@/components/reports/report-bar-chart";
import { ReportDonutChart } from "@/components/reports/report-donut-chart";
import { ReportFiltersBar } from "@/components/reports/report-filters";
import { ReportKpiRow } from "@/components/reports/report-kpi-row";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatCents } from "@/lib/format";
import type { ReportDefinition, ReportPayload, ReportTechnicianOption } from "@/lib/reports";
import { RO_STATUS_PILL } from "@/lib/ro-status";
import type { ROStatus } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type SortDir = "asc" | "desc";

type ReportRunnerProps = {
  definition: ReportDefinition;
  data: ReportPayload;
  technicians: ReportTechnicianOption[];
};

function formatCell(value: string | number, format?: string): string {
  if (value === "—" || value === "") return String(value);
  if (format === "cents" && typeof value === "number") return formatCents(value);
  if (format === "number" && typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  if (format === "percent") return `${value}%`;
  return String(value);
}

function isRoStatus(value: unknown): value is ROStatus {
  return typeof value === "string" && value in RO_STATUS_PILL;
}

function StatusCell({ statusKey, label }: { statusKey?: unknown; label: string }) {
  if (statusKey && isRoStatus(statusKey)) {
    const pill = RO_STATUS_PILL[statusKey];
    return (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
          pill.className,
        )}
      >
        {pill.label}
      </span>
    );
  }
  return <span>{label}</span>;
}

export function ReportRunner({ definition, data, technicians }: ReportRunnerProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const basePath = `/reports/${definition.slug}`;

  const sortedRows = useMemo(() => {
    if (!sortKey) return data.rows;
    return [...data.rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av ?? "");
      const bs = String(bv ?? "");
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
  }, [data.rows, sortKey, sortDir]);

  function toggleSort(key: string, sortable?: boolean) {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function exportTableCsv() {
    const exportRows = sortedRows.map((row) => {
      const out: Record<string, string | number> = {};
      for (const col of data.columns) {
        const v = row[col.key];
        if (col.format === "cents" && typeof v === "number") {
          out[col.label] = (v / 100).toFixed(2);
        } else {
          out[col.label] = v ?? "";
        }
      }
      return out;
    });
    downloadCsv(`${definition.slug}.csv`, toCsv(exportRows));
  }

  function exportSnapshot() {
    const kpiRows = data.kpis.map((k) => ({
      section: "kpi",
      metric: k.label,
      value: k.value,
      hint: k.hint ?? "",
      period: data.periodLabel,
    }));
    const dataRows = sortedRows.map((row) => {
      const out: Record<string, string | number> = { section: "data" };
      for (const col of data.columns) {
        const v = row[col.key];
        out[col.key] =
          col.format === "cents" && typeof v === "number" ? (v / 100).toFixed(2) : (v ?? "");
      }
      return out;
    });
    downloadCsv(`${definition.slug}-snapshot.csv`, toCsv([...kpiRows, ...dataRows]));
  }

  const isEmpty = sortedRows.length === 0;
  const chartIsCurrency =
    definition.slug === "sales-summary" || definition.slug === "payments-by-method";

  const donutData = useMemo(() => {
    if (definition.slug === "ro-by-status") {
      return sortedRows.map((row) => ({
        label: String(row.statusLabel ?? row.status ?? "Unknown"),
        value: Number(row.count ?? 0),
      }));
    }
    if (definition.slug === "payments-by-method" && !definition.chart) {
      return sortedRows.map((row) => ({
        label: String(row.methodLabel ?? "Unknown"),
        value: Number(row.amountCents ?? 0) / 100,
        cents: Number(row.amountCents ?? 0),
      }));
    }
    return [];
  }, [definition.slug, definition.chart, sortedRows]);

  const showDonut =
    definition.slug === "ro-by-status" && donutData.length > 0 && donutData.some((d) => d.value > 0);
  const showBarChart =
    definition.chart && data.chart && data.chart.length > 0 && !showDonut;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/reports" className="text-muted-foreground hover:text-brand-navy">
                  Reports
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-brand-navy">{data.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="min-w-0">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy/10 ring-1 ring-brand-navy/10">
                <FileSpreadsheet className="size-5 text-brand-navy" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
                  {data.title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {data.description}
                </p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  Period: <span className="text-foreground">{data.periodLabel}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
              onClick={exportTableCsv}
            >
              <Download className="size-3.5" />
              Export CSV
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 border-brand-navy/20"
              onClick={exportSnapshot}
            >
              <Download className="size-3.5" />
              Snapshot
            </Button>
          </div>
        </div>
      </div>

      <ReportFiltersBar
        definition={definition}
        technicians={technicians}
        basePath={basePath}
        periodLabel={data.periodLabel}
      />

      <ReportKpiRow kpis={data.kpis} />

      {(showDonut || showBarChart) && (
        <div className="grid gap-4 lg:grid-cols-1">
          {showDonut ? (
            <ReportDonutChart
              title="Status breakdown"
              subtitle={`${data.periodLabel} · distribution by count`}
              data={donutData}
            />
          ) : null}
          {showBarChart ? (
            <ReportBarChart
              title="Trend overview"
              subtitle={data.periodLabel}
              data={data.chart!}
              valueIsCurrency={chartIsCurrency}
            />
          ) : null}
        </div>
      )}

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 pb-4">
          <div className="flex items-center gap-2">
            <Table2 className="size-4 text-brand-navy" />
            <CardTitle className="text-base">Results</CardTitle>
          </div>
          {!isEmpty ? (
            <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-medium tabular-nums text-brand-navy">
              {sortedRows.length} row{sortedRows.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          {isEmpty ? (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex size-16 items-center justify-center rounded-2xl bg-brand-light/30 ring-1 ring-brand-light/40">
                <SearchX className="size-8 text-brand-navy/60" />
              </span>
              <p className="mt-4 text-base font-semibold text-brand-navy">No data for this report</p>
              <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
                {data.emptyMessage ?? "Try adjusting your filters or date range to see results."}
              </p>
              <div className="mt-5 flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
                <BarChart3 className="size-3.5 text-brand-navy/60" />
                <span>Period: {data.periodLabel}</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-brand-navy/10 bg-brand-navy/[0.04]">
                    {data.columns.map((col) => (
                      <th
                        key={col.key}
                        scope="col"
                        className={cn(
                          "px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/70",
                          col.align === "right" ? "text-right" : "text-left",
                          col.sortable && "cursor-pointer select-none hover:text-brand-navy",
                        )}
                        onClick={() => toggleSort(col.key, col.sortable)}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {col.sortable && sortKey === col.key ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3 text-brand-navy" />
                            ) : (
                              <ArrowDown className="size-3 text-brand-navy" />
                            )
                          ) : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-border/50 transition-colors last:border-0 hover:bg-brand-light/10",
                        i % 2 === 1 && "bg-muted/25",
                      )}
                    >
                      {data.columns.map((col, colIdx) => {
                        const raw = row[col.key] ?? "—";
                        const isStatusCol = col.key === "statusLabel" || col.key === "status";
                        const isMoneyCol = col.format === "cents";

                        return (
                          <td
                            key={col.key}
                            className={cn(
                              "px-4 py-3 tabular-nums",
                              col.align === "right" ? "text-right" : "text-left",
                              colIdx === 0 && "font-medium text-foreground",
                              isMoneyCol && "font-semibold text-foreground",
                            )}
                          >
                            {isStatusCol && col.key === "statusLabel" ? (
                              <StatusCell
                                statusKey={row.status}
                                label={String(raw)}
                              />
                            ) : (
                              formatCell(raw, col.format)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
