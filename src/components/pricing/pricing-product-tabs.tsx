"use client";

import { cn } from "@/lib/utils";
import { WEB_PRESENCE_MARKETING } from "@/lib/web-presence-marketing";

export type PricingProductTab = "crm" | "website";

type PricingProductTabsProps = {
  value: PricingProductTab;
  onChange: (tab: PricingProductTab) => void;
  className?: string;
};

const TABS: { id: PricingProductTab; label: string }[] = [
  { id: "crm", label: WEB_PRESENCE_MARKETING.crmTabLabel },
  { id: "website", label: WEB_PRESENCE_MARKETING.websiteTabLabel },
];

export function PricingProductTabs({ value, onChange, className }: PricingProductTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Pricing product line"
      className={cn(
        "mx-auto flex w-full max-w-md rounded-full border border-brand-navy/15 bg-white p-1 shadow-sm",
        className,
      )}
    >
      {TABS.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            id={`pricing-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-brand-navy text-white shadow-sm"
                : "text-slate-600 hover:bg-brand-light/20 hover:text-brand-navy",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
