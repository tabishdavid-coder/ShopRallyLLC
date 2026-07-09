"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Loader2,
  Search,
  Plus,
  X,
  ShoppingCart,
  ChevronRight,
  ArrowLeft,
  Library,
  ListTree,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LABOR_CATEGORY_TREE, laborCategoryById, laborSubcategoryById } from "@/lib/labor-categories";
import type { LaborCartLine, LaborGuideHit, LaborVariant } from "@/lib/labor-guide-types";
import {
  guideJobName,
  sourceBadgeClass,
  sourceBadgeLabel,
  suggestionToHit,
} from "@/lib/labor-guide-helpers";
import { enrichHitsWithPosition } from "@/lib/labor-guide-search";
import {
  browseBreadcrumbParts,
  browseSyntheticQuery,
  operationFacetsForSubcategory,
  positionFacetsForSubcategory,
  subcategoryUsesOperationFirst,
} from "@/lib/labor-nav-facets";
import {
  implicitBrowsePositionId,
  isBrowsePathComplete,
  shouldLoadBrowseResults,
  shouldLoadOnSubcategorySelect,
  shouldShowOperationColumn,
  shouldShowPositionColumn,
} from "@/lib/labor-browse-hierarchy";
import { expandOperationVariants, variantToCartLine } from "@/lib/labor-guide-variants";
import {
  SHOP_LIBRARY_CHIPS,
  type ShopLibraryBrowsePath,
} from "@/lib/shop-library-chip-paths";
import { hitsToGridRows, type LaborGridRow } from "@/lib/labor-book-v4-helpers";
import {
  motorKeysForSubGroup,
  motorSelectionForChip,
  type LaborBookMotorSidebarNode,
  type MotorSubGroupSelection,
} from "@/lib/labor-book-motor-adapter";
import {
  addLaborGuideJob,
  browseLaborGuideSubcategory,
  generateLaborSuggestion,
  resolveLaborGuideCompanions,
  searchLaborGuide,
} from "@/server/actions/labor-guide";
import {
  matchCompanionEdges,
  type ResolvedLaborCompanion,
} from "@/lib/labor-companion-graph";
import {
  getLaborBookMotorApplications,
  getLaborBookMotorInit,
  type LaborBookMotorSource,
} from "@/server/actions/labor-book-motor";
import {
  laborCatalogDisplayLabels,
  type LaborCatalogMode,
} from "@/lib/labor-catalog-mode";
import { MOTOR_REFERENCE_BASE_VEHICLE_ID } from "@/lib/labor-motor-tree-static";
type CartLine = LaborCartLine & { key: number };

function browsePositionHint(hits: LaborGuideHit[], subcategoryId: string | null): string | null {
  if (!subcategoryId?.startsWith("brakes")) return null;
  if (!hits.length) return 'Try searching "rear brakes" or "front brake pads" — rear can be derived from front cache rows.';
  const text = hits.map((h) => `${h.jobName} ${h.queryText ?? ""}`).join(" ").toLowerCase();
  const hasFront = /\bfront\b/.test(text);
  const hasRear = /\brear\b/.test(text);
  if (hasFront && !hasRear) {
    return 'Only front brakes in browse — search "rear brakes" to find or derive rear times.';
  }
  if (hasRear && !hasFront) {
    return 'Only rear brakes in browse — search "front brakes" for front times.';
  }
  return null;
}

const COLUMN_HEADER =
  "flex h-9 shrink-0 items-center gap-1.5 border-b border-brand-navy/10 bg-brand-navy/[0.04] px-2 text-[11px] font-semibold uppercase tracking-wider text-brand-navy/65";

/** Fixed width for System / Operation / Position browse columns (px). */
const BROWSE_COL_WIDTH_DEFAULT = 200; // 12.5rem
/** Resizable Group / Component column only. */
const GROUP_COL_WIDTH_KEY = "labor-book-group-col-width";
const GROUP_COL_WIDTH_MIN = 200; // 12.5rem
const GROUP_COL_WIDTH_MAX = 448; // 28rem

function clampGroupColWidth(px: number): number {
  return Math.min(GROUP_COL_WIDTH_MAX, Math.max(GROUP_COL_WIDTH_MIN, Math.round(px)));
}

function readGroupColWidth(): number {
  if (typeof window === "undefined") return BROWSE_COL_WIDTH_DEFAULT;
  try {
    const raw = window.localStorage.getItem(GROUP_COL_WIDTH_KEY);
    if (raw == null) return BROWSE_COL_WIDTH_DEFAULT;
    const n = Number(raw);
    if (!Number.isFinite(n)) return BROWSE_COL_WIDTH_DEFAULT;
    return clampGroupColWidth(n);
  } catch {
    return BROWSE_COL_WIDTH_DEFAULT;
  }
}

function useGroupColumnWidth() {
  const [width, setWidth] = useState(BROWSE_COL_WIDTH_DEFAULT);

  useEffect(() => {
    setWidth(readGroupColWidth());
  }, []);

  const setLive = useCallback((next: number) => {
    setWidth(clampGroupColWidth(next));
  }, []);

  const persist = useCallback((next: number) => {
    const clamped = clampGroupColWidth(next);
    setWidth(clamped);
    try {
      window.localStorage.setItem(GROUP_COL_WIDTH_KEY, String(clamped));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  return [width, setLive, persist] as const;
}

function BrowseColumnResizeHandle({
  width,
  onWidthChange,
  onWidthCommit,
}: {
  width: number;
  onWidthChange: (width: number) => void;
  onWidthCommit: (width: number) => void;
}) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startWidth: width };
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      onWidthChange(drag.startWidth + (ev.clientX - drag.startX));
    };
    const onUp = (ev: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        target.releasePointerCapture(ev.pointerId);
      } catch {
        /* already released */
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (drag) {
        onWidthCommit(drag.startWidth + (ev.clientX - drag.startX));
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize group column"
      aria-valuemin={GROUP_COL_WIDTH_MIN}
      aria-valuemax={GROUP_COL_WIDTH_MAX}
      aria-valuenow={width}
      onPointerDown={onPointerDown}
      className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize touch-none hover:bg-brand-light/35 active:bg-brand-light/55"
    />
  );
}

function BrowseColumn({
  title,
  items,
  selectedId,
  onSelect,
  onBack,
  backLabel,
  width = BROWSE_COL_WIDTH_DEFAULT,
  onWidthChange,
  onWidthCommit,
}: {
  title: string;
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Step up one browse level (clears this column’s selection parent). */
  onBack?: () => void;
  backLabel?: string;
  /** Column width in px. Defaults to fixed System width. */
  width?: number;
  /** When both provided, column is resizable (Group/Component only). */
  onWidthChange?: (width: number) => void;
  onWidthCommit?: (width: number) => void;
}) {
  const resizable = onWidthChange != null && onWidthCommit != null;
  return (
    <div
      className="relative flex shrink-0 flex-col border-r border-brand-navy/8 bg-card min-h-0"
      style={{ width }}
    >
      <div className={COLUMN_HEADER}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel ?? `Back from ${title}`}
            title={backLabel ?? "Back"}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-brand-navy/70 transition-colors hover:bg-brand-light/20 hover:text-brand-navy"
          >
            <ArrowLeft className="size-3.5" />
          </button>
        ) : null}
        <span className="min-w-0 truncate">{title}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto py-1">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center justify-between gap-1.5 border-l-2 border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:bg-brand-light/10",
                selectedId === item.id
                  ? "border-l-brand-light bg-brand-light/15 font-semibold text-brand-navy"
                  : "text-foreground/85",
              )}
            >
              <span className="truncate">{item.label}</span>
              <ChevronRight
                className={cn(
                  "size-3.5 shrink-0",
                  selectedId === item.id ? "text-brand-light" : "text-muted-foreground/50",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
      {resizable ? (
        <BrowseColumnResizeHandle
          width={width}
          onWidthChange={onWidthChange}
          onWidthCommit={onWidthCommit}
        />
      ) : null}
    </div>
  );
}

