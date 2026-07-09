"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, ClipboardList } from "lucide-react";

import { PlatformPageIntro } from "@/components/platform/platform-page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CURRENT_PLATFORM_REVIEW_BATCH_ID,
  PLATFORM_REVIEW_BATCHES,
  type PlatformReviewBatchStatus,
} from "@/lib/platform-review-batches";
import { cn } from "@/lib/utils";

function statusBadge(status: PlatformReviewBatchStatus) {
  switch (status) {
    case "review":
      return (
        <Badge className="bg-brand-navy text-white">Review now</Badge>
      );
    case "approved":
      return (
        <Badge variant="outline" className="border-emerald-600 text-emerald-700">
          Approved
        </Badge>
      );
    default:
      return <Badge variant="outline">Upcoming</Badge>;
  }
}

export function PlatformReviewHub() {
  const current = CURRENT_PLATFORM_REVIEW_BATCH_ID;

  return (
    <div className="space-y-6">
      <PlatformPageIntro
        title="Release review"
        description="Current vs planned operator changes inside Master CRM. Open the active batch, compare mockups, then use live tour links to verify each route."
      />

      <ul className="divide-y rounded-xl border bg-card shadow-sm">
        {PLATFORM_REVIEW_BATCHES.map((batch) => (
          <li key={batch.id}>
            <Link
              href={batch.platformPath}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/40",
                batch.id === current && "bg-brand-light/10",
              )}
            >
              {batch.status === "approved" ? (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
              ) : (
                <ClipboardList className="size-5 shrink-0 text-brand-navy" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-brand-navy">{batch.title}</p>
                <p className="text-sm text-muted-foreground">{batch.summary}</p>
              </div>
              {statusBadge(batch.status)}
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>

      {PLATFORM_REVIEW_BATCHES.length === 0 ? (
        <p className="text-sm text-muted-foreground">No review batches queued.</p>
      ) : null}
    </div>
  );
}

/** Compact callout for platform overview — links to current batch review. */
export function PlatformCurrentBatchCallout() {
  const batch = PLATFORM_REVIEW_BATCHES.find((b) => b.id === CURRENT_PLATFORM_REVIEW_BATCH_ID);
  if (!batch || batch.status !== "review") return null;

  return (
    <div className="rounded-xl border-2 border-brand-navy/20 bg-gradient-to-r from-brand-light/15 to-transparent p-4 sm:p-5" data-planned-change="PLAT-06">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">
            Planned changes — review in CRM
          </p>
          <p className="mt-1 font-semibold text-brand-navy">{batch.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{batch.summary}</p>
        </div>
        <Button asChild size="sm" className="shrink-0 bg-brand-navy">
          <Link href={batch.platformPath}>
            View current vs planned
            <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
