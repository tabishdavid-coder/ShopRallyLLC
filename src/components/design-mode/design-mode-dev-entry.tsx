"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ShopRallyLogo } from "@/components/brand/shoprally-logo";
import { designModeHref } from "@/lib/design-mode-merged-crm";
import { isDesignModeEnabled } from "@/lib/design-mode-tokens";

/** Always-visible DEV strip — merged CRM entry (survives batch review callout removal). */
export function DesignModeDevEntryBar() {
  if (!isDesignModeEnabled()) return null;

  return (
    <div className="relative z-[90] shrink-0 border-b border-brand-light/40 bg-brand-navy pl-2 pr-3 py-1 text-white shadow-sm">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs sm:text-sm">
          <ShopRallyLogo href="/dashboard" size="sm" variant="onDark" markOnly className="shrink-0" />
          <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-brand-light">
            design mode
          </span>
          <span className="hidden text-white/75 sm:inline">Panel: bottom-right · Ctrl+Shift+D</span>
        </div>
        <Link
          href={designModeHref("/design-mode")}
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-light px-2.5 py-1 text-xs font-semibold text-brand-navy hover:bg-brand-light/90"
        >
          Open design hub
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}

/** Dashboard card — links into live CRM surfaces with design=open. */
export function DesignModeDashboardCallout() {
  if (!isDesignModeEnabled()) return null;

  return (
    <div className="rounded-xl border-2 border-brand-navy/25 bg-gradient-to-r from-brand-light/20 to-transparent p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand-navy">
            Merged CRM · design mode
          </p>
          <p className="mt-1 font-semibold text-brand-navy">Browse live Master + Shop CRM</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Batches 1–6 on main. Open the hub or jump straight into Shop / Master CRM with the design dock.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={designModeHref("/design-mode")}
            className="inline-flex items-center gap-1 rounded-md bg-brand-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy/90"
          >
            Design hub
            <ArrowRight className="size-3.5" />
          </Link>
          <Link
            href={designModeHref("/dashboard")}
            className="inline-flex items-center rounded-md border border-brand-navy/30 px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-light/20"
          >
            Shop CRM
          </Link>
          <Link
            href={designModeHref("/platform")}
            className="inline-flex items-center rounded-md border border-brand-navy/30 px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-light/20"
          >
            Master CRM
          </Link>
        </div>
      </div>
    </div>
  );
}
