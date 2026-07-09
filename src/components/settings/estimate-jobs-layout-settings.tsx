"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LayoutGrid, Loader2, Table2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EstimateJobsLayout } from "@/generated/prisma";
import {
  ESTIMATE_JOBS_LAYOUT_DESCRIPTIONS,
  ESTIMATE_JOBS_LAYOUT_LABELS,
} from "@/lib/estimate-jobs-layout";
import { updateEstimateJobsLayout } from "@/server/actions/estimate-settings";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: EstimateJobsLayout;
  icon: typeof LayoutGrid;
  preview: string;
}[] = [
  {
    value: "INLINE",
    icon: LayoutGrid,
    preview: "Single grid — labor + parts rows, inline add, matrix pills in Rate column.",
  },
  {
    value: "TEKMETRIC",
    icon: Table2,
    preview: "Stacked labor table + parts table per job — view/edit toggle, classic CRM cards.",
  },
];

export function EstimateJobsLayoutSettings({
  initialLayout,
}: {
  initialLayout: EstimateJobsLayout;
}) {
  const router = useRouter();
  const [layout, setLayout] = useState(initialLayout);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: EstimateJobsLayout) {
    if (next === layout || pending) return;
    setLayout(next);
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await updateEstimateJobsLayout(next);
      if (res.ok) {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.error);
        setLayout(initialLayout);
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h3 className="text-base font-semibold">Jobs section layout</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how services appear on the estimate tab. Applies to all users in this shop.
          Open any repair order estimate to preview after saving.
        </p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Jobs section layout">
        {OPTIONS.map(({ value, icon: Icon, preview }) => {
          const selected = layout === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={pending}
              onClick={() => save(value)}
              className={cn(
                "flex w-full gap-3 rounded-lg border p-4 text-left transition-colors",
                selected
                  ? "border-brand-navy/40 bg-brand-navy/[0.04] ring-1 ring-brand-navy/20"
                  : "border-border hover:border-brand-navy/25 hover:bg-muted/30",
                pending && "pointer-events-none opacity-70",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-brand-navy bg-brand-navy" : "border-muted-foreground/40",
                )}
                aria-hidden
              >
                {selected ? <span className="size-1.5 rounded-full bg-white" /> : null}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-brand-navy" aria-hidden />
                  <span className="font-semibold text-foreground">
                    {ESTIMATE_JOBS_LAYOUT_LABELS[value]}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {ESTIMATE_JOBS_LAYOUT_DESCRIPTIONS[value]}
                </p>
                <p className="text-xs text-muted-foreground/80">{preview}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        {pending ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Saving…
          </span>
        ) : saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <Check className="size-4" aria-hidden />
            Saved — refresh open estimates to see the change
          </span>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: use{" "}
        <Button type="button" variant="link" className="h-auto p-0 text-xs" asChild>
          <a href="/job-board">Job board</a>
        </Button>{" "}
        to open an estimate, or use the Layout link in the jobs toolbar.
      </p>
    </div>
  );
}
