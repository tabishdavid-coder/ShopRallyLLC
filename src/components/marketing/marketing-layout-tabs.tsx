"use client";

import { MarketingTabs } from "@/components/marketing/marketing-tabs";

/** Client boundary for marketing sub-nav (avoids Turbopack SSR factory issues). */
export function MarketingLayoutTabs() {
  return <MarketingTabs />;
}
