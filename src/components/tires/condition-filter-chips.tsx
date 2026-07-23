"use client";

import { TIRE_CONDITION_LABELS } from "@/lib/tire-stock";
import type { TireCondition } from "@/generated/prisma";
import { cn } from "@/lib/utils";

type ConditionFilter = TireCondition | "all";

export function ConditionFilterChips({
  value,
  onChange,
  className,
}: {
  value: ConditionFilter;
  onChange: (condition: ConditionFilter) => void;
  className?: string;
}) {
  const options: { value: ConditionFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "NEW", label: TIRE_CONDITION_LABELS.NEW },
    { value: "USED", label: TIRE_CONDITION_LABELS.USED },
  ];

  return (
    <div className={cn("flex w-max min-w-full flex-nowrap gap-1.5", className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
            value === opt.value
              ? "border-brand-navy bg-brand-navy text-white"
              : "border-border bg-background text-muted-foreground hover:border-brand-navy/40 hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
