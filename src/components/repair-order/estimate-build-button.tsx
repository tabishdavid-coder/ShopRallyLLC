"use client";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Scrolls to the sticky estimate totals bar before authorization. */
export function EstimateBuildButton({ className }: { className?: string }) {
  function scrollToTotals() {
    document.getElementById("estimate-totals-bar")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <Button
      type="button"
      onClick={scrollToTotals}
      className={
        className ??
        "h-9 gap-2 bg-brand-navy px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-navy/90"
      }
      title="Jump to estimate totals and authorization"
    >
      Review totals
      <ChevronDown className="size-4" />
    </Button>
  );
}
