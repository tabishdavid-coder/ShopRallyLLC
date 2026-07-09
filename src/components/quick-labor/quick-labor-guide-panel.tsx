"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Copy,
  Loader2,
  Receipt,
  Search,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AP_TERMS } from "@/lib/autopilot3030/terminology";
import { LABOR_CATEGORY_TREE, laborCategoryById, laborSubcategoryById } from "@/lib/labor-categories";
import {
  guideJobName,
  sourceBadgeClass,
  sourceBadgeLabel,
  suggestionToHit,
} from "@/lib/labor-guide-helpers";
import { enrichHitsWithPosition } from "@/lib/labor-guide-search";
import type { LaborGuideHit, LaborVariant } from "@/lib/labor-guide-types";
import { expandOperationVariants } from "@/lib/labor-guide-variants";
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
import type { QuickLaborVehicle } from "@/lib/quick-labor";
import { buildServiceTicketFromQuickLabor } from "@/lib/quick-labor-ro-prefill";
import {
  SHOP_LIBRARY_CHIPS,
  type ShopLibraryBrowsePath,
  type ShopLibraryChip,
} from "@/lib/shop-library-chip-paths";
import { cn } from "@/lib/utils";
import {
  browseQuickLabor,
  generateQuickLabor,
  searchQuickLabor,
} from "@/server/actions/quick-labor";

const QUICK_LABOR_CHIPS: ShopLibraryChip[] = [
  ...SHOP_LIBRARY_CHIPS,
  { label: "Oil change", query: "engine oil and filter" },
];

const COLUMN_HEADER =
  "flex h-7 shrink-0 items-center border-b border-[#1E3A56]/10 bg-[#1E3A56]/[0.04] px-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#1E3A56]/65";

