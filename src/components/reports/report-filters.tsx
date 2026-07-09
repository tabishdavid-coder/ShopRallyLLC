"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange, Filter, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  REPORT_RANGE_LABELS,
  REPORT_RANGES,
  type ReportDefinition,
  type ReportTechnicianOption,
} from "@/lib/reports";
import { parseReportRange } from "@/lib/reports";
import { cn } from "@/lib/utils";

const RO_STATUS_OPTIONS = [
  { value: "ESTIMATE", label: "Estimate" },
  { value: "APPROVED", label: "Approved" },
  { value: "IN_PROGRESS", label: "Work in progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "INVOICED", label: "Invoiced" },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHECK", label: "Check" },
  { value: "OTHER", label: "Other" },
  { value: "STORE_CREDIT", label: "Store credit" },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "person", label: "Person" },
  { value: "business", label: "Business" },
];

type ReportFiltersProps = {
  definition: ReportDefinition;
  technicians: ReportTechnicianOption[];
  basePath: string;
  periodLabel?: string;
};

export function ReportFiltersBar({
  definition,
  technicians,
  basePath,
  periodLabel,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeRange = parseReportRange(searchParams.get("range") ?? undefined);
  const { filters } = definition;

  const hasSecondaryFilters =
    filters.status || filters.tech || filters.customerType || filters.paymentMethod;
  const hasActiveFilters =
    searchParams.has("status") ||
    searchParams.has("tech") ||
    searchParams.has("customerType") ||
    searchParams.has("method") ||
    (activeRange === "custom" && (searchParams.has("from") || searchParams.has("to")));

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  function setRange(range: string) {
    if (range === "30d") {
      pushParams({ range: null, from: null, to: null });
    } else if (range === "custom") {
      pushParams({ range: "custom" });
    } else {
      pushParams({ range, from: null, to: null });
    }
  }

  function clearFilters() {
    router.push(basePath);
  }

  return (
    <div className="sticky top-0 z-20 rounded-xl border border-border/80 bg-card/95 shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-card/85">
      <div className="flex flex-col gap-3 px-4 py-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-navy/10">
              <Filter className="size-4 text-brand-navy" />
            </span>
            <div>
              <p className="text-sm font-semibold text-brand-navy">Filters</p>
              {periodLabel ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarRange className="size-3" />
                  <span>{periodLabel}</span>
                </p>
              ) : null}
            </div>
          </div>
          {hasActiveFilters ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-brand-navy/20 text-xs"
              onClick={clearFilters}
            >
              <RotateCcw className="size-3" />
              Reset filters
            </Button>
          ) : null}
        </div>

        {filters.dateRange ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Period
            </span>
            <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-1">
              {REPORT_RANGES.map((range) => (
                <Button
                  key={range}
                  type="button"
                  size="sm"
                  variant={activeRange === range ? "default" : "ghost"}
                  className={cn(
                    "h-8 text-xs",
                    activeRange === range && "bg-brand-navy shadow-sm hover:bg-brand-navy/90",
                  )}
                  onClick={() => setRange(range)}
                >
                  {REPORT_RANGE_LABELS[range]}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {activeRange === "custom" && filters.dateRange ? (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
            <div>
              <label htmlFor="report-from" className="mb-1 block text-xs font-medium text-muted-foreground">
                From
              </label>
              <Input
                id="report-from"
                type="date"
                className="h-9 w-full min-w-[140px] bg-card text-xs sm:w-40"
                defaultValue={searchParams.get("from") ?? ""}
                onChange={(e) => pushParams({ from: e.target.value || null })}
              />
            </div>
            <div>
              <label htmlFor="report-to" className="mb-1 block text-xs font-medium text-muted-foreground">
                To
              </label>
              <Input
                id="report-to"
                type="date"
                className="h-9 w-full min-w-[140px] bg-card text-xs sm:w-40"
                defaultValue={searchParams.get("to") ?? ""}
                onChange={(e) => pushParams({ to: e.target.value || null })}
              />
            </div>
          </div>
        ) : null}

        {hasSecondaryFilters ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            {filters.status ? (
              <Select
                value={searchParams.get("status") ?? "all"}
                onValueChange={(v) => pushParams({ status: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-44">
                  <SelectValue placeholder="RO status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {RO_STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {filters.tech ? (
              <Select
                value={searchParams.get("tech") ?? "all"}
                onValueChange={(v) => pushParams({ tech: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-48">
                  <SelectValue placeholder="Technician" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All technicians</SelectItem>
                  {technicians.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {filters.customerType ? (
              <Select
                value={searchParams.get("customerType") ?? "all"}
                onValueChange={(v) => pushParams({ customerType: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-40">
                  <SelectValue placeholder="Customer type" />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}

            {filters.paymentMethod ? (
              <Select
                value={searchParams.get("method") ?? "all"}
                onValueChange={(v) => pushParams({ method: v === "all" ? null : v })}
              >
                <SelectTrigger className="h-9 w-full bg-card text-xs sm:w-40">
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All methods</SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
