"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LABOR_CATEGORY_TREE } from "@/lib/labor-categories";
import {
  subcategoryIsAssemblyOnly,
  shouldLoadBrowseResults,
  shouldLoadOnSubcategorySelect,
} from "@/lib/labor-browse-hierarchy";
import { operationFacetsForSubcategory } from "@/lib/labor-nav-facets";
import type { LaborCartLine } from "@/lib/labor-guide-types";
import { guideJobName } from "@/lib/labor-guide-helpers";
import { variantToCartLine } from "@/lib/labor-guide-variants";
import {
  hitsToGridRows,
  LABOR_BOOK_POPULAR,
  mockRowsToGridRows,
  qualifierForSubcategory,
  qualifierVariantLabel,
  scopeLabelForSelection,
  type LaborGridRow,
} from "@/lib/labor-book-v4-helpers";
import { mockJobsForContext } from "@/components/dev/labor-mockup/mock-data";
import {
  addLaborGuideJob,
  browseLaborGuideSubcategory,
  searchLaborGuide,
} from "@/server/actions/labor-guide";

type CartLine = LaborCartLine & { key: number; gridRowId: string };

function mockJobsAllPositions(ctx: {
  categoryId?: string | null;
  subcategoryId?: string | null;
  operationId?: string | null;
  searchQuery?: string;
}) {
  const front = mockJobsForContext({ ...ctx, positionId: "front" });
  const rear = mockJobsForContext({ ...ctx, positionId: "rear" });
  const seen = new Set<string>();
  return [...front, ...rear].filter((r) => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

type TreeGridLaborExplorerProps = {
  vehicleId: string;
  roId: string;
  vehicleLabel: string;
  specLine?: string;
  addMode?: "createJob" | "addLines";
  onAddLines?: (lines: Omit<LaborCartLine, "key">[]) => void;
  submitLabel?: string;
  onSwitchToClassic?: () => void;
  onClose?: () => void;
};

function defaultOperationId(subcategoryId: string): string | null {
  const ops = operationFacetsForSubcategory(subcategoryId);
  return ops[0]?.id ?? null;
}

export function TreeGridLaborExplorer({
  vehicleId,
  roId,
  vehicleLabel,
  specLine,
  addMode = "createJob",
  onAddLines,
  submitLabel,
  onSwitchToClassic,
  onClose,
}: TreeGridLaborExplorerProps) {
  const router = useRouter();
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(() => new Set());
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [qualifierVariant, setQualifierVariant] = useState<"with-ac" | "without-ac">("with-ac");
  const [hits, setHits] = useState<LaborGridRow[]>([]);
  const [usingMockFallback, setUsingMockFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [creating, startCreate] = useTransition();
  const keyRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSearchActive = searchQuery.trim().length > 0;
  const isAssembly =
    selectedSubcategoryId != null && subcategoryIsAssemblyOnly(selectedSubcategoryId);

  const scopeLabel = useMemo(
    () => scopeLabelForSelection(selectedCategoryId, selectedSubcategoryId, isSearchActive),
    [isSearchActive, selectedCategoryId, selectedSubcategoryId],
  );

  const applyMockFallback = useCallback(
    (ctx: {
      categoryId?: string | null;
      subcategoryId?: string | null;
      positionId?: string | null;
      searchQuery?: string;
    }) => {
      let mockRows = ctx.searchQuery
        ? mockJobsForContext({
            categoryId: ctx.categoryId ?? undefined,
            subcategoryId: ctx.subcategoryId ?? undefined,
            searchQuery: ctx.searchQuery,
          })
        : mockJobsAllPositions({
            categoryId: ctx.categoryId ?? undefined,
            subcategoryId: ctx.subcategoryId ?? undefined,
          });
      if (isAssembly) {
        mockRows = mockRows.filter((r) => r.variant === qualifierVariant);
      }
      const rows = mockRowsToGridRows(mockRows, ctx.subcategoryId);
      setHits(rows);
      setUsingMockFallback(rows.length > 0);
    },
    [isAssembly, qualifierVariant],
  );

  const loadBrowse = useCallback(
    (subcategoryId: string, categoryId: string) => {
      setError(null);
      setUsingMockFallback(false);
      const operationId = isAssembly ? null : defaultOperationId(subcategoryId);

      if (!shouldLoadBrowseResults(subcategoryId, "all", operationId)) {
        setHits([]);
        return;
      }

      startSearch(async () => {
        const res = await browseLaborGuideSubcategory(
          vehicleId,
          subcategoryId,
          null,
          operationId,
        );
        if (!res.ok) {
          setError(res.error);
          setHits([]);
          return;
        }
        const rows = hitsToGridRows(res.hits, "all");
        if (rows.length === 0) {
          applyMockFallback({ categoryId, subcategoryId });
        } else {
          setHits(rows);
          setUsingMockFallback(false);
        }
      });
    },
    [vehicleId, isAssembly, applyMockFallback],
  );

  const runSearch = useCallback(
    (q: string) => {
      setError(null);
      setUsingMockFallback(false);
      if (!q.trim()) {
        setHits([]);
        return;
      }
      startSearch(async () => {
        const res = await searchLaborGuide(vehicleId, q);
        if (!res.ok) {
          setError(res.error);
          setHits([]);
          return;
        }
        const rows = hitsToGridRows(res.hits, "all");
        if (rows.length === 0) {
          applyMockFallback({ searchQuery: q });
        } else {
          setHits(rows);
          setUsingMockFallback(false);
        }
      });
    },
    [vehicleId, applyMockFallback],
  );

  useEffect(() => {
    if (!isSearchActive) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, isSearchActive, runSearch]);

  useEffect(() => {
    if (isSearchActive || !selectedSubcategoryId || !selectedCategoryId) return;
    loadBrowse(selectedSubcategoryId, selectedCategoryId);
  }, [
    isSearchActive,
    selectedSubcategoryId,
    selectedCategoryId,
    qualifierVariant,
    loadBrowse,
  ]);

  const treeHighlight = useMemo(() => {
    if (!isSearchActive) return null;
    const q = searchQuery.toLowerCase();
    const matchIds = new Set<string>();
    for (const cat of LABOR_CATEGORY_TREE) {
      for (const sub of cat.subcategories) {
        if (
          sub.label.toLowerCase().includes(q) ||
          sub.keywords.some((kw) => q.includes(kw.toLowerCase()))
        ) {
          matchIds.add(sub.id);
          matchIds.add(cat.id);
        }
      }
    }
    return matchIds;
  }, [isSearchActive, searchQuery]);

  const gridRows = hits;

  const toggleSystem = (categoryId: string) => {
    setExpandedSystems((prev) => {
      if (prev.has(categoryId)) return new Set();
      return new Set([categoryId]);
    });
  };

  const selectSubcategory = (categoryId: string, subcategoryId: string) => {
    setExpandedSystems(new Set([categoryId]));
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
    setSearchQuery("");
    setExpandedRowId(null);
    setHits([]);
    setUsingMockFallback(false);
    if (shouldLoadOnSubcategorySelect(subcategoryId)) {
      loadBrowse(subcategoryId, categoryId);
    }
  };

  const addToCart = (row: LaborGridRow) => {
    const line = variantToCartLine(row.variant, row.hit, row.hit.source);
    setCartItems((prev) => {
      if (prev.some((item) => item.gridRowId === row.id)) return prev;
      return [
        ...prev,
        { ...line, key: keyRef.current++, gridRowId: row.id },
      ];
    });
  };

  const removeFromCart = (key: number) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  };

  const cartHours = cartItems.reduce((sum, item) => sum + item.hours, 0);

  const confirmCart = useCallback(() => {
    if (!cartItems.length) return;
    const payload = cartItems.map(({ description, hours, source, variantLabel }) => ({
      description,
      hours,
      source,
      variantLabel,
    }));

    if (addMode === "addLines" && onAddLines) {
      onAddLines(payload);
      setCartItems([]);
      onClose?.();
      return;
    }

    const jobName =
      guideJobName(cartItems[0]?.description ?? "Labor") ||
      cartItems[0]?.description ||
      "Labor";

    startCreate(async () => {
      const res = await addLaborGuideJob(roId, jobName, payload);
      if (res.ok) {
        setCartItems([]);
        onClose?.();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }, [cartItems, addMode, onAddLines, onClose, roId, router]);

  const qualifier = qualifierForSubcategory(selectedSubcategoryId);

  const headerLine = [vehicleLabel, specLine].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-brand-navy">
              Smart Labor Book — {headerLine}
            </h2>
            <p className="text-[10px] text-muted-foreground">
              Tree-Grid Explorer
              {usingMockFallback ? " · demo rows (cache empty)" : " · live cache"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {onSwitchToClassic ? (
              <button
                type="button"
                onClick={onSwitchToClassic}
                className="rounded-md border border-brand-navy/15 px-2 py-1 text-[10px] font-medium text-brand-navy hover:bg-brand-navy/5"
              >
                Classic view
              </button>
            ) : null}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter tree & operations…"
            className="h-8 border-brand-navy/15 bg-background pl-8 text-sm"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-brand-navy"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Scope: <span className="font-medium text-brand-navy">{scopeLabel}</span>
          {isSearchActive ? ` · ${gridRows.length} matches · tree filtered` : null}
        </p>
      </div>

      {error ? (
        <p className="mx-4 mt-2 shrink-0 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {/* Tree + grid */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[180px] shrink-0 overflow-y-auto border-r border-brand-navy/10 bg-brand-navy/[0.02] p-2 sm:block md:w-[200px]">
          <p className="mb-2 flex items-center gap-1 px-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
            <LayoutGrid className="size-3" /> Motor tree
          </p>
          {LABOR_CATEGORY_TREE.map((cat) => {
            const expanded = expandedSystems.has(cat.id);
            const catHighlighted = treeHighlight?.has(cat.id);
            return (
              <div key={cat.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleSystem(cat.id)}
                  className={cn(
                    "flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs font-medium transition-colors",
                    catHighlighted
                      ? "bg-brand-orange/15 text-brand-navy"
                      : "text-brand-navy hover:bg-brand-navy/5",
                  )}
                >
                  {expanded ? (
                    <ChevronDown className="size-3 shrink-0" />
                  ) : (
                    <ChevronRight className="size-3 shrink-0" />
                  )}
                  {cat.label}
                </button>
                {expanded ? (
                  <ul className="ml-4 border-l border-brand-navy/10 pl-1">
                    {cat.subcategories.map((sub) => {
                      const selected = selectedSubcategoryId === sub.id && !isSearchActive;
                      const subHighlighted = treeHighlight?.has(sub.id);
                      return (
                        <li key={sub.id}>
                          <button
                            type="button"
                            onClick={() => selectSubcategory(cat.id, sub.id)}
                            className={cn(
                              "w-full rounded px-2 py-1 text-left text-[11px] transition-colors",
                              selected
                                ? "bg-brand-orange font-medium text-white"
                                : subHighlighted
                                  ? "bg-brand-orange/10 font-medium text-brand-navy"
                                  : "text-muted-foreground hover:bg-brand-navy/5 hover:text-brand-navy",
                            )}
                          >
                            {sub.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          {searching ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading operations…
            </div>
          ) : !selectedSubcategoryId && !isSearchActive ? (
            <div className="flex flex-1 flex-col justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Pick a component in the tree — or search to filter across all systems.
              </p>
              <p className="mt-3 text-xs text-brand-navy/70">Popular for this vehicle:</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {LABOR_BOOK_POPULAR.map((pick) => (
                  <button
                    key={pick.query}
                    type="button"
                    onClick={() => {
                      if (pick.browsePath) {
                        selectSubcategory(
                          pick.browsePath.categoryId,
                          pick.browsePath.subcategoryId,
                        );
                      } else {
                        setSearchQuery(pick.query);
                      }
                    }}
                    className="rounded-full border border-brand-navy/15 px-2.5 py-0.5 text-xs text-brand-navy hover:border-brand-orange/50"
                  >
                    {pick.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {!isSearchActive && isAssembly ? (
                <div className="mb-2 rounded-md border border-brand-navy/10 bg-brand-navy/[0.03] px-2.5 py-2">
                  <p className="mb-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
                    Config: {qualifier ?? "VIN-derived"}
                  </p>
                  <div className="flex flex-col gap-1">
                    {(["with-ac", "without-ac"] as const).map((v) => (
                      <label
                        key={v}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs",
                          qualifierVariant === v
                            ? "bg-brand-orange/10 font-medium text-brand-navy"
                            : "text-muted-foreground",
                        )}
                      >
                        <input
                          type="radio"
                          checked={qualifierVariant === v}
                          onChange={() => setQualifierVariant(v)}
                          className="accent-brand-orange"
                        />
                        {qualifierVariantLabel(v)}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {!isSearchActive && qualifier && !isAssembly ? (
                <p className="mb-2 text-[10px] text-muted-foreground">
                  Config: <span className="font-medium text-brand-navy">{qualifier}</span>
                </p>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-brand-navy/10">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-brand-navy/[0.04] text-[10px] font-semibold tracking-wide text-brand-navy/70 uppercase">
                    <tr>
                      <th className="px-3 py-2 text-left">Operation</th>
                      {isSearchActive ? (
                        <th className="px-2 py-2 text-left">System</th>
                      ) : null}
                      <th className="px-2 py-2 text-left">Pos</th>
                      <th className="px-2 py-2 text-right">Hrs</th>
                      <th className="px-2 py-2 text-center">+</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gridRows.map((row) => {
                      const expanded = expandedRowId === row.id;
                      const inCart = cartItems.some((c) => c.gridRowId === row.id);
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={cn(
                              "border-t border-brand-navy/5 transition-colors",
                              expanded ? "bg-brand-orange/[0.06]" : "hover:bg-brand-navy/[0.03]",
                              inCart && "bg-emerald-50/60",
                            )}
                          >
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(expanded ? null : row.id)}
                                className="text-left font-medium text-brand-navy hover:underline"
                              >
                                {expanded ? "▾ " : "▸ "}
                                {row.name}
                              </button>
                            </td>
                            {isSearchActive ? (
                              <td className="px-2 py-2 text-muted-foreground">
                                {row.system ?? "—"}
                              </td>
                            ) : null}
                            <td className="px-2 py-2 capitalize text-muted-foreground">
                              {row.position ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">
                              {row.hours.toFixed(2)}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => addToCart(row)}
                                disabled={inCart}
                                className={cn(
                                  "inline-flex size-6 items-center justify-center rounded border text-brand-navy transition-colors",
                                  inCart
                                    ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                    : "border-brand-navy/15 hover:border-brand-orange hover:bg-brand-orange/10",
                                )}
                                aria-label="Add to staging"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr className="bg-brand-navy/[0.02]">
                              <td
                                colSpan={isSearchActive ? 5 : 4}
                                className="px-3 py-2 text-[11px] text-muted-foreground"
                              >
                                {row.sourceLabel} {row.hours.toFixed(2)}h
                                {row.isMock ? " · demo row" : " · ymm cache"}
                                {row.includes ? ` · Includes: ${row.includes}` : null}
                                {row.hit.derivedFrom ? (
                                  <span> · Derived from {row.hit.derivedFrom}</span>
                                ) : null}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {gridRows.length === 0 && !searching ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">
                    No operations match. Try another filter or search.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Bottom staging dock */}
      <div className="shrink-0 border-t border-brand-navy/15 bg-brand-navy/[0.04] px-4 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
              Staging ({cartItems.length}) · {cartHours.toFixed(2)} hr
            </p>
            {cartItems.length > 0 ? (
              <ul className="mt-1 flex flex-wrap gap-1">
                {cartItems.map((item) => (
                  <li
                    key={item.key}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-navy/15 bg-card px-2 py-0.5 text-[11px] text-brand-navy"
                  >
                    <span className="truncate max-w-[12rem]">
                      {item.description}
                      {item.variantLabel ? ` (${item.variantLabel})` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.key)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${item.description}`}
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Row + adds to staging dock</p>
            )}
          </div>
          <Button
            size="sm"
            className="shrink-0 bg-brand-navy hover:bg-brand-navy/90"
            disabled={cartItems.length === 0 || creating}
            onClick={confirmCart}
          >
            {creating ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            {submitLabel ?? (addMode === "addLines" ? "Add to job" : "Add to estimate →")}
          </Button>
        </div>
      </div>
    </div>
  );
}
