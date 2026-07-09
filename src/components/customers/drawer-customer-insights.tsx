"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

import { CustomerInsightsPanel } from "@/components/customers/customer-insights-panel";
import { getCustomerInsights } from "@/server/actions/customer-insights";
import type { CustomerInsightsView } from "@/server/customer-insights";
import { cn } from "@/lib/utils";

const EMPTY_VIEW: CustomerInsightsView = { kind: "empty", reason: "no_ros" };

export function DrawerCustomerInsightsStrip({
  customerId,
  drawerOpen,
}: {
  customerId: string;
  drawerOpen: boolean;
}) {
  const [insights, setInsights] = useState<CustomerInsightsView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [loading, startLoad] = useTransition();

  useEffect(() => {
    if (!drawerOpen) return;
    setInsights(null);
    setLoadError(null);
    startLoad(async () => {
      const res = await getCustomerInsights(customerId);
      if (res.ok) {
        setInsights(res.data);
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    });
  }, [drawerOpen, customerId]);

  if (!drawerOpen) return null;

  const preview =
    insights?.kind === "ready" && insights.insights.bullets[0]
      ? insights.insights.bullets[0]
      : insights?.kind === "upgrade"
        ? "Upgrade for AI customer insights"
        : null;

  return (
    <div className="shrink-0 border-b border-brand-navy/10 bg-white px-4 py-2 sm:px-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm font-semibold text-brand-navy"
          aria-expanded={expanded}
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span>AI insights</span>
          {!expanded && preview ? (
            <span className="truncate font-normal text-muted-foreground">— {preview}</span>
          ) : null}
        </button>
        {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-brand-navy/60" /> : null}
      </div>

      {expanded ? (
        <div className={cn("mt-2", loading && !insights ? "opacity-70" : undefined)}>
          {loadError ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {loadError}
            </p>
          ) : null}

          {loading && !insights && !loadError ? (
            <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin text-brand-navy" />
              Loading insights…
            </div>
          ) : null}

          {insights ? (
            <CustomerInsightsPanel customerId={customerId} initial={insights} compact />
          ) : !loading && !loadError ? (
            <CustomerInsightsPanel customerId={customerId} initial={EMPTY_VIEW} compact />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
