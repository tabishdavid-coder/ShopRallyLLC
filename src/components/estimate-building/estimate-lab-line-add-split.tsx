"use client";

import { Circle, Plus, Search, Wrench, ListTree, PenLine } from "lucide-react";

import { TABISH_FRIDAY_LABOR_TITLE } from "@/lib/tabish-friday-labor";
import { useMotorLaborUiEnabled, usePartsTechUiEnabled } from "@/lib/shop-capabilities";
import { cn } from "@/lib/utils";

const BTN_BASE =
  "inline-flex items-center gap-0.5 font-semibold uppercase tracking-wide text-brand-navy transition-colors hover:bg-brand-light/25";

export type LineAddKind = "labor" | "part" | "tire";

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
  const motorLaborOk = useMotorLaborUiEnabled();
  const partsTechOk = usePartsTechUiEnabled();
  const lookupAllowed =
    kind === "labor" ? motorLaborOk : kind === "part" ? partsTechOk : kind === "tire";

  const size = compact
    ? "h-6 border-l border-brand-navy/15 px-1.5 text-[9px]"
    : "h-7 rounded-md border border-brand-navy/25 bg-white px-2 text-[10px]";

  const lookupLabel =
    kind === "labor"
      ? motorLaborOk
        ? "Tabish Friday"
        : "Labor lookup"
      : kind === "tire"
        ? "Tire stock"
        : "Parts lookup";
  const LookupIcon = kind === "labor" ? ListTree : kind === "tire" ? Circle : Search;
  const groupLabel = kind === "labor" ? "Add labor" : kind === "tire" ? "Add tire" : "Add part";
  const manualTitle =
    kind === "tire"
      ? "Manual entry — blank tire line in this job"
      : "Manual entry — blank line in this job";
  const lookupTitle =
    kind === "labor"
      ? motorLaborOk
        ? `${TABISH_FRIDAY_LABOR_TITLE} — EWT browser, fluids, combined jobs`
        : "Labor Book — search flat-rate operations"
      : kind === "tire"
        ? "Tire stock — pick from shop inventory"
        : "Parts lookup — pick supplier and search catalogs";

  return (
    <div
      className={cn(
        compact ? "inline-flex shrink-0 items-stretch" : "inline-flex flex-wrap items-center gap-1",
        className,
      )}
      role="group"
      aria-label={groupLabel}
    >
      <button
        type="button"
        title={manualTitle}
        onClick={onManual}
        className={cn(BTN_BASE, size, !compact && "shadow-sm")}
      >
        <Plus className={compact ? "size-2.5" : "size-3"} aria-hidden />
        {kind === "tire" ? (
          <PenLine className={compact ? "size-2.5 opacity-80" : "size-3 opacity-80"} aria-hidden />
        ) : (
          <Wrench className={compact ? "size-2.5 opacity-80" : "size-3 opacity-80"} aria-hidden />
        )}
        {compact ? "Manual" : kind === "tire" ? "Manual tire" : "Manual order"}
      </button>
      {lookupAllowed ? (
        <button
          type="button"
          title={lookupTitle}
          onClick={onLookup}
          className={cn(BTN_BASE, size, compact ? "border-l border-brand-navy/15" : "shadow-sm")}
        >
          <LookupIcon className={compact ? "size-2.5" : "size-3"} aria-hidden />
          {compact ? "Stock" : lookupLabel}
        </button>
      ) : null}
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
