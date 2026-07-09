"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Monitor } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getPlatformReviewBatch,
  platformReviewLiveHref,
  type PlatformReviewStop,
} from "@/lib/platform-review-batches";
import { cn } from "@/lib/utils";

export function PlatformReviewLivePreview({ batchId = "batch-04" }: { batchId?: string }) {
  const batch = getPlatformReviewBatch(batchId);
  const stops = batch?.stops ?? [];
  const [activeId, setActiveId] = useState(stops[0]?.id ?? "PLAT-01");

  const active = useMemo(
    () => stops.find((s) => s.id === activeId) ?? stops[0],
    [stops, activeId],
  );

  if (!batch || !active) return null;

  const iframeSrc = platformReviewLiveHref(batchId, active);

  return (
    <section className="overflow-hidden rounded-xl border-2 border-emerald-500/50 bg-card shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-500/20 bg-emerald-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Monitor className="size-5 text-emerald-700" />
          <div>
            <p className="text-sm font-semibold text-emerald-900">Live planned Master CRM</p>
            <p className="text-xs text-emerald-800/80">
              Real operator pages below — green banner marks what changed.
            </p>
          </div>
        </div>
        <Badge className="bg-emerald-700 text-white">Planned · on this branch</Badge>
      </div>

      <div className="flex flex-wrap gap-2 border-b bg-muted/30 px-4 py-2">
        {stops.map((stop) => (
          <button
            key={stop.id}
            type="button"
            onClick={() => setActiveId(stop.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              stop.id === activeId
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-border bg-card text-muted-foreground hover:border-emerald-500/40",
            )}
          >
            {stop.id}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{active.label}</strong> — {iframeSrc}
        </span>
        <Button asChild size="sm" variant="outline" className="h-7 border-emerald-600/40 text-emerald-800">
          <Link href={iframeSrc} target="_blank" rel="noopener noreferrer">
            Open full page
            <ExternalLink className="ml-1 size-3" />
          </Link>
        </Button>
      </div>

      <div className="relative bg-muted/20">
        <iframe
          key={iframeSrc}
          title={`Live planned CRM — ${active.id}`}
          src={iframeSrc}
          className="block h-[min(720px,70vh)] w-full border-0 bg-white"
        />
      </div>
    </section>
  );
}
