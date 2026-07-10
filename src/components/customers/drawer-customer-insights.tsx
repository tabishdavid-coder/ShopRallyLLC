"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { CustomerInsightsPanel } from "@/components/customers/customer-insights-panel";
import { getCustomerInsights } from "@/server/actions/customer-insights";
import type { CustomerInsightsView } from "@/server/customer-insights";

const EMPTY_VIEW: CustomerInsightsView = { kind: "empty", reason: "no_ros" };

/**
 * Expanded AI Insights card for the customer drawer Profile tab.
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
    <div className="mb-4">
      {loadError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {loadError}
        </div>
      ) : null}

      {loading && !insights && !loadError ? (
        <div className="flex items-center gap-2 rounded-lg border border-[#DDE5EF] bg-white px-4 py-6 text-xs text-[#5B7295]">
          <Loader2 className="size-4 animate-spin text-[#E86A10]" />
          Loading AI insights…
        </div>
      ) : null}

      {insights ? (
        <CustomerInsightsPanel customerId={customerId} initial={insights} drawer />
      ) : !loading && !loadError ? (
        <CustomerInsightsPanel customerId={customerId} initial={EMPTY_VIEW} drawer />
      ) : null}
    </div>
  );
}
