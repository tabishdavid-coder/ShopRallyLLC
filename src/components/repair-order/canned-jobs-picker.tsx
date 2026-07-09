"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CannedJobPickerSheet } from "@/components/repair-order/canned-job-picker-sheet";
import type { CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import { cn } from "@/lib/utils";

const HERO_BTN =
  "ro-hero-action-btn h-7 gap-1.5 rounded-md border-brand-navy/20 bg-white px-2.5 text-xs font-semibold text-brand-navy shadow-sm hover:border-brand-light/60 hover:bg-brand-light/15";

/** Inline search + browse button — opens the canned-job picker dialog. */
export function CannedJobsPicker({
  roId,
  jobs,
  categories,
  baseRateCents,
  partTiers,
  laborTiers,
  variant = "default",
}: {
  roId: string;
  jobs: CannedJobSummary[];
  categories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  variant?: "default" | "hero";
}) {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  function openPicker(query = "") {
    setInitialQuery(query);
    setOpen(true);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn(
          variant === "hero"
            ? HERO_BTN
            : "h-8 gap-1.5 border-brand-navy/30 text-brand-navy hover:bg-brand-light/20",
        )}
        onClick={() => openPicker("")}
      >
        <Star className={cn(variant === "hero" ? "size-3.5 text-brand-light" : "size-3.5")} />
        Canned Job
      </Button>

      <CannedJobPickerSheet
        open={open}
        onOpenChange={setOpen}
        roId={roId}
        jobs={jobs}
        categories={categories}
        baseRateCents={baseRateCents}
        partTiers={partTiers}
        laborTiers={laborTiers}
        initialQuery={initialQuery}
      />
    </>
  );
}
