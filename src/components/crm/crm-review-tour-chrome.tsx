"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { useRoIntakeOptional } from "@/components/repair-order/ro-intake-context";
import { getCrmReviewBatch } from "@/lib/crm-review-batches";
import { cn } from "@/lib/utils";

const STOP_HINTS: Record<string, string> = {
  "INTAKE-01": "Look for the cyan + FAB bottom-left — opens intake slide-over when config is loaded.",
  "INTAKE-02": "Slide-over with customer → vehicle → concerns sections and intake checklist.",
  "INTAKE-03": "Full-page /repair-orders/new fallback with CrmFormLayout grouped sections.",
  "INTAKE-04": "Dashboard sidebar stays visible on new RO — focus mode excludes /repair-orders/new.",
  "CLERK-01": "Review callout — Clerk lands on /home, then role routing sends admins to /platform.",
  "CLERK-02": "Auth baseline — membership-first tenancy, route gates, nav filtering.",
  "CLERK-03": "Clerk row — AFTER_SIGN_IN_URL=/home env vars documented in integrations.",
  "MERGE-01": "Batches 1–5 approved on feature/master-crm — ready to merge.",
  "MERGE-02": "Merge commands and post-merge QA checklist before shipping to main.",
};

function CrmReviewIntakeTourEffects() {
  const searchParams = useSearchParams();
  const { openIntake, config } = useRoIntakeOptional();
  const review = searchParams.get("review");
  const stop = searchParams.get("stop");
  const openIntakeParam = searchParams.get("openIntake");

  useEffect(() => {
    if (!config) return;

    const shouldOpen =
      openIntakeParam === "1" ||
      (review === "batch-05" && stop === "INTAKE-02");

    if (!shouldOpen) return;

    const timer = window.setTimeout(() => openIntake(), 350);
    return () => window.clearTimeout(timer);
  }, [config, openIntake, openIntakeParam, review, stop]);

  return null;
}

/** Sticky banner + scroll/highlight when touring planned changes on live Shop CRM routes. */
export function CrmReviewTourChrome({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const review = searchParams.get("review");
  const stop = searchParams.get("stop");

  const batch = review ? getCrmReviewBatch(review) : undefined;
  const active = batch && stop ? batch.stops.find((s) => s.id === stop) : undefined;

  useEffect(() => {
    if (!stop) return;

    const target = document.querySelector(`[data-planned-change="${stop}"]`);
    if (!target) return;

    target.classList.add("planned-change-highlight");

    const timer = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, stop === "INTAKE-02" ? 500 : 0);

    return () => {
      window.clearTimeout(timer);
      target.classList.remove("planned-change-highlight");
    };
  }, [stop, pathname]);

  return (
    <>
      <CrmReviewIntakeTourEffects />
      {batch && stop && active ? (
        <div className="sticky top-0 z-[80] border-b border-emerald-500/40 bg-emerald-600 px-4 py-2.5 text-white shadow-md">
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
              href={batch.designReviewPath}
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