function BrowseColumn({
  title,
  items,
  selectedId,
  onSelect,
}: {
  title: string;
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex h-full max-h-full w-[11rem] shrink-0 flex-col border-r border-[#1E3A56]/8 bg-card min-h-0 sm:w-[12rem]">
      <div className={COLUMN_HEADER}>{title}</div>
      <ul className="min-h-0 flex-1 overflow-y-auto py-0.5">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center justify-between gap-1 border-l-2 border-transparent px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-[#00A9FF]/10",
                selectedId === item.id
                  ? "border-l-[#00A9FF] bg-[#00A9FF]/15 font-semibold text-[#1E3A56]"
                  : "text-foreground/85",
              )}
            >
              <span className="truncate">{item.label}</span>
              <ChevronRight
                className={cn(
                  "size-3 shrink-0",
                  selectedId === item.id ? "text-[#00A9FF]" : "text-muted-foreground/50",
                )}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HitRow({
  hit,
  onSelect,
  compact = false,
}: {
  hit: LaborGuideHit;
  onSelect: (hit: LaborGuideHit) => void;
  compact?: boolean;
}) {
  const variants = expandOperationVariants(hit);
  const displayHours = variants[0]?.hours ?? hit.totalHours;

  return (
    <button
      type="button"
      onClick={() => onSelect(hit)}
      className={cn(
        "flex w-full items-center gap-2 border-b px-3 text-left transition-colors hover:bg-accent/50",
        compact ? "py-1.5" : "py-2",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{hit.jobName}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide",
              sourceBadgeClass(hit.source),
            )}
          >
            {sourceBadgeLabel(hit.source)}
          </span>
        </div>
        {!compact && hit.categoryPath ? (
          <p className="truncate text-[10px] font-medium text-[#1E3A56]/75">{hit.categoryPath}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-xs font-semibold tabular-nums text-[#1E3A56]">
          {displayHours.toFixed(2)} hrs
        </span>
        <ChevronRight className="size-3.5 text-muted-foreground" />
      </div>
    </button>
  );
}

function BrowsePathBar({ parts }: { parts: string[] }) {
  if (!parts.length) return null;
  return (
    <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
      {parts.map((part, i) => (
        <span key={`${part}-${i}`} className="flex shrink-0 items-center gap-0.5">
          {i > 0 ? <ChevronRight className="size-3 opacity-50" /> : null}
          <span className={cn(i === parts.length - 1 && "font-medium text-foreground")}>{part}</span>
        </span>
      ))}
    </div>
  );
}

function DetailPanel({
  hit,
  breadcrumbParts,
  vehicle,
  onBack,
}: {
  hit: LaborGuideHit;
  breadcrumbParts: string[];
  vehicle: QuickLaborVehicle;
  onBack: () => void;
}) {
  const router = useRouter();
  const variants = expandOperationVariants(hit);
  const [copied, setCopied] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  async function copyLine(label: string, hours: number) {
    const text = `${guideJobName(hit.jobName)} — ${label}: ${hours.toFixed(2)} hrs`;
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  function handleBuildServiceTicket() {
    setTicketError(null);
    const primaryVariant = variants[0];
    const concern = primaryVariant
      ? `${guideJobName(hit.jobName)} — ${primaryVariant.label}: ${primaryVariant.hours.toFixed(2)} hrs`
      : guideJobName(hit.jobName);
    const result = buildServiceTicketFromQuickLabor(vehicle, concern);
    if (!result.ok) {
      setTicketError(result.error);
      return;
    }
    router.push(result.href);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b bg-muted/30 px-3 py-1.5">
        <button
          type="button"
          onClick={onBack}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-accent hover:text-brand-navy"
          aria-label="Back to results"
        >
          <ArrowLeft className="size-3.5" />
        </button>
        <div className="min-w-0 flex-1">
          {breadcrumbParts.length ? (
            <nav className="flex items-center gap-0.5 overflow-x-auto text-[10px] text-subtle-foreground">
              {breadcrumbParts.map((part) => (
                <span key={part} className="flex shrink-0 items-center gap-0.5">
                  <ChevronRight className="size-2.5 opacity-50" />
                  <span>{part}</span>
                </span>
              ))}
            </nav>
          ) : null}
          <div className="flex min-w-0 items-baseline gap-2">
            <p className="truncate text-sm font-semibold text-brand-navy">{hit.jobName}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {variants.length} variant{variants.length === 1 ? "" : "s"}
            </span>
            {copied ? (
              <span className="shrink-0 text-[10px] text-emerald-700">Copied {copied}</span>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2.5 text-xs bg-brand-navy hover:bg-brand-navy/90"
          onClick={handleBuildServiceTicket}
        >
          <Receipt className="size-3" />
          {AP_TERMS.buildServiceTicket}
        </Button>
      </div>
      {ticketError ? (
        <p className="shrink-0 border-b bg-destructive/10 px-3 py-1 text-[11px] text-destructive">
          {ticketError}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-10 grid shrink-0 grid-cols-[1fr_auto_auto] gap-2 border-b bg-muted/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur-sm">
          <span>Labor operation</span>
          <span className="w-24 text-right sm:w-28">Scope</span>
          <span className="w-16 text-right sm:w-20">Hours</span>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {variants.map((v: LaborVariant) => (
            <li
              key={v.id}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b px-3 py-1.5"
            >
              <span className="truncate text-[13px] text-foreground">{hit.jobName}</span>
              <span className="w-24 truncate text-right text-[11px] font-medium text-foreground sm:w-28">
                {v.label}
              </span>
              <div className="flex w-16 items-center justify-end gap-0.5 sm:w-20">
                <span className="text-xs font-semibold tabular-nums">{v.hours.toFixed(2)}</span>
                <button
                  type="button"
                  onClick={() => copyLine(v.label, v.hours)}
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-brand-navy"
                  aria-label={`Copy ${v.label} hours`}
                  title="Copy hours"
                >
                  <Copy className="size-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function QuickLaborGuidePanel({
  vehicle,
  embedded = false,
  initialCategoryId,
  initialBrowsePath,
  initialSearchQuery,
  onPendingConsumed,
}: {
  vehicle: QuickLaborVehicle;
  embedded?: boolean;
  initialCategoryId?: string;
  initialBrowsePath?: ShopLibraryBrowsePath;
  initialSearchQuery?: string;
  onPendingConsumed?: () => void;
}) {
  const [request, setRequest] = useState("");
  const [hits, setHits] = useState<LaborGuideHit[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [selectedHit, setSelectedHit] = useState<LaborGuideHit | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [generating, startGen] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRequest("");
    setHits([]);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedHit(null);
    setError(null);
  }, [vehicle.vin, vehicle.year, vehicle.make, vehicle.model]);

  const runSearch = useCallback(
    (q: string) => {
      setSelectedHit(null);
      if (!q.trim()) {
        setHits([]);
        return;
      }
      startSearch(async () => {
        const res = await searchQuickLabor(vehicle, q);
        if (res.ok) setHits(res.hits);
        else setError(res.error);
      });
    },
    [vehicle],
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
        const res = await browseQuickLabor(vehicle, subcategoryId, positionId, operationId);
        if (res.ok) setHits(res.hits);
        else setError(res.error);
      });
    },
    [vehicle],
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

  function selectBrowsePosition(positionId: string) {
    if (!selectedSubcategory) return;
    const opFirst = subcategoryUsesOperationFirst(selectedSubcategory);
    setSelectedPosition(positionId);
    setSelectedHit(null);
    setHits([]);
    if (!opFirst) setSelectedOperation(null);

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
    if (opFirst) setSelectedPosition(null);

    const pos = selectedPosition;
    if (shouldLoadBrowseResults(selectedSubcategory, pos, operationId)) {
      loadBrowseResults(
        selectedSubcategory,
        pos ?? implicitBrowsePositionId(selectedSubcategory),
        operationId,
      );
    }
  }

  function generateAi(query?: string) {
    const q = (query ?? request).trim();
    if (!q) return;
    setError(null);
    setSelectedHit(null);
    startGen(async () => {
      const res = await generateQuickLabor(vehicle, q);
      if (res.ok) {
        const base = suggestionToHit(res.suggestion, q, res.cached, res.auditWarnings);
        const enriched = enrichHitsWithPosition([base], q);
        const hit = enriched[0] ?? base;
        setHits([hit]);
        setSelectedHit(hit);
      } else {
        setError(res.error);
      }
    });
  }

  const activeCategory = selectedCategory ? laborCategoryById(selectedCategory) : null;
  const browseOpFirst = selectedSubcategory
    ? subcategoryUsesOperationFirst(selectedSubcategory)
    : false;
  const browseReady =
    Boolean(selectedSubcategory) &&
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
  const libraryBrowsing = !request.trim() && !selectedHit && !generating;

  const browsePathParts = selectedSubcategory
    ? browseBreadcrumbParts(selectedSubcategory, selectedPosition, selectedOperation)
    : [];

  const detailBreadcrumbParts = browsePathParts.length
    ? browsePathParts
    : selectedHit?.categoryPath
      ? selectedHit.categoryPath.split(" › ")
      : [];

  useEffect(() => {
    if (initialBrowsePath) {
      applyBrowsePath(initialBrowsePath);
      onPendingConsumed?.();
      return;
    }
    if (initialCategoryId) {
      selectCategory(initialCategoryId);
      onPendingConsumed?.();
      return;
    }
    if (initialSearchQuery?.trim()) {
      setRequest(initialSearchQuery.trim());
      onPendingConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once on mount
  }, []);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden",
        !embedded && "min-h-[28rem] rounded-xl border border-border/80 bg-card shadow-sm",
      )}
    >
      <div
        className={cn(
          "shrink-0 border-b border-[#1E3A56]/10 px-3",
          embedded ? "py-1.5" : "bg-gradient-to-r from-[#1E3A56]/[0.06] to-transparent py-2",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <BookOpen className="size-3.5 shrink-0 text-[#00A9FF]" />
            <h2 className="text-xs font-semibold text-[#1E3A56] sm:text-sm">Labor reference</h2>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertCircle className="size-3 shrink-0 text-[#F4581C]" />
            Verify before quoting
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b bg-muted/20 px-3 py-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={request}
            onChange={(e) => {
              setRequest(e.target.value);
              setSelectedCategory(null);
              setSelectedSubcategory(null);
              setSelectedPosition(null);
              setSelectedOperation(null);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && request.trim()) {
                e.preventDefault();
                generateAi();
              }
            }}
            placeholder="Search jobs or describe a repair…"
            className="h-8 bg-card pl-8 pr-24 text-sm"
          />
          {request.trim() ? (
            <Button
              onClick={() => generateAi()}
              disabled={generating}
              size="sm"
              className="absolute right-0.5 top-1/2 h-7 -translate-y-1/2 gap-1 px-2 text-xs"
            >
              {generating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              Generate
            </Button>
          ) : searching ? (
            <Loader2 className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {QUICK_LABOR_CHIPS.map((chip) => {
            const active = chip.browsePath
              ? selectedSubcategory === chip.browsePath.subcategoryId &&
                (chip.browsePath.positionId ?? null) === selectedPosition &&
                (chip.browsePath.operationId ?? null) === selectedOperation &&
                !request.trim()
              : request.trim().toLowerCase() === chip.query.toLowerCase();
            return (
              <button
                key={chip.query}
                type="button"
                onClick={() => {
                  if (chip.browsePath) {
                    applyBrowsePath(chip.browsePath);
                    return;
                  }
                  setRequest(chip.query);
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                  setSelectedPosition(null);
                  setSelectedOperation(null);
                  setSelectedHit(null);
                  setHits([]);
                  setError(null);
                }}
                className={cn(
                  "rounded-full border px-2 py-px text-[10px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="mx-3 mt-1.5 shrink-0 rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {libraryBrowsing && selectedSubcategory && !selectedHit ? (
        <BrowsePathBar parts={browsePathParts} />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {selectedHit ? (
          <DetailPanel
            hit={selectedHit}
            breadcrumbParts={detailBreadcrumbParts}
            vehicle={vehicle}
            onBack={() => setSelectedHit(null)}
          />
        ) : null}

        {generating && !selectedHit ? (
          <div className="flex flex-1 items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Estimating labor…
          </div>
        ) : null}

        {libraryBrowsing && !selectedHit ? (
          <div className="flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
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
              />
            ) : (
              <div className="flex min-w-[11rem] flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground">
                Select a system
              </div>
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
                    />
                  ) : null}
                  {showPositionColumn ? (
                    <BrowseColumn
                      title="Position"
                      items={positionFacetsForSubcategory(selectedSubcategory)}
                      selectedId={selectedPosition}
                      onSelect={selectBrowsePosition}
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
                    />
                  ) : null}
                  {showOperationColumn ? (
                    <BrowseColumn
                      title="Operation"
                      items={operationFacetsForSubcategory(selectedSubcategory)}
                      selectedId={selectedOperation}
                      onSelect={selectBrowseOperation}
                    />
                  ) : null}
                </>
              )
            ) : null}
            {browseReady && !request.trim() ? (
              <div className="flex min-h-0 min-w-[14rem] flex-1 flex-col">
                <div className="flex h-7 shrink-0 items-center border-b bg-muted/25 px-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Jobs
                </div>
                {searching ? (
                  <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading…
                  </div>
                ) : hits.length > 0 ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {hits.map((hit) => (
                      <HitRow key={hit.id} hit={hit} onSelect={setSelectedHit} compact />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center text-xs text-muted-foreground">
                    <p>No cached jobs.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        if (!selectedSubcategory) return;
                        generateAi(
                          browseSyntheticQuery(
                            selectedSubcategory,
                            selectedPosition,
                            selectedOperation,
                          ),
                        );
                      }}
                    >
                      Generate with AI
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {!selectedHit && request.trim() && !generating ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            ) : hits.length > 0 ? (
              hits.map((hit) => <HitRow key={hit.id} hit={hit} onSelect={setSelectedHit} />)
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                <p>No matches for &ldquo;{request.trim()}&rdquo;.</p>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => generateAi()}
                >
                  <Sparkles className="size-3.5" />
                  Generate labor estimate
                </Button>
              </div>
            )}
          </div>
        ) : null}

        {!selectedHit && !request.trim() && !selectedSubcategory && !generating ? (
          embedded ? null : (
            <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-6 text-center text-sm text-muted-foreground">
              <BookOpen className="size-6 text-brand-light" />
              <p className="max-w-sm text-xs">
                Search for a job or browse by system to see labor hours.
              </p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
