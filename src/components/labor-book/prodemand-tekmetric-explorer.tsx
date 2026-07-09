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
  browseStepOrder,
  subcategoryIsAssemblyOnly,
  shouldLoadBrowseResults,
  shouldLoadOnSubcategorySelect,
} from "@/lib/labor-browse-hierarchy";
import {
  browseBreadcrumbParts,
  operationFacetsForSubcategory,
} from "@/lib/labor-nav-facets";
import {
  hitsToGridRows,
  LABOR_BOOK_POPULAR,
  mockRowsToGridRows,
  qualifierForSubcategory,
  qualifierVariantLabel,
  type LaborGridRow,
} from "@/lib/labor-book-v4-helpers";
import type { LaborCartLine } from "@/lib/labor-guide-types";
import { guideJobName } from "@/lib/labor-guide-helpers";
import { variantToCartLine } from "@/lib/labor-guide-variants";
import { mockJobsForContext } from "@/components/dev/labor-mockup/mock-data";
import {
  motorSelectionForChip,
  motorTreeSearchHighlight,
  type LaborBookMotorSidebarNode,
  type MotorSubGroupSelection,
} from "@/lib/labor-book-motor-adapter";
import {
  addLaborGuideJob,
  browseLaborGuideSubcategory,
  searchLaborGuide,
} from "@/server/actions/labor-guide";
import {
  getLaborBookMotorApplications,
  getLaborBookMotorInit,
  type LaborBookMotorSource,
} from "@/server/actions/labor-book-motor";

type CartLine = LaborCartLine & { key: number; gridRowId: string };

/** Mock rows default to one axle — merge front + rear when showing all positions. */
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

type ProdemandTekmetricLaborExplorerProps = {
  vehicleId: string;
  roId: string;
  vehicleLabel: string;
  specLine?: string;
  vinSnippet?: string;
  addMode?: "createJob" | "addLines";
  onAddLines?: (lines: Omit<LaborCartLine, "key">[]) => void;
  submitLabel?: string;
  onSwitchToClassic?: () => void;
  onClose?: () => void;
};

