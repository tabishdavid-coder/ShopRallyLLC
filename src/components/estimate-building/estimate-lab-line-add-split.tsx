"use client";

import { Plus, Search, Wrench, BookOpen } from "lucide-react";

import { cn } from "@/lib/utils";

const BTN_BASE =
  "inline-flex items-center gap-0.5 font-semibold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-light/25";

export type LineAddKind = "labor" | "part";

/** Side-by-side manual vs lookup actions for service-item add row. */
export function EstimateLabLineAddSplit({
  kind,
  onManual,
  onLookup,
  compact = false,
  className,
}: {
  kind: LineAddKind;
  onManual: () => void;
  onLookup: () => void;
  compact?: boolean;
  className?: string;
}) {
  const size = compact
    ? "h-6 border-l border-brand-navy/15 px-1.5 text-[9px]"
    : "h-7 rounded-md border border-brand-navy/25 bg-white px-2 text-[10px]";

  const lookupLabel = kind === "labor" ? "Labor lookup" : "Parts lookup";
  const LookupIcon = kind === "labor" ? BookOpen : Search;

  return (
    <div
      className={cn(
        compact ? "inline-flex shrink-0 items-stretch" : "inline-flex flex-wrap items-center gap-1",
        className,
      )}
      role="group"
      aria-label={kind === "labor" ? "Add labor" : "Add part"}
    >
      <button
        type="button"
        title="Manual entry — blank line in this job"
        onClick={onManual}
        className={cn(BTN_BASE, size, !compact && "shadow-sm")}
      >
        <Plus className={compact ? "size-2.5" : "size-3"} aria-hidden />
        <Wrench className={compact ? "size-2.5 opacity-80" : "size-3 opacity-80"} aria-hidden />
        {compact ? "Manual" : "Manual order"}
      </button>
      <button
        type="button"
        title={
          kind === "labor"
            ? "Labor Book — search flat-rate operations"
            : "Parts lookup — pick supplier and search catalogs"
        }
        onClick={onLookup}
        className={cn(BTN_BASE, size, compact ? "border-l border-brand-navy/15" : "shadow-sm")}
      >
        <LookupIcon className={compact ? "size-2.5" : "size-3"} aria-hidden />
        {compact ? "Lookup" : lookupLabel}
      </button>
    </div>
  );
}

/** @deprecated Use EstimateLabLineAddSplit */
export function EstimateLabPartAddSplit(props: {
  onManual: () => void;
  onLookup: () => void;
  compact?: boolean;
  className?: string;
}) {
  return <EstimateLabLineAddSplit kind="part" {...props} />;
}