function BrowseColumnPlaceholder({
  title,
  message,
  width = BROWSE_COL_WIDTH_DEFAULT,
  onWidthChange,
  onWidthCommit,
}: {
  title: string;
  message: string;
  width?: number;
  onWidthChange?: (width: number) => void;
  onWidthCommit?: (width: number) => void;
}) {
  const resizable = onWidthChange != null && onWidthCommit != null;
  return (
    <div
      className="relative flex shrink-0 flex-col border-r border-brand-navy/8 bg-muted/15 min-h-0"
      style={{ width }}
    >
      <div className={COLUMN_HEADER}>{title}</div>
      <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        {message}
      </div>
      {resizable ? (
        <BrowseColumnResizeHandle
          width={width}
          onWidthChange={onWidthChange}
          onWidthCommit={onWidthCommit}
        />
      ) : null}
    </div>
  );
}

function JobsBrowseColumn({
  hits,
  motorRows,
  searching,
  positionHint,
  emptySubcategoryId,
  emptyOperationId,
  onSelectHit,
  onQuickAdd,
  onQuickAddMotor,
  onGenerateAi,
  generating,
  motorMode,
  emptyJobsMessage,
  estimateButtonLabel = "Estimate with AI",
  onBack,
  backLabel,
}: {
  hits: LaborGuideHit[];
  motorRows?: LaborGridRow[];
  searching: boolean;
  generating?: boolean;
  positionHint: string | null;
  emptySubcategoryId: string | null;
  emptyOperationId?: string | null;
  onSelectHit: (hit: LaborGuideHit) => void;
  onQuickAdd: (variant: LaborVariant, hit: LaborGuideHit) => void;
  onQuickAddMotor?: (row: LaborGridRow) => void;
  onGenerateAi: () => void;
  motorMode?: boolean;
  emptyJobsMessage?: string;
  estimateButtonLabel?: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  const rows = motorRows ?? [];
  const showMotor = rows.length > 0 || (motorRows != null && searching);

  return (
    <div className="flex min-w-[20rem] flex-1 flex-col min-h-0 bg-card">
      <div className={COLUMN_HEADER}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label={backLabel ?? "Back from Jobs"}
            title={backLabel ?? "Back"}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-brand-navy/70 transition-colors hover:bg-brand-light/20 hover:text-brand-navy"
          >
            <ArrowLeft className="size-3.5" />
          </button>
        ) : null}
        <span className="min-w-0 truncate">Jobs</span>
      </div>
      {searching || generating ? (
        <div className="flex flex-1 items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {generating ? "Generating labor estimate…" : "Loading…"}
        </div>
      ) : showMotor && rows.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {positionHint ? (
            <p className="border-b border-brand-navy/8 bg-brand-light/8 px-3 py-2 text-xs text-muted-foreground">
              {positionHint}
            </p>
          ) : null}
          <div className="divide-y">
            {rows.map((row) => (
              <ResultRow
                key={row.id}
                hit={row.hit}
                presetVariant={row.variant}
                displayName={row.name}
                positionOverride={row.position}
                sourceLabelOverride={row.sourceLabel}
                onSelect={onSelectHit}
                onQuickAdd={(v, h) => (onQuickAddMotor ? onQuickAddMotor(row) : onQuickAdd(v, h))}
              />
            ))}
          </div>
        </div>
      ) : hits.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {positionHint ? (
            <p className="border-b border-brand-navy/8 bg-brand-light/8 px-3 py-2 text-xs text-muted-foreground">
              {positionHint}
            </p>
          ) : null}
          <div className="divide-y">
            {hits.map((hit) => (
              <ResultRow key={hit.id} hit={hit} onSelect={onSelectHit} onQuickAdd={onQuickAdd} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <p>
            {emptyJobsMessage ??
              (motorMode
                ? "No MOTOR applications synced for this component."
                : "No jobs match this selection for your vehicle.")}
          </p>
          {emptySubcategoryId === "brakes-pads" && emptyOperationId === "pads-rr" ? (
            <p className="max-w-xs text-xs">
              Cached jobs may be pads+rotors only — select <strong>Pads &amp; rotors</strong> in the
              Operation column, or generate a pads-only job with AI.
            </p>
          ) : emptySubcategoryId?.startsWith("brakes") ? (
            <p className="max-w-xs text-xs">
              Try another position or operation, or generate with AI for this vehicle.
            </p>
          ) : null}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onGenerateAi} disabled={generating}>
            <Sparkles className="size-4" /> {estimateButtonLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

function fmtMiles(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString() + " mi";
}

function ResultRow({
  hit,
  onSelect,
  onQuickAdd,
  disabled,
  presetVariant,
  displayName,
  positionOverride,
  sourceLabelOverride,
}: {
  hit: LaborGuideHit;
  onSelect: (hit: LaborGuideHit) => void;
  onQuickAdd: (variant: LaborVariant, hit: LaborGuideHit) => void;
  disabled?: boolean;
  presetVariant?: LaborVariant;
  /** When set (taxonomy/MOTOR grid rows), prefer over hit.jobName. */
  displayName?: string;
  positionOverride?: string | null;
  sourceLabelOverride?: string;
}) {
  const variants = presetVariant ? [presetVariant] : expandOperationVariants(hit);
  const variantCount = variants.length;
  const singleVariant = variantCount === 1 ? variants[0] : null;
  const displayHours = singleVariant?.hours ?? hit.totalHours;
  const positionBadge =
    positionOverride ?? presetVariant?.position ?? singleVariant?.position ?? null;
  const title =
    displayName ??
    (presetVariant?.position && !hit.jobName.toLowerCase().includes(presetVariant.position.toLowerCase())
      ? `${hit.jobName} — ${presetVariant.position}`
      : hit.jobName);
  /** Open detail when Additional Labor edges may apply (don't skip companions via quick-add). */
  const mayHaveCompanions =
    matchCompanionEdges({
      jobName: hit.jobName,
      queryText: hit.queryText,
      laborOperations: hit.laborOperations,
    }).length > 0;

  return (
    <button
      type="button"
      onClick={() => {
        if (singleVariant && !mayHaveCompanions) onQuickAdd(singleVariant, hit);
        else onSelect(hit);
      }}
      disabled={disabled}
      className="flex w-full items-start gap-3 border-b border-brand-navy/6 px-4 py-3 text-left transition-colors hover:bg-brand-light/8 disabled:opacity-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{title}</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              sourceLabelOverride ? "bg-brand-light/10 text-brand-navy" : sourceBadgeClass(hit.source),
            )}
          >
            {sourceLabelOverride ?? sourceBadgeLabel(hit.source, hit.dataSource)}
          </span>
          {positionBadge ? (
            <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
              {positionBadge}
            </span>
          ) : null}
          {hit.derivedFrom ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              Derived from {hit.derivedFrom} — verify hours
            </span>
          ) : null}
          {hit.confidenceScore != null && hit.confidenceScore < 0.6 ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              {Math.round(hit.confidenceScore * 100)}% confidence — verify
            </span>
          ) : null}
          {hit.auditWarnings?.length ? (
            <span
              className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
              title={hit.auditWarnings.join(" ")}
            >
              Review structure
            </span>
          ) : null}
          {hit.vehicleMatch ? (
            <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
              {hit.vehicleMatch}
            </span>
          ) : null}
          {variantCount > 1 ? (
            <span className="text-[10px] font-medium text-muted-foreground">
              {variantCount} variants
            </span>
          ) : null}
        </div>
        {hit.categoryPath ? (
          <p className="mt-0.5 text-[11px] font-medium text-brand-navy/80">{hit.categoryPath}</p>
        ) : null}
        {hit.queryText ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">&ldquo;{hit.queryText}&rdquo;</p>
        ) : null}
        {hit.laborOperations.length ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {hit.laborOperations.join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-sm font-medium tabular-nums">{displayHours.toFixed(2)} hrs</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

function OperationDetailPanel({
  hit,
  breadcrumbParts,
  vehicleId,
  motorSubGroupId,
  browsePosition,
  onBack,
  onAddVariant,
  onAddCompanion,
  disabled,
}: {
  hit: LaborGuideHit;
  breadcrumbParts: string[];
  vehicleId: string;
  motorSubGroupId?: number | null;
  browsePosition?: string | null;
  onBack: () => void;
  onAddVariant: (variant: LaborVariant) => void;
  onAddCompanion: (companion: ResolvedLaborCompanion) => void;
  disabled?: boolean;
}) {
  const variants = expandOperationVariants(hit);
  const [companions, setCompanions] = useState<ResolvedLaborCompanion[]>([]);
  const [companionsLoading, setCompanionsLoading] = useState(false);
  const [companionsEmptyHint, setCompanionsEmptyHint] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCompanions([]);
    setCompanionsEmptyHint(false);
    setCompanionsLoading(true);
    void resolveLaborGuideCompanions(vehicleId, {
      jobName: hit.jobName,
      queryText: hit.queryText,
      laborOperations: hit.laborOperations,
      motorSubGroupId: motorSubGroupId ?? null,
      position: browsePosition ?? hit.positionFilter?.[0] ?? null,
    }).then((res) => {
      if (cancelled) return;
      setCompanionsLoading(false);
      if (!res.ok) {
        setCompanions([]);
        return;
      }
      const withHours = res.companions.filter((c) => c.displayHours != null);
      setCompanions(withHours);
      setCompanionsEmptyHint(res.companions.length > 0 && withHours.length === 0);
    });
    return () => {
      cancelled = true;
    };
  }, [
    vehicleId,
    hit.id,
    hit.jobName,
    hit.queryText,
    hit.laborOperations,
    motorSubGroupId,
    browsePosition,
    hit.positionFilter,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-accent hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back to results"
        >
          <ArrowLeft className="size-4" />
        </button>
        <nav className="min-w-0 flex-1 truncate text-xs text-subtle-foreground">
          <span>Vehicle</span>
          {breadcrumbParts.map((part) => (
            <span key={part}>
              <ChevronRight className="mx-1 inline size-3" />
              <span>{part}</span>
            </span>
          ))}
          <ChevronRight className="mx-1 inline size-3" />
          <span className="font-medium text-foreground">{hit.jobName}</span>
        </nav>
      </div>

      {/* Operation header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-foreground">{hit.jobName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                sourceBadgeClass(hit.source),
              )}
            >
              {sourceBadgeLabel(hit.source)}
            </span>
            {hit.notes ? (
              <span className="line-clamp-1 text-xs text-muted-foreground">{hit.notes}</span>
            ) : null}
            {hit.derivedFrom ? (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Derived from {hit.derivedFrom} — verify hours
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {/* Primary Labor */}
        <div className="border-b bg-brand-navy/[0.04] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-brand-navy/70">
          Primary Labor
        </div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Labor</span>
          <span className="w-28 text-right">Position</span>
          <span className="w-16 text-right">Hours</span>
          <span className="w-10" />
        </div>
        <ul>
          {variants.map((v) => (
            <li
              key={v.id}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b px-4 py-2.5"
            >
              <span className="truncate text-sm leading-snug text-foreground">{hit.jobName}</span>
              <span className="w-28 truncate text-right text-xs font-medium text-foreground">
                {v.label}
              </span>
              <span className="w-16 text-right text-sm font-medium tabular-nums">
                {v.hours.toFixed(2)}
              </span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onAddVariant(v)}
                aria-label={`Add ${v.label}`}
                className="flex size-8 items-center justify-center rounded-md bg-[#5cb85c] text-white transition-colors hover:bg-[#4ea64e] disabled:opacity-50"
              >
                <Plus className="size-4" />
              </button>
            </li>
          ))}
        </ul>

        {/* Additional Labor (companions) */}
        {companionsLoading ? (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading related labor…
          </div>
        ) : companions.length > 0 ? (
          <>
            <div className="border-b bg-brand-light/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-brand-navy/80">
              Additional Labor
            </div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b bg-muted/40 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Related</span>
              <span className="w-28 text-right">Note</span>
              <span className="w-16 text-right">Hours</span>
              <span className="w-10" />
            </div>
            <ul>
              {companions.map((c) => (
                <li
                  key={c.edgeId}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 border-b px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <span className="truncate text-sm leading-snug text-foreground">
                      {c.jobName}
                    </span>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
                        {c.sourceBadge}
                      </span>
                      {c.position ? (
                        <span className="rounded-full bg-brand-light/20 px-2 py-0.5 text-[10px] font-semibold text-brand-navy">
                          {c.position}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className="w-28 truncate text-right text-[10px] text-muted-foreground"
                    title={c.hoursNote ?? undefined}
                  >
                    {c.hoursMode === "concurrent"
                      ? "with primary"
                      : c.hoursMode === "standalone"
                        ? "often together"
                        : "—"}
                  </span>
                  <span className="w-16 text-right text-sm font-medium tabular-nums">
                    {c.displayHours != null ? c.displayHours.toFixed(2) : "—"}
                  </span>
                  <button
                    type="button"
                    disabled={disabled || c.displayHours == null}
                    onClick={() => onAddCompanion(c)}
                    aria-label={`Add ${c.jobName}`}
                    className="flex size-8 items-center justify-center rounded-md bg-[#5cb85c] text-white transition-colors hover:bg-[#4ea64e] disabled:opacity-50"
                  >
                    <Plus className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : companionsEmptyHint ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            No related labor cached yet for this vehicle.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SmartLaborGuide({
  vehicleId,
  roId,
  customerName,
  vehicleLabel,
  specLine,
  mileageIn,
  odometerNotWorking,
  variant = "default",
  presentation = "fullscreen",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  hideTrigger = false,
  addMode = "createJob",
  onAddLines,
  submitLabel,
}: {
  vehicleId: string;
  roId: string;
  customerName: string;
  vehicleLabel: string;
  specLine: string;
  mileageIn?: number | null;
  odometerNotWorking?: boolean;
  variant?: "default" | "hero";
  /** Floating = large centered overlay (~90vw × ~90vh); fullscreen = viewport takeover. */
  presentation?: "fullscreen" | "floating";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  /** When addLines, cart confirms into an existing job via callback instead of creating a job. */
  addMode?: "createJob" | "addLines";
  onAddLines?: (lines: Omit<LaborCartLine, "key">[]) => void;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;
  const [request, setRequest] = useState("");
  const [hits, setHits] = useState<LaborGuideHit[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [jobName, setJobName] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [selectedHit, setSelectedHit] = useState<LaborGuideHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [generating, startGen] = useTransition();
  const [creating, startCreate] = useTransition();
  const keyRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [motorInitLoading, setMotorInitLoading] = useState(false);
  const [motorSource, setMotorSource] = useState<LaborBookMotorSource>("shop");
  const [catalogMode, setCatalogMode] = useState<LaborCatalogMode>("reference");
  const [baseVehicleId, setBaseVehicleId] = useState<number | null>(null);
  const [motorTree, setMotorTree] = useState<LaborBookMotorSidebarNode[]>([]);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [selectedMotorSystemKey, setSelectedMotorSystemKey] = useState<string | null>(null);
  const [selectedMotorGroupKey, setSelectedMotorGroupKey] = useState<string | null>(null);
  const [selectedMotorSubGroup, setSelectedMotorSubGroup] =
    useState<MotorSubGroupSelection | null>(null);
  const [motorJobs, setMotorJobs] = useState<LaborGridRow[]>([]);
  const [groupColWidth, setGroupColWidthLive, commitGroupColWidth] =
    useGroupColumnWidth();

  const useMotorBrowseUI = motorTree.length > 0;
  const isLicensedMotorMode = catalogMode === "licensed" && motorSource === "motor";
  const isReferenceTaxonomyBrowse = catalogMode === "reference" && useMotorBrowseUI;
  const useTaxonomyJobsColumn = isLicensedMotorMode || isReferenceTaxonomyBrowse;
  const catalogLabels = laborCatalogDisplayLabels(catalogMode);

  const odometerLabel = odometerNotWorking
    ? "Odometer N/A"
    : `Odometer In: ${fmtMiles(mileageIn)}`;

  function resetAll() {
    setRequest("");
    setHits([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedHit(null);
    setJobName("");
    setCartLines([]);
    setError(null);
    setSelectedMotorSystemKey(null);
    setSelectedMotorGroupKey(null);
    setSelectedMotorSubGroup(null);
    setMotorJobs([]);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setMotorInitLoading(true);
    void getLaborBookMotorInit(vehicleId).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setMotorSource("shop");
        setMotorTree([]);
        setBaseVehicleId(null);
        setSyncBanner(null);
      } else {
        setMotorSource(res.source);
        setCatalogMode(res.catalogMode);
        setMotorTree(res.tree);
        setBaseVehicleId(res.baseVehicleId);
        setSyncBanner(res.syncBanner ?? null);
      }
      setMotorInitLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, vehicleId]);

  const loadMotorApplications = useCallback(
    (selection: MotorSubGroupSelection) => {
      if (baseVehicleId == null && !isReferenceTaxonomyBrowse) return;
      setSelectedHit(null);
      setError(null);
      setMotorJobs([]);
      setHits([]);
      startSearch(async () => {
        const res = await getLaborBookMotorApplications(
          vehicleId,
          // Reference mode does not use MOTOR BaseVehicleID; 0 = shop cache/AI only.
          baseVehicleId ?? (isReferenceTaxonomyBrowse ? 0 : MOTOR_REFERENCE_BASE_VEHICLE_ID),
          selection.motorSubGroupId,
        );
        if (!res.ok) {
          setError(res.error);
          setMotorJobs([]);
          return;
        }
        setMotorJobs(
          res.rows.map((row) => ({
            ...row,
            hit: {
              ...row.hit,
              categoryPath: selection.path.join(" › "),
            },
          })),
        );
      });
    },
    [vehicleId, baseVehicleId, isReferenceTaxonomyBrowse],
  );

  function selectMotorSystem(systemKey: string) {
    setSelectedMotorSystemKey(systemKey);
    setSelectedMotorGroupKey(null);
    setSelectedMotorSubGroup(null);
    setSelectedHit(null);
    setMotorJobs([]);
    setHits([]);
    setError(null);
    setRequest("");
  }

  function selectMotorGroup(groupKey: string) {
    setSelectedMotorGroupKey(groupKey);
    setSelectedMotorSubGroup(null);
    setSelectedHit(null);
    setMotorJobs([]);
    setHits([]);
    setError(null);
  }

  function selectMotorSubGroup(subGroupKey: string) {
    const system = motorTree.find((s) => s.nodeKey === selectedMotorSystemKey);
    const group = system?.children.find((g) => g.nodeKey === selectedMotorGroupKey);
    const sub = group?.children.find((sg) => sg.nodeKey === subGroupKey);
    if (!system || !group || !sub?.motorSubGroupId || !group.motorGroupId) return;

    const selection: MotorSubGroupSelection = {
      nodeKey: sub.nodeKey,
      motorSystemId: sub.motorSystemId,
      motorGroupId: group.motorGroupId,
      motorSubGroupId: sub.motorSubGroupId,
      path: [system.name, group.name, sub.name],
    };
    setSelectedMotorSubGroup(selection);
    setSelectedHit(null);
    if (useTaxonomyJobsColumn) {
      loadMotorApplications(selection);
    } else {
      loadShopBrowseForMotorSubGroup(selection);
    }
  }

  /** Step up one level: Component → Group list, or Group → System only. */
  function backMotorBrowseColumn() {
    setSelectedHit(null);
    setMotorJobs([]);
    setHits([]);
    setError(null);
    if (selectedMotorGroup) {
      setSelectedMotorGroupKey(null);
      setSelectedMotorSubGroup(null);
      return;
    }
    setSelectedMotorSystemKey(null);
    setSelectedMotorGroupKey(null);
    setSelectedMotorSubGroup(null);
  }

  /** Jobs → clear component selection, stay on group. */
  function backMotorFromJobs() {
    setSelectedMotorSubGroup(null);
    setSelectedHit(null);
    setMotorJobs([]);
    setHits([]);
    setError(null);
  }

  function addMotorRowToCart(row: LaborGridRow) {
    addVariantToCart(row.variant, row.hit);
  }

  const runSearch = useCallback(
    (q: string) => {
      setSelectedHit(null);
      if (!q.trim()) {
        setHits([]);
        return;
      }
      startSearch(async () => {
        const res = await searchLaborGuide(vehicleId, q);
        if (res.ok) setHits(res.hits);
        else setError(res.error);
      });
    },
    [vehicleId],
  );

  useEffect(() => {
    if (!request.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(request), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [request, runSearch]);

  const loadBrowseResults = useCallback(
    (subcategoryId: string, positionId?: string | null, operationId?: string | null) => {
      setSelectedHit(null);
      setError(null);
      startSearch(async () => {
        const res = await browseLaborGuideSubcategory(
          vehicleId,
          subcategoryId,
          positionId,
          operationId,
        );
        if (res.ok) setHits(res.hits);
        else setError(res.error);
      });
    },
    [vehicleId],
  );

  const loadShopBrowseForMotorSubGroup = useCallback(
    (selection: MotorSubGroupSelection) => {
      const shopSubId = `motor-sg-${selection.motorSubGroupId}`;
      setSelectedCategory(`motor-s-${selection.motorSystemId}`);
      setSelectedSubcategory(shopSubId);
      setSelectedPosition(null);
      setSelectedOperation(null);
      setMotorJobs([]);
      loadBrowseResults(shopSubId);
    },
    [loadBrowseResults],
  );

  const applyMotorPath = useCallback(
    (selection: MotorSubGroupSelection) => {
      const keys = motorKeysForSubGroup(motorTree, selection.motorSubGroupId);
      setRequest("");
      setSelectedHit(null);
      setError(null);
      setHits([]);
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setSelectedPosition(null);
      setSelectedOperation(null);
      setSelectedMotorSystemKey(keys?.systemKey ?? null);
      setSelectedMotorGroupKey(keys?.groupKey ?? null);
      setSelectedMotorSubGroup(selection);
      if (useTaxonomyJobsColumn) {
        loadMotorApplications(selection);
      } else {
        loadShopBrowseForMotorSubGroup(selection);
      }
    },
    [motorTree, loadMotorApplications, loadShopBrowseForMotorSubGroup, useTaxonomyJobsColumn],
  );

  const applyBrowsePath = useCallback(
    (path: ShopLibraryBrowsePath) => {
      setRequest("");
      setSelectedHit(null);
      setError(null);
      setHits([]);
      setSelectedCategory(path.categoryId);
      setSelectedSubcategory(path.subcategoryId);
      setSelectedPosition(path.positionId ?? null);
      setSelectedOperation(path.operationId ?? null);
      loadBrowseResults(path.subcategoryId, path.positionId, path.operationId);
    },
    [loadBrowseResults],
  );

  function selectSubcategory(subcategoryId: string) {
    const found = laborSubcategoryById(subcategoryId);
    if (found) setSelectedCategory(found.category.id);
    setSelectedSubcategory(subcategoryId);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedHit(null);
    setRequest("");
    setHits([]);
    setError(null);

    if (shouldLoadOnSubcategorySelect(subcategoryId)) {
      loadBrowseResults(subcategoryId);
      return;
    }

    const implicitPos = implicitBrowsePositionId(subcategoryId);
    if (implicitPos) setSelectedPosition(implicitPos);
  }

  function selectCategory(categoryId: string) {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedHit(null);
    setRequest("");
    setHits([]);
    setError(null);
  }

  function backLegacyFromComponent() {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedHit(null);
    setHits([]);
    setError(null);
  }

  function backLegacyFromPositionOrOperation() {
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedHit(null);
    setHits([]);
    setError(null);
  }

  function backLegacyFromJobs() {
    if (selectedOperation) {
      setSelectedOperation(null);
      setSelectedHit(null);
      setHits([]);
      return;
    }
    if (selectedPosition) {
      setSelectedPosition(null);
      setSelectedHit(null);
      setHits([]);
      return;
    }
    setSelectedSubcategory(null);
    setSelectedHit(null);
    setHits([]);
    setError(null);
  }

  function selectBrowsePosition(positionId: string) {
    if (!selectedSubcategory) return;
    const opFirst = subcategoryUsesOperationFirst(selectedSubcategory);
    setSelectedPosition(positionId);
    setSelectedHit(null);
    setHits([]);

    if (!opFirst) {
      setSelectedOperation(null);
    }

    if (
      shouldLoadBrowseResults(selectedSubcategory, positionId, opFirst ? selectedOperation : null)
    ) {
      loadBrowseResults(selectedSubcategory, positionId, selectedOperation);
    }
  }

  function selectBrowseOperation(operationId: string) {
    if (!selectedSubcategory) return;
    const opFirst = subcategoryUsesOperationFirst(selectedSubcategory);
    setSelectedOperation(operationId);
    setSelectedHit(null);
    setHits([]);

    if (opFirst) {
      setSelectedPosition(null);
    }

    const pos = opFirst ? selectedPosition : selectedPosition;
    if (shouldLoadBrowseResults(selectedSubcategory, pos, operationId)) {
      loadBrowseResults(selectedSubcategory, pos ?? implicitBrowsePositionId(selectedSubcategory), operationId);
    }
  }

  function generateAi(query?: string) {
    const q = (query ?? request).trim();
    if (!q) return;
    setError(null);
    setSelectedHit(null);
    const taxonomyJobsGenerate = useTaxonomyJobsColumn && selectedMotorSubGroup != null;
    const motorContext =
      useTaxonomyJobsColumn && selectedMotorSubGroup && baseVehicleId != null
        ? {
            baseVehicleId,
            motorSubGroupId: selectedMotorSubGroup.motorSubGroupId,
            motorGroupId: selectedMotorSubGroup.motorGroupId,
            motorSystemId: selectedMotorSubGroup.motorSystemId,
          }
        : isReferenceTaxonomyBrowse && selectedMotorSubGroup
          ? {
              // Taxonomy scope only — no sandbox BaseVehicleID (Civic 22124) while MOTOR is disconnected.
              motorSubGroupId: selectedMotorSubGroup.motorSubGroupId,
              motorGroupId: selectedMotorSubGroup.motorGroupId,
              motorSystemId: selectedMotorSubGroup.motorSystemId,
            }
          : {};
    startGen(async () => {
      const res = await generateLaborSuggestion(vehicleId, q, motorContext);
      if (res.ok) {
        const categoryPath =
          res.categoryPath ??
          (selectedMotorSubGroup ? selectedMotorSubGroup.path.join(" › ") : undefined);
        const base = suggestionToHit(res.suggestion, q, res.cached, res.auditWarnings, {
          dataSource: res.dataSource,
          categoryPath,
        });
        const enriched = enrichHitsWithPosition([base], q);
        const hit = enriched[0] ?? base;

        // Taxonomy/MOTOR Jobs column: expand axle-scoped AI into Front/Rear (etc.)
        // pickable rows — do not jump into a single unlabeled detail hit.
        if (taxonomyJobsGenerate) {
          const rows = hitsToGridRows([hit], "all");
          setMotorJobs(rows);
          setHits([]);
          setSelectedHit(null);
          return;
        }

        setHits([hit]);
        setSelectedHit(hit);
      } else setError(res.error);
    });
  }

  function appendCartLines(lines: Omit<CartLine, "key">[], defaultJobName?: string) {
    setCartLines((prev) => [
      ...prev,
      ...lines.map((l) => ({ ...l, key: keyRef.current++ })),
    ]);
    if (!jobName.trim() && defaultJobName) setJobName(defaultJobName);
  }

  function addVariantToCart(variant: LaborVariant, hit: LaborGuideHit) {
    appendCartLines([variantToCartLine(variant, hit, hit.source)], guideJobName(hit.jobName));
  }

  function addCompanionToCart(companion: ResolvedLaborCompanion) {
    if (companion.displayHours == null) return;
    const variantLabel =
      companion.hoursMode === "concurrent"
        ? companion.position
          ? `${companion.position} · with primary`
          : "with primary"
        : companion.hoursMode === "standalone"
          ? "often done together"
          : companion.sourceBadge;
    appendCartLines(
      [
        {
          description: companion.description,
          variantLabel,
          hours: companion.displayHours,
          source: companion.hitSource,
        },
      ],
      guideJobName(companion.jobName),
    );
  }

  function removeLine(key: number) {
    setCartLines((c) => c.filter((r) => r.key !== key));
  }

  function updateLineHours(key: number, hours: number) {
    setCartLines((c) => c.map((r) => (r.key === key ? { ...r, hours: Math.max(0, hours) } : r)));
  }

  function confirmCart() {
    if (!cartLines.length) return;
    const payload = cartLines.map(({ description, hours, source }) => ({
      description,
      hours,
      source,
    }));

    if (addMode === "addLines" && onAddLines) {
      onAddLines(payload);
      resetAll();
      return;
    }

    startCreate(async () => {
      const res = await addLaborGuideJob(
        roId,
        jobName.trim() || cartLines[0]?.description || "Labor",
        payload,
      );
      if (res.ok) {
        setOpen(false);
        resetAll();
        router.refresh();
      } else setError(res.error);
    });
  }

  const cartHours = cartLines.reduce((s, r) => s + r.hours, 0);
  const showZeroHitsPrompt =
    !selectedHit &&
    request.trim().length > 2 &&
    !searching &&
    !generating &&
    hits.length === 0;

  const libraryCategoryLabel = selectedCategory
    ? (laborCategoryById(selectedCategory)?.label ?? "Browse")
    : request.trim()
      ? "Search"
      : "Results";

  function hitCategoryPathParts(hit: LaborGuideHit | null): string[] | null {
    if (!hit?.categoryPath) return null;
    return hit.categoryPath.split(" › ");
  }

  const detailBreadcrumbParts = (() => {
    if (useMotorBrowseUI && selectedMotorSubGroup) return selectedMotorSubGroup.path;
    if (selectedSubcategory) {
      return browseBreadcrumbParts(selectedSubcategory, selectedPosition, selectedOperation);
    }
    if (hitCategoryPathParts(selectedHit)) return hitCategoryPathParts(selectedHit)!;
    if (selectedCategory) return [libraryCategoryLabel];
    return request.trim() ? ["Search"] : [];
  })();

  const selectedMotorSystem = useMotorBrowseUI
    ? motorTree.find((s) => s.nodeKey === selectedMotorSystemKey) ?? null
    : null;
  const selectedMotorGroup =
    selectedMotorSystem?.children.find((g) => g.nodeKey === selectedMotorGroupKey) ?? null;
  const motorComponentItems = selectedMotorGroup
    ? selectedMotorGroup.children.map((sg) => ({ id: sg.nodeKey, label: sg.name }))
    : selectedMotorSystem
      ? selectedMotorSystem.children.map((g) => ({ id: g.nodeKey, label: g.name }))
      : [];
  const motorComponentTitle = selectedMotorGroup ? "Component" : "Group";
  const motorBrowseReady = useMotorBrowseUI && selectedMotorSubGroup != null;

  const activeCategory = !useMotorBrowseUI && selectedCategory ? laborCategoryById(selectedCategory) : null;
  const browseOpFirst = selectedSubcategory
    ? subcategoryUsesOperationFirst(selectedSubcategory)
    : false;
  const browseReady =
    useMotorBrowseUI
      ? motorBrowseReady
      : Boolean(selectedSubcategory) &&
        isBrowsePathComplete(selectedSubcategory, selectedPosition, selectedOperation);
  const showOperationColumn = shouldShowOperationColumn(
    selectedSubcategory,
    selectedPosition,
    selectedOperation,
  );
  const showPositionColumn = shouldShowPositionColumn(
    selectedSubcategory,
    selectedPosition,
    selectedOperation,
  );
  const positionBrowseHint =
    browseReady && !request.trim() && hits.length > 0
      ? browsePositionHint(hits, selectedSubcategory)
      : null;
  const libraryBrowsing = !request.trim() && !selectedHit && !generating && !motorInitLoading;

  const sourceBadgeText = isLicensedMotorMode
    ? `Source: ${catalogLabels.sourceBadge} · BaseVehicleID ${baseVehicleId}`
    : isReferenceTaxonomyBrowse
      ? `Source: ${catalogLabels.sourceBadge}`
      : useMotorBrowseUI
        ? `Source: Shop library · industry reference taxonomy (8 systems)`
        : baseVehicleId
          ? `Source: Shop library · BaseVehicleID ${baseVehicleId}`
          : "Source: Shop library";

  const showSearchResults =
    !selectedHit &&
    request.trim().length > 0 &&
    !searching &&
    !generating &&
    hits.length > 0;

  const isFloating = presentation === "floating";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetAll();
      }}
    >
      {!hideTrigger ? (
      <Button
        variant={variant === "hero" ? "outline" : "ghost"}
        size="sm"
        className={cn(
          variant === "hero"
            ? "ro-hero-action-btn h-7 gap-1.5 rounded-md border-brand-navy/20 bg-white px-2.5 text-xs font-semibold text-brand-navy shadow-sm hover:border-brand-light/60 hover:bg-brand-light/15"
            : "h-9 gap-1.5 text-muted-foreground hover:bg-brand-light/20 hover:text-brand-navy",
        )}
        onClick={() => setOpen(true)}
      >
        <ListTree className={cn("size-4", variant === "hero" && "size-3.5 text-brand-light")} /> Labor Book
      </Button>
      ) : null}

      <DialogContent
        showCloseButton={false}
        overlayClassName={
          isFloating
            ? // Full-viewport dimmed backdrop (Tekmetric Labor Guide–style floating panel)
              "bg-black/45 supports-backdrop-filter:backdrop-blur-[2px]"
            : undefined
        }
        className={cn(
          "grid grid-rows-[auto_1fr] gap-0 bg-card p-0 outline-none",
          isFloating
            ? // Large centered overlay ~90vw × ~90vh (Tekmetric Labor Guide proportions)
              "top-1/2 left-1/2 h-[min(90vh,920px)] max-h-[90vh] w-[min(96vw,1400px)] max-w-[min(96vw,1400px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-brand-navy/12 shadow-2xl ring-1 ring-brand-navy/8 duration-200 sm:max-w-[min(96vw,1400px)] data-open:zoom-in-95 data-closed:zoom-out-95"
            : "top-0 left-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 ring-0 sm:max-w-none",
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-brand-navy/10">
          <div className="flex items-center gap-3 bg-brand-navy px-5 py-3 text-primary-foreground">
            <ShoppingCart className="size-7 shrink-0 rounded-full bg-brand-light/20 p-1.5 text-brand-light" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-[15px] font-semibold text-primary-foreground">
                Labor Book: {customerName ? `${customerName}'s ` : ""}
                {vehicleLabel}
              </DialogTitle>
              <DialogDescription className="truncate text-xs text-primary-foreground/75">
                {odometerLabel}
                {specLine ? `  ·  ${specLine}` : ""}
              </DialogDescription>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="rounded-md p-1.5 text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-[1fr_360px] overflow-hidden">
          {/* Main panel */}
          <div className="flex min-h-0 flex-col overflow-hidden bg-background">
            {/* Shop Library toolbar */}
            <div
              className={cn(
                "shrink-0 border-b border-brand-navy/10 bg-gradient-to-b from-muted/40 to-card",
                isFloating ? "px-4 py-2.5" : "px-5 py-3",
              )}
            >
              <div className="mb-2 flex min-w-0 items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-navy/8 text-brand-navy">
                  <Library className="size-3.5" />
                </div>
                <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {catalogLabels.browseTitle}
                </h2>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    isLicensedMotorMode
                      ? "bg-brand-light/15 text-brand-navy"
                      : isReferenceTaxonomyBrowse
                        ? "bg-brand-red/10 text-brand-red"
                        : "bg-muted text-muted-foreground",
                  )}
                  title={
                    useMotorBrowseUI
                      ? catalogLabels.browseSubtitle
                      : "Browse by system or search cached jobs for this vehicle"
                  }
                >
                  {sourceBadgeText}
                </span>
                <span
                  className="ml-auto inline-flex shrink-0 items-center text-muted-foreground"
                  title="Labor times are shop estimates — verify before quoting."
                >
                  <Info className="size-3.5 text-brand-light" aria-hidden />
                  <span className="sr-only">Labor times are shop estimates — verify before quoting.</span>
                </span>
              </div>
              {syncBanner ? (
                <p className="mb-2 truncate text-[11px] text-amber-800" title={syncBanner}>
                  {syncBanner}
                </p>
              ) : null}

              {/* Search */}
              <div className="space-y-2.5">
                <div
                  className={cn(
                    "relative flex items-center gap-2 rounded-lg border bg-card shadow-sm transition-[border-color,box-shadow]",
                    "border-brand-navy/12 focus-within:border-brand-light/45 focus-within:ring-2 focus-within:ring-brand-light/15",
                  )}
                >
                  <Search className="pointer-events-none ml-3 size-4 shrink-0 text-muted-foreground" />
                  <Input
                    value={request}
                    onChange={(e) => {
                      setRequest(e.target.value);
                      setSelectedCategory(null);
                      setSelectedSubcategory(null);
                      setSelectedPosition(null);
                      setSelectedOperation(null);
                      setSelectedMotorSystemKey(null);
                      setSelectedMotorGroupKey(null);
                      setSelectedMotorSubGroup(null);
                      setMotorJobs([]);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && request.trim()) {
                        e.preventDefault();
                        generateAi();
                      }
                    }}
                    placeholder="Search cached jobs or describe a repair to generate with AI…"
                    className="h-11 flex-1 border-0 bg-transparent pl-0 pr-2 shadow-none focus-visible:ring-0"
                  />
                  {request.trim() ? (
                    <Button
                      onClick={() => generateAi()}
                      disabled={generating}
                      size="sm"
                      className="mr-1.5 shrink-0 gap-1.5 bg-brand-light text-brand-navy hover:bg-brand-light/90"
                    >
                      {generating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Sparkles className="size-4" />
                      )}
                      Generate
                    </Button>
                  ) : searching ? (
                    <Loader2 className="mr-3 size-4 shrink-0 animate-spin text-brand-light" />
                  ) : (
                    <span className="mr-3 hidden items-center gap-1 rounded-full bg-brand-light/10 px-2 py-0.5 text-[10px] font-medium text-brand-navy sm:inline-flex">
                      <Sparkles className="size-3 text-brand-light" />
                      AI
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Quick picks
                  </span>
                  {SHOP_LIBRARY_CHIPS.map((chip) => {
                    const active = chip.browsePath
                      ? useMotorBrowseUI
                        ? selectedMotorSubGroup != null &&
                          motorSelectionForChip(motorTree, chip)?.motorSubGroupId ===
                            selectedMotorSubGroup.motorSubGroupId &&
                          !request.trim()
                        : selectedSubcategory === chip.browsePath.subcategoryId &&
                          (chip.browsePath.positionId ?? null) === selectedPosition &&
                          (chip.browsePath.operationId ?? null) === selectedOperation &&
                          !request.trim()
                      : request.trim().toLowerCase() === chip.query.toLowerCase();
                    return (
                      <button
                        key={chip.query}
                        type="button"
                        onClick={() => {
                          if (useMotorBrowseUI) {
                            const motorSel = motorSelectionForChip(motorTree, chip);
                            if (motorSel) {
                              applyMotorPath(motorSel);
                              return;
                            }
                          }
                          if (chip.browsePath) {
                            applyBrowsePath(chip.browsePath);
                            return;
                          }
                          setRequest(chip.query);
                          setSelectedCategory(null);
                          setSelectedSubcategory(null);
                          setSelectedPosition(null);
                          setSelectedOperation(null);
                          setSelectedMotorSystemKey(null);
                          setSelectedMotorGroupKey(null);
                          setSelectedMotorSubGroup(null);
                          setMotorJobs([]);
                          setSelectedHit(null);
                          setHits([]);
                          setError(null);
                        }}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          active
                            ? "border-brand-light bg-brand-light/15 text-brand-navy shadow-sm"
                            : "border-brand-navy/12 bg-card text-muted-foreground hover:border-brand-light/40 hover:bg-brand-light/8 hover:text-foreground",
                        )}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Body: miller columns (browse) or search / AI / detail */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {error ? (
                <p className="mx-4 mt-3 shrink-0 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              {selectedHit ? (
                <OperationDetailPanel
                  hit={selectedHit}
                  breadcrumbParts={detailBreadcrumbParts}
                  vehicleId={vehicleId}
                  motorSubGroupId={selectedMotorSubGroup?.motorSubGroupId ?? null}
                  browsePosition={
                    selectedPosition ??
                    selectedHit.positionFilter?.[0] ??
                    null
                  }
                  onBack={() => setSelectedHit(null)}
                  onAddVariant={(v) => addVariantToCart(v, selectedHit)}
                  onAddCompanion={addCompanionToCart}
                />
              ) : null}

              {generating && !selectedHit && !libraryBrowsing ? (
                <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Estimating labor for this vehicle…
                </div>
              ) : null}

              {motorInitLoading && !selectedHit ? (
                <div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading labor catalog…
                </div>
              ) : null}

              {libraryBrowsing && !selectedHit ? (
                <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden border-t border-brand-navy/6">
                  {useMotorBrowseUI ? (
                    <>
                      <BrowseColumn
                        title="System"
                        items={motorTree.map((s) => ({ id: s.nodeKey, label: s.name }))}
                        selectedId={selectedMotorSystemKey}
                        onSelect={selectMotorSystem}
                      />
                      {selectedMotorSystem ? (
                        <BrowseColumn
                          title={motorComponentTitle}
                          items={motorComponentItems}
                          selectedId={
                            selectedMotorGroup
                              ? (selectedMotorSubGroup?.nodeKey ?? null)
                              : selectedMotorGroupKey
                          }
                          onSelect={(id) => {
                            if (selectedMotorGroup) selectMotorSubGroup(id);
                            else selectMotorGroup(id);
                          }}
                          onBack={backMotorBrowseColumn}
                          backLabel={
                            selectedMotorGroup ? "Back to groups" : "Back to systems"
                          }
                          width={groupColWidth}
                          onWidthChange={setGroupColWidthLive}
                          onWidthCommit={commitGroupColWidth}
                        />
                      ) : (
                        <BrowseColumnPlaceholder
                          title="Group"
                          message="Select a system to browse groups"
                          width={groupColWidth}
                          onWidthChange={setGroupColWidthLive}
                          onWidthCommit={commitGroupColWidth}
                        />
                      )}
                      {motorBrowseReady ? (
                        <JobsBrowseColumn
                          hits={useTaxonomyJobsColumn ? [] : hits}
                          motorRows={useTaxonomyJobsColumn ? motorJobs : []}
                          searching={searching}
                          generating={generating}
                          positionHint={null}
                          emptySubcategoryId={null}
                          motorMode={useTaxonomyJobsColumn}
                          emptyJobsMessage={catalogLabels.emptySubGroupMessage}
                          estimateButtonLabel={catalogLabels.estimateButtonLabel}
                          onSelectHit={setSelectedHit}
                          onQuickAdd={addVariantToCart}
                          onQuickAddMotor={addMotorRowToCart}
                          onBack={backMotorFromJobs}
                          backLabel="Back to components"
                          onGenerateAi={() => {
                            const subName =
                              selectedMotorSubGroup?.path.at(-1) ?? "Labor operation";
                            generateAi(`${subName} R&R`);
                          }}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                  <BrowseColumn
                    title="System"
                    items={LABOR_CATEGORY_TREE.map((c) => ({ id: c.id, label: c.label }))}
                    selectedId={selectedCategory}
                    onSelect={selectCategory}
                  />
                  {activeCategory ? (
                    <BrowseColumn
                      title="Component"
                      items={activeCategory.subcategories.map((s) => ({ id: s.id, label: s.label }))}
                      selectedId={selectedSubcategory}
                      onSelect={selectSubcategory}
                      onBack={backLegacyFromComponent}
                      backLabel="Back to systems"
                      width={groupColWidth}
                      onWidthChange={setGroupColWidthLive}
                      onWidthCommit={commitGroupColWidth}
                    />
                  ) : (
                    <BrowseColumnPlaceholder
                      title="Component"
                      message="Select a system to browse components"
                      width={groupColWidth}
                      onWidthChange={setGroupColWidthLive}
                      onWidthCommit={commitGroupColWidth}
                    />
                  )}
                  {selectedSubcategory ? (
                    browseOpFirst ? (
                      <>
                        {showOperationColumn ? (
                          <BrowseColumn
                            title="Operation"
                            items={operationFacetsForSubcategory(selectedSubcategory)}
                            selectedId={selectedOperation}
                            onSelect={selectBrowseOperation}
                            onBack={backLegacyFromPositionOrOperation}
                            backLabel="Back to components"
                          />
                        ) : null}
                        {showPositionColumn ? (
                          <BrowseColumn
                            title="Position"
                            items={positionFacetsForSubcategory(selectedSubcategory)}
                            selectedId={selectedPosition}
                            onSelect={selectBrowsePosition}
                            onBack={() => {
                              if (showOperationColumn && selectedOperation) {
                                setSelectedOperation(null);
                                setSelectedPosition(null);
                                setHits([]);
                              } else {
                                backLegacyFromPositionOrOperation();
                              }
                            }}
                            backLabel="Back"
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        {showPositionColumn ? (
                          <BrowseColumn
                            title="Position"
                            items={positionFacetsForSubcategory(selectedSubcategory)}
                            selectedId={selectedPosition}
                            onSelect={selectBrowsePosition}
                            onBack={backLegacyFromPositionOrOperation}
                            backLabel="Back to components"
                          />
                        ) : null}
                        {showOperationColumn ? (
                          <BrowseColumn
                            title="Operation"
                            items={operationFacetsForSubcategory(selectedSubcategory)}
                            selectedId={selectedOperation}
                            onSelect={selectBrowseOperation}
                            onBack={() => {
                              if (showPositionColumn && selectedPosition) {
                                setSelectedOperation(null);
                                setHits([]);
                              } else {
                                backLegacyFromPositionOrOperation();
                              }
                            }}
                            backLabel="Back"
                          />
                        ) : null}
                      </>
                    )
                  ) : null}
                  {browseReady && selectedSubcategory ? (
                    <JobsBrowseColumn
                      hits={hits}
                      searching={searching}
                      generating={generating}
                      positionHint={positionBrowseHint}
                      emptySubcategoryId={selectedSubcategory}
                      emptyOperationId={selectedOperation}
                      onSelectHit={setSelectedHit}
                      onQuickAdd={addVariantToCart}
                      onBack={backLegacyFromJobs}
                      backLabel="Back"
                      onGenerateAi={() => {
                        const q =
                          browseSyntheticQuery(
                            selectedSubcategory,
                            selectedPosition,
                            selectedOperation,
                          ) ||
                          laborSubcategoryById(selectedSubcategory)?.subcategory.label ||
                          "";
                        generateAi(q);
                      }}
                    />
                  ) : null}
                    </>
                  )}
                </div>
              ) : null}

              {showSearchResults ? (
                <div className="min-h-0 flex-1 overflow-auto">
                  <div className={cn(COLUMN_HEADER, "px-4")}>
                    Search results · &ldquo;{request.trim()}&rdquo;
                  </div>
                  <div className="divide-y">
                    {hits.map((hit) => (
                      <ResultRow
                        key={hit.id}
                        hit={hit}
                        onSelect={setSelectedHit}
                        onQuickAdd={addVariantToCart}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {showZeroHitsPrompt ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-sm text-muted-foreground">
                  <p>No matches in shop library or cache for &ldquo;{request.trim()}&rdquo;.</p>
                  {/\b(?:front|rear)\b/i.test(request) ? (
                    <p className="max-w-sm text-xs">
                      Try the opposite position chip above, or browse Brakes in the column picker.
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => generateAi()}
                    disabled={generating}
                  >
                    <Sparkles className="size-4" /> Generate with AI
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {/* Cart — single job */}
          <div className="flex min-h-0 flex-col border-l bg-muted/20">
            <div className="border-b px-4 py-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Job name
              </label>
              <Input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                placeholder="e.g. Front brake service"
                className="h-9 bg-card text-sm"
              />
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2 border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Labor lines</span>
              <span>Hours</span>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">
              {cartLines.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No labor added</p>
              ) : (
                <ul className="divide-y">
                  {cartLines.map((r) => (
                    <li key={r.key} className="px-4 py-2.5">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium leading-snug">{r.description}</span>
                          {r.variantLabel ? (
                            <p className="text-xs text-muted-foreground">{r.variantLabel}</p>
                          ) : null}
                        </div>
                        <button
                          onClick={() => removeLine(r.key)}
                          aria-label={`Remove ${r.description}`}
                          className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            sourceBadgeClass(r.source),
                          )}
                        >
                          {sourceBadgeLabel(r.source)}
                        </span>
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={r.hours}
                          onChange={(e) => updateLineHours(r.key, Number(e.target.value) || 0)}
                          className="h-7 w-20 text-right text-sm tabular-nums"
                          aria-label={`Hours for ${r.description}`}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t bg-card px-4 py-3">
              {cartLines.length > 0 ? (
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {cartLines.length} line{cartLines.length === 1 ? "" : "s"}
                  </span>
                  <span className="font-medium tabular-nums">{cartHours.toFixed(2)} hrs</span>
                </div>
              ) : null}
              <Button
                onClick={confirmCart}
                disabled={cartLines.length === 0 || creating}
                className="w-full gap-1.5"
              >
                {creating ? <Loader2 className="size-4 animate-spin" /> : null}
                {submitLabel ?? (addMode === "addLines" ? "Add to job" : "Create Job")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
