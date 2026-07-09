"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type EstimateWorkAreaProps = {
  children: ReactNode;
  /** Split: concerns rail + jobs column on large screens. Stacked: vertical flow. */
  layout?: "split" | "stacked";
  /** Skip outer card chrome when a parent panel already provides the border. */
  chromeless?: boolean;
};

/** Estimate builder shell — service concerns rail and quoted jobs column. */
export function EstimateWorkArea({
  children,
  layout = "split",
  chromeless = false,
}: EstimateWorkAreaProps) {
  const inner = (
    <div
      className={cn(
        layout === "split" &&
          "grid grid-cols-1 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-stretch",
        layout === "stacked" && "flex flex-col",
      )}
    >
      {children}
    </div>
  );

  if (chromeless) return inner;

  return (
    <div className="overflow-hidden rounded-xl border border-brand-light/40 bg-card shadow-sm">
      {inner}
    </div>
  );
}
