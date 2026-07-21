"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DASHBOARD_DEFAULT_RANGE,
  DASHBOARD_PRESET_RANGES,
  DASHBOARD_RANGE_LABELS,
  clampCustomDateRange,
  defaultCustomDraftRange,
  formatDashboardCustomLabel,
  parseDashboardPeriod,
  type DashboardDateRange,
  type DashboardPresetRange,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

type DateRangePickerProps = {
  /** Route that receives the `range` search param (default: /dashboard/kpis). */
  basePath?: string;
  /** When the `range` param is omitted, treat this as active (default: KPI MTD). */
  defaultRange?: DashboardDateRange;
};

export function DateRangePicker({
  basePath = "/dashboard/kpis",
  defaultRange = DASHBOARD_DEFAULT_RANGE,
}: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = parseDashboardPeriod(
    {
      range: searchParams.get("range") ?? undefined,
      period: searchParams.get("period") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    },
    defaultRange,
  );
  const active = period.range;
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(
    () => period.from ?? defaultCustomDraftRange().from,
  );
  const [draftTo, setDraftTo] = useState(
    () => period.to ?? defaultCustomDraftRange().to,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (period.range === "custom" && period.from && period.to) {
      setDraftFrom(period.from);
      setDraftTo(period.to);
    }
  }, [period.range, period.from, period.to]);

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    // Canonical key is `range`; drop legacy alias if present.
    params.delete("period");
    params.delete("page");
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  function setPreset(range: DashboardPresetRange) {
    setCustomOpen(false);
    setError(null);
    if (range === defaultRange) {
      pushParams({ range: null, from: null, to: null });
    } else {
      pushParams({ range, from: null, to: null });
    }
  }

  function onCustomOpenChange(next: boolean) {
    if (next) {
      if (period.range === "custom" && period.from && period.to) {
        setDraftFrom(period.from);
        setDraftTo(period.to);
      } else {
        const draft = defaultCustomDraftRange();
        setDraftFrom(draft.from);
        setDraftTo(draft.to);
      }
      setError(null);
    }
    setCustomOpen(next);
  }

  function applyCustom() {
    const clamped = clampCustomDateRange(draftFrom, draftTo);
    if (!clamped) {
      setError("Enter a valid From and To date.");
      return;
    }
    setError(null);
    setCustomOpen(false);
    pushParams({ range: "custom", from: clamped.from, to: clamped.to });
  }

  const customActive = active === "custom";
  const customSummary =
    customActive && period.from && period.to
      ? formatDashboardCustomLabel(period.from, period.to)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
        {DASHBOARD_PRESET_RANGES.map((range) => (
          <Button
            key={range}
            type="button"
            size="sm"
            variant={active === range ? "default" : "ghost"}
            className={active === range ? "bg-brand-navy" : ""}
            onClick={() => setPreset(range)}
          >
            {DASHBOARD_RANGE_LABELS[range]}
          </Button>
        ))}

        <Popover open={customOpen} onOpenChange={onCustomOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant={customActive || customOpen ? "default" : "ghost"}
              className={cn(
                "gap-1.5",
                (customActive || customOpen) && "bg-brand-navy hover:bg-brand-navy/90",
              )}
            >
              <CalendarRange className="size-3.5" />
              Custom
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(100vw-2rem,20rem)] gap-3 p-3">
            <PopoverHeader>
              <PopoverTitle className="text-sm font-semibold text-brand-navy">
                Custom range
              </PopoverTitle>
            </PopoverHeader>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label
                  htmlFor="dashboard-range-from"
                  className="text-xs font-medium text-muted-foreground"
                >
                  From
                </label>
                <Input
                  id="dashboard-range-from"
                  type="date"
                  className="h-9 bg-background text-xs"
                  value={draftFrom}
                  onChange={(e) => {
                    setDraftFrom(e.target.value);
                    setError(null);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="dashboard-range-to"
                  className="text-xs font-medium text-muted-foreground"
                >
                  To
                </label>
                <Input
                  id="dashboard-range-to"
                  type="date"
                  className="h-9 bg-background text-xs"
                  value={draftTo}
                  onChange={(e) => {
                    setDraftTo(e.target.value);
                    setError(null);
                  }}
                />
              </div>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <p className="text-[11px] text-muted-foreground">
              Max 1 year. If From is after To, dates are swapped on Apply.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setCustomOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-brand-navy hover:bg-brand-navy/90"
                onClick={applyCustom}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {customSummary ? (
        <span className="text-xs font-medium text-brand-navy/80">{customSummary}</span>
      ) : null}
    </div>
  );
}
