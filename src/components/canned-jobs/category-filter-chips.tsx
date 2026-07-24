"use client";

import {
  cannedJobCategoryFilterAllChipClasses,
  cannedJobCategoryFilterChipClasses,
} from "@/lib/canned-job-category-colors";
import { cn } from "@/lib/utils";

export function CategoryFilterChips({
  categories,
  value,
  onChange,
  className,
  coloredCategories = false,
}: {
  categories: string[];
  value: string;
  onChange: (category: string) => void;
  className?: string;
  /** When true, each chip uses the canned-job category color palette. */
  coloredCategories?: boolean;
}) {
  if (!categories.length) return null;

  return (
    <div className={cn("flex w-max min-w-full flex-nowrap gap-1.5", className)}>
      <button
        type="button"
        onClick={() => onChange("")}
        className={
          coloredCategories
            ? cannedJobCategoryFilterAllChipClasses(!value)
            : cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
                !value
                  ? "border-brand-navy bg-brand-navy text-white"
                  : "border-border bg-background text-muted-foreground hover:border-brand-navy/40 hover:text-foreground",
              )
        }
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          className={
            coloredCategories
              ? cannedJobCategoryFilterChipClasses(c, value === c)
              : cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors",
                  value === c
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-border bg-background text-muted-foreground hover:border-brand-navy/40 hover:text-foreground",
                )
          }
        >
          {c}
        </button>
      ))}
    </div>
  );
}
