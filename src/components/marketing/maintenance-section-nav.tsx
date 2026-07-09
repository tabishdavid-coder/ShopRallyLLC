"use client";

import { cn } from "@/lib/utils";

export type SectionTab = {
  id: string;
  label: string;
  badge?: string | number;
};

export function MaintenanceSectionNav({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: SectionTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Section navigation"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2",
              selected
                ? "border-brand-navy bg-brand-navy text-white shadow-sm"
                : "border-slate-300 bg-white text-slate-800 hover:border-brand-navy/40 hover:bg-slate-50",
            )}
          >
            {tab.label}
            {tab.badge != null && tab.badge !== "" ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  selected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700",
                )}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
