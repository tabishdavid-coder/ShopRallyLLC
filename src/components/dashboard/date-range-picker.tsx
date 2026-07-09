"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DASHBOARD_RANGES,
  DASHBOARD_RANGE_LABELS,
  parseDashboardRange,
  type DashboardDateRange,
} from "@/lib/dashboard";

type DateRangePickerProps = {
  /** Route that receives the `range` search param (default: /dashboard). */
  basePath?: string;
};

export function DateRangePicker({ basePath = "/dashboard" }: DateRangePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = parseDashboardRange(searchParams.get("range") ?? undefined);

  function setRange(range: DashboardDateRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (range === "30d") {
      params.delete("range");
    } else {
      params.set("range", range);
    }
    const q = params.toString();
    router.push(q ? `${basePath}?${q}` : basePath);
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1">
      {DASHBOARD_RANGES.map((range) => (
        <Button
          key={range}
          type="button"
          size="sm"
          variant={active === range ? "default" : "ghost"}
          className={active === range ? "bg-brand-navy" : ""}
          onClick={() => setRange(range)}
        >
          {DASHBOARD_RANGE_LABELS[range]}
        </Button>
      ))}
    </div>
  );
}