function CenterFacetPills({
  label,
  items,
  selectedId,
  onSelect,
}: {
  label: string;
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="mb-2">
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              selectedId === item.id ||
                (item.id === "all" && (selectedId == null || selectedId === "all"))
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-brand-navy/20 bg-background text-brand-navy hover:border-brand-orange/50",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProdemandTekmetricLaborExplorer({
  vehicleId,
  roId,
  vehicleLabel,
  specLine,
  vinSnippet,
  addMode = "createJob",
  onAddLines,
  submitLabel,
  onSwitchToClassic,
  onClose,
}: ProdemandTekmetricLaborExplorerProps) {
  const router = useRouter();
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(() => new Set());
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [browseOperationId, setBrowseOperationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [qualifierVariant, setQualifierVariant] = useState<"with-ac" | "without-ac">("with-ac");
  const [hits, setHits] = useState<LaborGridRow[]>([]);
  const [usingMockFallback, setUsingMockFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [creating, startCreate] = useTransition();
  const [motorInitLoading, setMotorInitLoading] = useState(true);
  const [motorSource, setMotorSource] = useState<LaborBookMotorSource>("shop");
  const [baseVehicleId, setBaseVehicleId] = useState<number | null>(null);
  const [motorTree, setMotorTree] = useState<LaborBookMotorSidebarNode[]>([]);
  const [selectedMotorSubGroup, setSelectedMotorSubGroup] =
    useState<MotorSubGroupSelection | null>(null);
  const keyRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMotorMode = motorSource === "motor" && motorTree.length > 0;
  const isSearchActive = searchQuery.trim().length > 0;
  const isAssembly =
    !isMotorMode &&
    selectedSubcategoryId != null &&
    subcategoryIsAssemblyOnly(selectedSubcategoryId);
  const breadcrumbParts = useMemo(() => {
    if (isSearchActive) return [];
    if (isMotorMode && selectedMotorSubGroup) return selectedMotorSubGroup.path;
    if (!selectedSubcategoryId) return [];
    return browseBreadcrumbParts(selectedSubcategoryId, null, browseOperationId);
  }, [
    isSearchActive,
    isMotorMode,
    selectedMotorSubGroup,
    selectedSubcategoryId,
    browseOperationId,
  ]);

  const breadcrumbSegments = useMemo(() => {
    const segments: { label: string; index: number }[] = [
      { label: vehicleLabel, index: -1 },
    ];
    breadcrumbParts.forEach((part, i) => {
      segments.push({ label: part, index: i });
    });
    return segments;
  }, [vehicleLabel, breadcrumbParts]);

  useEffect(() => {
    let cancelled = false;
    setMotorInitLoading(true);
    void getLaborBookMotorInit(vehicleId).then((res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setSyncBanner(null);
        setMotorSource("shop");
        setMotorTree([]);
        setBaseVehicleId(null);
      } else {
        setError(null);
        setMotorSource(res.source);
        setMotorTree(res.tree);
        setBaseVehicleId(res.baseVehicleId);
        setSyncBanner(res.syncBanner ?? null);
      }
      setMotorInitLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

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
            operationId: browseOperationId,
          });
      if (isAssembly) {
        mockRows = mockRows.filter((r) => r.variant === qualifierVariant);
      }
      const rows = mockRowsToGridRows(mockRows, ctx.subcategoryId);
      setHits(rows);
      setUsingMockFallback(rows.length > 0);
    },
    [isAssembly, browseOperationId, qualifierVariant],
  );

  const loadMotorApplications = useCallback(
    (selection: MotorSubGroupSelection) => {
      if (baseVehicleId == null) return;
      setError(null);
      setUsingMockFallback(false);
      startSearch(async () => {
        const res = await getLaborBookMotorApplications(
          vehicleId,
          baseVehicleId,
          selection.motorSubGroupId,
        );
        if (!res.ok) {
          setError(res.error);
          setHits([]);
          return;
        }
        setHits(res.rows);
        setUsingMockFallback(false);
      });
    },
    [vehicleId, baseVehicleId],
  );

  const loadBrowse = useCallback(
    (subcategoryId: string, categoryId: string) => {
      setError(null);
      setUsingMockFallback(false);
      const operationId = isAssembly ? null : browseOperationId;

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
    [vehicleId, browseOperationId, isAssembly, applyMockFallback],
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
    if (isSearchActive || isMotorMode) return;
    if (!selectedSubcategoryId || !selectedCategoryId) return;
    loadBrowse(selectedSubcategoryId, selectedCategoryId);
  }, [
    isSearchActive,
    isMotorMode,
    selectedSubcategoryId,
    selectedCategoryId,
    browseOperationId,
    qualifierVariant,
    loadBrowse,
  ]);

  useEffect(() => {
    if (isSearchActive || !isMotorMode || !selectedMotorSubGroup) return;
    loadMotorApplications(selectedMotorSubGroup);
  }, [isSearchActive, isMotorMode, selectedMotorSubGroup, loadMotorApplications]);

  const treeHighlight = useMemo(() => {
    if (!isSearchActive) return null;
    if (isMotorMode) return motorTreeSearchHighlight(motorTree, searchQuery);
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
  }, [isSearchActive, isMotorMode, motorTree, searchQuery]);

  const gridRows = hits;
  const hasBrowseSelection = isMotorMode
    ? selectedMotorSubGroup != null
    : selectedSubcategoryId != null;
  const selectedRow = gridRows.find((r) => r.id === selectedRowId) ?? gridRows[0] ?? null;

  const toggleSystem = (categoryId: string) => {
    setExpandedSystems((prev) => {
      if (prev.has(categoryId)) return new Set();
      return new Set([categoryId]);
    });
  };

  const selectSubcategory = (categoryId: string, subcategoryId: string) => {
    setSelectedMotorSubGroup(null);
    setExpandedSystems(new Set([categoryId]));
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
    setSearchQuery("");
    setSelectedRowId(null);
    setHits([]);
    setUsingMockFallback(false);
    if (subcategoryIsAssemblyOnly(subcategoryId)) {
      setBrowseOperationId(null);
    } else {
      const ops = operationFacetsForSubcategory(subcategoryId);
      setBrowseOperationId(ops[0]?.id ?? null);
    }
    if (shouldLoadOnSubcategorySelect(subcategoryId)) {
      loadBrowse(subcategoryId, categoryId);
    }
  };

  const selectMotorSubGroup = (selection: MotorSubGroupSelection) => {
    setSelectedCategoryId(null);
    setSelectedSubcategoryId(null);
    setBrowseOperationId(null);
    setSelectedMotorSubGroup(selection);
    setExpandedSystems(new Set([`motor-s-${selection.motorSystemId}`]));
    setSearchQuery("");
    setSelectedRowId(null);
    setHits([]);
    setUsingMockFallback(false);
  };

  const truncateBreadcrumb = (segmentIndex: number) => {
    if (segmentIndex < 0) {
      setSelectedCategoryId(null);
      setSelectedSubcategoryId(null);
      setSelectedMotorSubGroup(null);
      setBrowseOperationId(null);
      setHits([]);
      setSelectedRowId(null);
      setSearchQuery("");
      return;
    }

    if (isMotorMode && selectedMotorSubGroup) {
      if (segmentIndex >= 2) return;
      setSelectedMotorSubGroup(null);
      setHits([]);
      setSelectedRowId(null);
      if (segmentIndex === 0) {
        setExpandedSystems(new Set([`motor-s-${selectedMotorSubGroup.motorSystemId}`]));
      }
      return;
    }

    const parts = breadcrumbParts;
    const cat = LABOR_CATEGORY_TREE.find((c) => c.label === parts[0]);
    const sub = cat?.subcategories.find((s) => s.label === parts[1]);
    if (!cat) return;

    if (segmentIndex === 0) {
      setSelectedCategoryId(cat.id);
      setSelectedSubcategoryId(null);
      setBrowseOperationId(null);
      setHits([]);
      setSelectedRowId(null);
      setExpandedSystems(new Set([cat.id]));
      return;
    }

    if (!sub) return;

    if (segmentIndex === 1) {
      setSelectedCategoryId(cat.id);
      setSelectedSubcategoryId(sub.id);
      setBrowseOperationId(null);
      setHits([]);
      setSelectedRowId(null);
      setExpandedSystems(new Set([cat.id]));
      return;
    }

    let operationId: string | null = browseOperationId;
    const order = browseStepOrder(sub.id);
    const facetParts = parts.slice(2);

    if (order[0] === "operation" && facetParts[0]) {
      const op = operationFacetsForSubcategory(sub.id).find((o) => o.label === facetParts[0]);
      if (segmentIndex === 2) operationId = op?.id ?? null;
      if (segmentIndex < 2) operationId = null;
    } else if (order[0] === "position" && facetParts[0]) {
      const op = operationFacetsForSubcategory(sub.id).find((o) => o.label === facetParts[1]);
      if (segmentIndex === 3) operationId = op?.id ?? null;
      if (segmentIndex < 3) operationId = null;
    }

    setSelectedCategoryId(cat.id);
    setSelectedSubcategoryId(sub.id);
    setBrowseOperationId(operationId);
    setSelectedRowId(null);
    setExpandedSystems(new Set([cat.id]));
  };

  const operationPills = useMemo(() => {
    if (isMotorMode || !selectedSubcategoryId || isAssembly || isSearchActive) return [];
    return operationFacetsForSubcategory(selectedSubcategoryId);
  }, [isMotorMode, selectedSubcategoryId, isAssembly, isSearchActive]);

  const sourceLabel = isMotorMode
    ? "Source: MOTOR catalog"
    : usingMockFallback
      ? "Source: Shop library · demo rows"
      : "Source: Shop library · live cache";

  const addToCart = (row: LaborGridRow) => {
    const line = variantToCartLine(row.variant, row.hit, row.hit.source);
    setCartItems((prev) => {
      if (prev.some((item) => item.gridRowId === row.id)) return prev;
      return [...prev, { ...line, key: keyRef.current++, gridRowId: row.id }];
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

  const qualifier = !isMotorMode ? qualifierForSubcategory(selectedSubcategoryId) : null;
  const headerSpecs = [specLine, vinSnippet ? `VIN ${vinSnippet}` : null].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {/* Vehicle + search header */}
      <div className="shrink-0 border-b border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-brand-navy">{vehicleLabel}</h2>
            {headerSpecs ? (
              <p className="truncate text-[11px] text-muted-foreground">{headerSpecs}</p>
            ) : null}
            <p className="text-[10px] text-muted-foreground">
              ProDemand + Tekmetric · {sourceLabel}
              {baseVehicleId && isMotorMode ? ` · BaseVehicleID ${baseVehicleId}` : ""}
            </p>
          </div>
          {onSwitchToClassic ? (
            <button
              type="button"
              onClick={onSwitchToClassic}
              className="shrink-0 rounded-md border border-brand-navy/15 px-2 py-1 text-[10px] font-medium text-brand-navy hover:bg-brand-navy/5"
            >
              Classic view
            </button>
          ) : null}
        </div>

        {qualifier && !isSearchActive ? (
          <div className="mb-2 rounded-md border border-brand-navy/10 bg-brand-navy/[0.04] px-2.5 py-1.5 text-[11px] text-brand-navy">
            <span className="font-semibold">Config:</span> {qualifier}
          </div>
        ) : null}

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search labor guide for this vehicle…"
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

        <div className="mt-2 flex flex-wrap gap-1.5">
          {LABOR_BOOK_POPULAR.map((pick) => (
            <button
              key={pick.query}
              type="button"
              onClick={() => {
                if (isMotorMode) {
                  const motorPick = motorSelectionForChip(motorTree, pick);
                  if (motorPick) {
                    selectMotorSubGroup(motorPick);
                    return;
                  }
                }
                if (pick.browsePath) {
                  selectSubcategory(pick.browsePath.categoryId, pick.browsePath.subcategoryId);
                } else {
                  setSearchQuery(pick.query);
                }
              }}
              className="rounded-full border border-brand-navy/15 px-2.5 py-0.5 text-xs text-brand-navy hover:border-brand-orange/50 hover:bg-brand-orange/5"
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clickable breadcrumb bar */}
      {!isSearchActive && breadcrumbSegments.length > 1 ? (
        <nav
          aria-label="Browse path"
          className="flex shrink-0 flex-wrap items-center gap-1 border-b border-brand-navy/10 bg-background px-4 py-2 text-xs"
        >
          {breadcrumbSegments.map((seg, i) => (
            <Fragment key={`${seg.label}-${i}`}>
              {i > 0 ? (
                <ChevronRight className="size-3 shrink-0 text-brand-navy/30" aria-hidden />
              ) : null}
              <button
                type="button"
                onClick={() => truncateBreadcrumb(seg.index)}
                className={cn(
                  "truncate rounded px-1 py-0.5 transition-colors hover:bg-brand-navy/5 hover:underline",
                  i === breadcrumbSegments.length - 1
                    ? "font-semibold text-brand-navy"
                    : "text-muted-foreground hover:text-brand-navy",
                )}
                title={seg.label}
              >
                {seg.label}
              </button>
            </Fragment>
          ))}
        </nav>
      ) : isSearchActive ? (
        <p className="shrink-0 border-b border-brand-navy/10 px-4 py-2 text-xs text-muted-foreground">
          Search results · {gridRows.length} match{gridRows.length === 1 ? "" : "es"}
        </p>
      ) : null}

      {error ? (
        <p className="mx-4 mt-2 shrink-0 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {syncBanner ? (
        <p className="mx-4 mt-2 shrink-0 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          {syncBanner}
        </p>
      ) : null}

      {/* 3-pane body */}
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[180px] shrink-0 overflow-y-auto border-r border-brand-navy/10 bg-brand-navy/[0.02] p-2 sm:block md:w-[200px]">
          <p className="mb-2 flex items-center gap-1 px-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
            <LayoutGrid className="size-3" /> Systems
          </p>
          {motorInitLoading ? (
            <p className="px-1 text-[11px] text-muted-foreground">Loading catalog…</p>
          ) : isMotorMode ? (
            motorTree.map((system) => {
              const systemKey = `motor-s-${system.motorSystemId}`;
              const expanded = expandedSystems.has(systemKey);
              const catHighlighted = treeHighlight?.has(system.id);
              return (
                <div key={system.id} className="mb-0.5">
                  <button
                    type="button"
                    onClick={() => toggleSystem(systemKey)}
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
                    {system.name}
                  </button>
                  {expanded ? (
                    <ul className="ml-3 border-l border-brand-navy/10 pl-1">
                      {system.children.map((group) => (
                        <li key={group.id} className="mt-1">
                          <p
                            className={cn(
                              "px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                              treeHighlight?.has(group.id)
                                ? "text-brand-orange"
                                : "text-brand-navy/55",
                            )}
                          >
                            {group.name}
                          </p>
                          <ul>
                            {group.children.map((sub) => {
                              const selected =
                                selectedMotorSubGroup?.nodeKey === sub.nodeKey && !isSearchActive;
                              const subHighlighted = treeHighlight?.has(sub.id);
                              return (
                                <li key={sub.id}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      selectMotorSubGroup({
                                        nodeKey: sub.nodeKey,
                                        motorSystemId: sub.motorSystemId,
                                        motorGroupId: group.motorGroupId!,
                                        motorSubGroupId: sub.motorSubGroupId!,
                                        path: [system.name, group.name, sub.name],
                                      })
                                    }
                                    className={cn(
                                      "w-full rounded px-2 py-1 text-left text-[11px] transition-colors",
                                      selected
                                        ? "bg-brand-orange font-medium text-white"
                                        : subHighlighted
                                          ? "bg-brand-orange/10 font-medium text-brand-navy"
                                          : "text-muted-foreground hover:bg-brand-navy/5 hover:text-brand-navy",
                                    )}
                                  >
                                    {sub.name}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          ) : (
            LABOR_CATEGORY_TREE.map((cat) => {
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
            })
          )}
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden lg:max-w-[calc(100%-220px)]">
          <div className="flex min-h-0 flex-1 flex-col p-3 lg:flex-row lg:gap-0">
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              {searching || motorInitLoading ? (
                <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Loading operations…
                </div>
              ) : !hasBrowseSelection && !isSearchActive ? (
                <div className="flex flex-1 flex-col justify-center text-center">
                  <p className="text-sm text-muted-foreground">
                    Pick a component in the tree — or search / use a quick chip above.
                  </p>
                </div>
              ) : (
                <>
                  {!isSearchActive && isAssembly ? (
                    <div className="mb-2 rounded-md border border-brand-navy/10 bg-brand-navy/[0.03] px-2.5 py-2">
                      <p className="mb-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
                        Variant
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

                  {!isSearchActive && operationPills.length > 0 ? (
                    <CenterFacetPills
                      label="Operation"
                      items={operationPills.map((o) => ({ id: o.id, label: o.label }))}
                      selectedId={browseOperationId}
                      onSelect={setBrowseOperationId}
                    />
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
                          const inCart = cartItems.some((c) => c.gridRowId === row.id);
                          const isSelected = selectedRowId === row.id;
                          return (
                            <tr
                              key={row.id}
                              className={cn(
                                "cursor-pointer border-t border-brand-navy/5 transition-colors",
                                isSelected ? "bg-brand-orange/[0.08]" : "hover:bg-brand-navy/[0.03]",
                                inCart && "bg-emerald-50/60",
                              )}
                              onClick={() => setSelectedRowId(row.id)}
                            >
                              <td className="px-3 py-2 font-medium text-brand-navy">{row.name}</td>
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(row);
                                  }}
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
            </div>

            {/* Right detail pane — lg+ */}
            <aside className="hidden w-[220px] shrink-0 overflow-y-auto border-l border-brand-navy/10 bg-brand-navy/[0.02] p-3 lg:flex lg:flex-col">
              <p className="mb-2 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
                Detail
              </p>
              {selectedRow ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm leading-snug font-semibold text-brand-navy">
                      {selectedRow.name}
                      {selectedRow.position ? ` — ${selectedRow.position}` : ""}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedRow.hours.toFixed(2)} hr · {selectedRow.sourceLabel}
                      {selectedRow.isMock ? " · demo" : ""}
                    </p>
                    {selectedRow.includes ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-brand-navy/80">Includes:</span>{" "}
                        {selectedRow.includes}
                      </p>
                    ) : null}
                    {selectedRow.hit.laborOperations.length > 0 ? (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
                          Related labor
                        </p>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {selectedRow.hit.laborOperations.slice(0, 5).map((op) => (
                            <li key={op}>· {op}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-brand-orange text-white hover:bg-brand-orange/90"
                    onClick={() => addToCart(selectedRow)}
                    disabled={cartItems.some((c) => c.gridRowId === selectedRow.id)}
                  >
                    <Plus className="size-3.5" />
                    Add to job
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select a row to preview hours and includes.</p>
              )}
            </aside>
          </div>
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
                    className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-brand-navy/15 bg-card px-2 py-0.5 text-[11px] text-brand-navy"
                  >
                    <span className="truncate">
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
