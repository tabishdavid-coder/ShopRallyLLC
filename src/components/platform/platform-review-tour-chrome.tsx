"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { getPlatformReviewBatch } from "@/lib/platform-review-batches";
import { cn } from "@/lib/utils";

const STOP_HINTS: Record<string, string> = {
  "PLAT-01": "Look for the Payments column with Stripe Connect status pills.",
  "PLAT-02": "Look for Stripe Connect and Subscription columns in the billing table.",
  "PLAT-03": "Look for the intro, post-create checklist, and Send intake link button.",
  "PLAT-04": "Look for the Customer websites button in the page intro.",
  "PLAT-05": "Look for pipeline / live filters and the open requests KPI icon.",
  "PLAT-06": "Platform shell only — orphan platform-header removed.",
};

/** Sticky banner + scroll/highlight when touring planned changes on live platform routes. */
export function PlatformReviewTourChrome({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const review = searchParams.get("review");
  const stop = searchParams.get("stop");

  const batch = review ? getPlatformReviewBatch(review) : undefined;
  const active = batch && stop ? batch.stops.find((s) => s.id === stop) : undefined;

  useEffect(() => {
    if (!stop) return;

    const target = document.querySelector(`[data-planned-change="${stop}"]`);
    if (!target) return;

    target.classList.add("planned-change-highlight");
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    return () => {
      target.classList.remove("planned-change-highlight");
    };
  }, [stop, pathname]);

  return (
    <>
      {batch && stop && active ? (
        <div className="sticky top-0 z-30 border-b border-emerald-500/40 bg-emerald-600 px-4 py-2.5 text-white shadow-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide">
                  Planned change live · {stop}
                </p>
                <p className="text-sm text-emerald-50">{STOP_HINTS[stop] ?? active.label}</p>
              </div>
            </div>
            <Link
              href={batch.platformPath}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md bg-white/15 px-2.5 py-1.5",
                "text-xs font-semibold hover:bg-white/25",
              )}
            >
              <ArrowLeft className="size-3.5" />
              Back to review
            </Link>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
}
