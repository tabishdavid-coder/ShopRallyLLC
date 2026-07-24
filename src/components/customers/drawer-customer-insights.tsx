"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { CustomerInsightsPanel } from "@/components/customers/customer-insights-panel";
import { getCustomerInsights } from "@/server/actions/customer-insights";
import type { CustomerInsightsView } from "@/server/customer-insights";

const EMPTY_VIEW: CustomerInsightsView = { kind: "empty", reason: "no_ros" };

/**
 * Slim AI Insights banner for the customer lifecycle drawer Profile tab.
 */
export function DrawerCustomerInsightsCard({
  customerId,
  drawerOpen,
}: {
  customerId: string;
  drawerOpen: boolean;
}) {
  const [insights, setInsights] = useState<CustomerInsightsView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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

  return (
    <div className="mb-1">
      {loadError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {loadError}
        </div>
      ) : null}

      {loading && !insights && !loadError ? (
        <div className="flex items-center gap-2 rounded-md border border-brand-light/40 bg-brand-light/15 px-3 py-2.5 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-brand-navy" />
          Loading AI insights…
        </div>
      ) : null}

      {insights ? (
        <CustomerInsightsPanel customerId={customerId} initial={insights} drawer banner />
      ) : !loading && !loadError ? (
        <CustomerInsightsPanel customerId={customerId} initial={EMPTY_VIEW} drawer banner />
      ) : null}
    </div>
  );
}
