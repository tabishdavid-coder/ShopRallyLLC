"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CURRENT_CRM_REVIEW_BATCH_ID,
  CRM_REVIEW_BATCHES,
} from "@/lib/crm-review-batches";

/** Compact callout for CRM dashboard — links to current batch review. */
export function CrmCurrentBatchCallout() {
  const batch = CRM_REVIEW_BATCHES.find((b) => b.id === CURRENT_CRM_REVIEW_BATCH_ID);
  if (!batch || batch.status !== "review") return null;

  return (
    <div
      className="rounded-xl border-2 border-brand-navy/20 bg-gradient-to-r from-brand-light/15 to-transparent p-4 sm:p-5"
      data-planned-change={batch.id === "batch-06" ? "CLERK-01" : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">
            Planned changes — review in CRM
          </p>
          <p className="mt-1 font-semibold text-brand-navy">{batch.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {batch.id === "batch-06"
              ? "Clerk post-auth → /home → platform admin /platform or shop /dashboard. Review merge checklist."
              : batch.summary}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 bg-brand-navy">
          <Link href={batch.designReviewPath}>
            {batch.id === "batch-06" ? "Review merge prep" : "View current vs planned"}
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
