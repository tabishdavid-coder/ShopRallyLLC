"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  FlaskConical,
  MousePointerClick,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
} from "lucide-react";

import {
  TestChecklistPanel,
  useChecklistHydration,
  useChecklistPersistence,
} from "@/components/dev/labor-mockup/test-checklist-panel";
import type { ChecklistItemId } from "@/components/dev/labor-mockup/test-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LABOR_CATEGORY_TREE } from "@/lib/labor-categories";
import { LABOR_PATH_ASSEMBLY_HEATER_CORE } from "@/lib/labor-browse-paths";
import {
  browseStepOrder,
  isBrowsePathComplete,
  nextBrowseStep,
  subcategoryIsAssemblyOnly,
} from "@/lib/labor-browse-hierarchy";
import {
  browseBreadcrumbParts,
  operationFacetsForSubcategory,
  positionFacetsForSubcategory,
} from "@/lib/labor-nav-facets";
import { SHOP_LIBRARY_CHIPS } from "@/lib/shop-library-chip-paths";
import { LaborMockupV4Panel } from "@/components/dev/labor-mockup/labor-mockup-v4-panel";
import { LaborMockupV5Panel } from "@/components/dev/labor-mockup/labor-mockup-v5-panel";
import {
  DEFAULT_VEHICLE,
  HEATER_CORE_VEHICLE,
  mockJobsForContext,
  qualifierForSubcategory,
  qualifierVariantLabel,
  QUICK_CHIPS,
  RECENT_JOBS,
  type MockJobRow,
  type MockVehicle,
} from "@/components/dev/labor-mockup/mock-data";

type UiMode = "mock-v3" | "option-a" | "mock-v4" | "mock-v5";
type NavMode = "default" | "search" | "browse";
type PathTab = "path-1" | "path-2" | "path-3" | "free";
type QualifierVariant = "with-ac" | "without-ac";

type BrowseState = {
  categoryId: string | null;
  subcategoryId: string | null;
  positionId: string | null;
  operationId: string | null;
};

const INITIAL_BROWSE: BrowseState = {
  categoryId: null,
  subcategoryId: null,
  positionId: null,
  operationId: null,
};

const PATH_1_HINT = "Chip Front brakes → Front → Replace → Add (axle-first)";
const PATH_2_HINT = "Chip Struts → Replace → Front → Add (operation-first)";
const PATH_3_HINT = "Browse HVAC → Heating → Heater Core → AC variant pick";

function vehicleHeader(v: MockVehicle) {
  const vin = v.vin ? ` · VIN …${v.vin.slice(-5)}` : "";
  return `${v.year} ${v.make} ${v.model} · ${v.engine}${vin}`;
}

export function LaborMockupPrototype() {
  const [uiMode, setUiMode] = useState<UiMode>("mock-v3");
  const [navMode, setNavMode] = useState<NavMode>("default");
  const [pathTab, setPathTab] = useState<PathTab>("free");
  const [searchQuery, setSearchQuery] = useState("");
  const [browse, setBrowse] = useState<BrowseState>(INITIAL_BROWSE);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [clickCount, setClickCount] = useState(0);
  const [cartItems, setCartItems] = useState<MockJobRow[]>([]);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [showRelated, setShowRelated] = useState(false);
  const [millerOn, setMillerOn] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [activeVehicle, setActiveVehicle] = useState<MockVehicle>(DEFAULT_VEHICLE);
  const [qualifierVariant, setQualifierVariant] = useState<QualifierVariant>("with-ac");
  const [estimateToast, setEstimateToast] = useState<string | null>(null);
  const [checklistDone, setChecklistDone] = useState<Set<ChecklistItemId>>(new Set());

  useChecklistHydration(setChecklistDone);
  useChecklistPersistence(checklistDone);

  const markCheck = useCallback((id: ChecklistItemId) => {
    setChecklistDone((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const bump = useCallback(() => {
    setClickCount((n) => n + 1);
    markCheck("click-counter");
  }, [markCheck]);

  const trailParts = useMemo(() => {
    if (navMode === "search") return [];
    if (!browse.subcategoryId) return [];
    return browseBreadcrumbParts(browse.subcategoryId, browse.positionId, browse.operationId);
  }, [browse, navMode]);

  const isAssembly =
    browse.subcategoryId != null && subcategoryIsAssemblyOnly(browse.subcategoryId);

  const pathComplete = browse.subcategoryId
    ? isBrowsePathComplete(browse.subcategoryId, browse.positionId, browse.operationId)
    : false;

  const nextStep = browse.subcategoryId
    ? nextBrowseStep(browse.subcategoryId, browse.positionId, browse.operationId)
    : null;

  const jobs = useMemo(() => {
    if (navMode === "search" && searchQuery.trim()) {
      return mockJobsForContext({ searchQuery });
    }
    if (pathComplete && browse.subcategoryId) {
      return mockJobsForContext({
        categoryId: browse.categoryId,
        subcategoryId: browse.subcategoryId,
        positionId: browse.positionId,
        operationId: browse.operationId,
      });
    }
    return [];
  }, [navMode, searchQuery, pathComplete, browse]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? null;

  const qualifier = qualifierForSubcategory(browse.subcategoryId);

  const cartHours = cartItems.reduce((sum, j) => sum + j.hours, 0);

  const resetBrowse = useCallback(
    (partial?: Partial<BrowseState>) => {
      setBrowse({ ...INITIAL_BROWSE, ...partial });
      setSelectedJobId(null);
      setShowRelated(false);
    },
    [],
  );

  const applyChip = useCallback(
    (chipId: string) => {
      const quick = QUICK_CHIPS.find((q) => q.chipId === chipId);
      const chip = quick ? SHOP_LIBRARY_CHIPS.find((c) => c.label === quick.label) : undefined;

      setActiveVehicle(DEFAULT_VEHICLE);
      markCheck("quick-chip");

      if (!chip?.browsePath && quick) {
        setNavMode("search");
        setSearchQuery(quick.query);
        setActiveChip(chipId);
        resetBrowse();
        bump();
        return;
      }
      if (chip?.browsePath) {
        setNavMode("browse");
        setSearchQuery("");
        setActiveChip(chipId);
        setBrowse({
          categoryId: chip.browsePath.categoryId,
          subcategoryId: chip.browsePath.subcategoryId,
          positionId: chip.browsePath.positionId ?? null,
          operationId: chip.browsePath.operationId ?? null,
        });
        bump();
      }
    },
    [bump, markCheck, resetBrowse],
  );

  const selectSystem = (categoryId: string) => {
    setNavMode("browse");
    setBrowse({ categoryId, subcategoryId: null, positionId: null, operationId: null });
    setActiveChip(null);
    markCheck("browse-cold");
    bump();
  };

  const selectSubcategory = (subcategoryId: string) => {
    if (!browse.categoryId) return;
    const assembly = subcategoryIsAssemblyOnly(subcategoryId);
    setBrowse({
      categoryId: browse.categoryId,
      subcategoryId,
      positionId: assembly ? "all" : null,
      operationId: null,
    });
    setSelectedJobId(null);
    if (assembly) setQualifierVariant("with-ac");
    markCheck("browse-cold");
    bump();
  };

  const selectFacet = (facet: "position" | "operation", id: string) => {
    if (!browse.subcategoryId) return;
    setBrowse((prev) => ({
      ...prev,
      positionId: facet === "position" ? id : prev.positionId,
      operationId: facet === "operation" ? id : prev.operationId,
    }));
    setSelectedJobId(null);
    markCheck(uiMode === "mock-v3" ? "facet-chips" : "facet-lists");
    bump();
  };

  const trailNavigate = (index: number) => {
    if (index < 0) {
      resetBrowse();
      setNavMode("browse");
      bump();
      return;
    }
    const parts = trailParts;
    const cat = LABOR_CATEGORY_TREE.find((c) => c.label === parts[0]);
    const sub = cat?.subcategories.find((s) => s.label === parts[1]);
    if (!cat || !sub) return;

    let positionId: string | null = null;
    let operationId: string | null = null;

    if (index >= 1) {
      const order = browseStepOrder(sub.id);
      const facetParts = parts.slice(2);
      if (order[0] === "position" && facetParts[0]) {
        const pos = positionFacetsForSubcategory(sub.id).find((p) => p.label === facetParts[0]);
        if (index >= 2) positionId = pos?.id ?? null;
      } else if (order[0] === "operation" && facetParts[0]) {
        const op = operationFacetsForSubcategory(sub.id).find((o) => o.label === facetParts[0]);
        if (index >= 2) operationId = op?.id ?? null;
      }
    }

    if (index === 0) {
      setBrowse({ categoryId: cat.id, subcategoryId: null, positionId: null, operationId: null });
    } else if (index === 1) {
      setBrowse({ categoryId: cat.id, subcategoryId: sub.id, positionId: null, operationId: null });
    } else {
      setBrowse({
        categoryId: cat.id,
        subcategoryId: sub.id,
        positionId,
        operationId,
      });
    }
    setSelectedJobId(null);
    markCheck("trail-truncate");
    bump();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setNavMode("search");
      setActiveChip(null);
      resetBrowse();
      setActiveVehicle(DEFAULT_VEHICLE);
      markCheck("search-flat");
      markCheck("search-clears-trail");
    } else {
      setNavMode("default");
    }
  };

  const handleBrowseClick = () => {
    setNavMode("browse");
    setSearchQuery("");
    setActiveChip(null);
    if (!browse.categoryId) resetBrowse();
    markCheck("browse-cold");
    bump();
  };

  const applyPath3 = useCallback(() => {
    const path3 = LABOR_PATH_ASSEMBLY_HEATER_CORE;
    setNavMode("browse");
    setSearchQuery("");
    setActiveChip(null);
    setActiveVehicle(HEATER_CORE_VEHICLE);
    setQualifierVariant("with-ac");
    setBrowse({
      categoryId: path3.browsePath.categoryId,
      subcategoryId: path3.browsePath.subcategoryId,
      positionId: "all",
      operationId: null,
    });
    markCheck("path-3");
    bump();
  }, [bump, markCheck]);

  const handlePathTab = (tab: PathTab) => {
    setPathTab(tab);
    if (tab === "path-1") {
      setActiveVehicle(DEFAULT_VEHICLE);
      applyChip("front-brakes");
      markCheck("path-1");
    } else if (tab === "path-2") {
      setActiveVehicle(DEFAULT_VEHICLE);
      applyChip("struts");
      markCheck("path-2");
    } else if (tab === "path-3") {
      applyPath3();
    } else {
      setNavMode("default");
      resetBrowse();
      setSearchQuery("");
      setActiveChip(null);
      setActiveVehicle(DEFAULT_VEHICLE);
      markCheck("free-browse");
      bump();
    }
  };

  const addToCart = (job: MockJobRow) => {
    setCartItems((prev) => [...prev, job]);
    markCheck("add-to-cart");
    if (cartItems.length >= 1) markCheck("cart-footer");
    bump();
  };

  const addToJob = (job: MockJobRow) => {
    addToCart(job);
    markCheck("add-to-job");
  };

  const handleAddToEstimate = () => {
    if (cartItems.length === 0) return;
    setEstimateToast(
      `Added ${cartItems.length} line${cartItems.length === 1 ? "" : "s"} (${cartHours.toFixed(1)}h) to estimate`,
    );
    markCheck("add-to-estimate");
    bump();
    setTimeout(() => setEstimateToast(null), 3000);
  };

  const toggleMiller = useCallback(() => {
    setMillerOn((v) => !v);
    markCheck("miller-toggle");
    bump();
  }, [bump, markCheck]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMiller();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMiller]);

  useEffect(() => {
    if (jobs.length > 0) markCheck("results-table");
  }, [jobs.length, markCheck]);

  useEffect(() => {
    if (qualifier) markCheck("qualifier-band");
  }, [qualifier, markCheck]);

  useEffect(() => {
    if (selectedJob) markCheck("detail-panel");
  }, [selectedJob, markCheck]);

  useEffect(() => {
    if (cartItems.length >= 2) markCheck("cart-footer");
  }, [cartItems.length, markCheck]);

  const positions = browse.subcategoryId ? positionFacetsForSubcategory(browse.subcategoryId) : [];
  const operations = browse.subcategoryId ? operationFacetsForSubcategory(browse.subcategoryId) : [];

  const showPositionFacet =
    browse.subcategoryId && !isAssembly && (nextStep === "position" || browse.positionId);
  const showOperationFacet =
    browse.subcategoryId && !isAssembly && (nextStep === "operation" || browse.operationId);

  const category = browse.categoryId
    ? LABOR_CATEGORY_TREE.find((c) => c.id === browse.categoryId)
    : null;

  const showSystemList =
    (navMode === "default" || navMode === "browse") && !browse.categoryId;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 py-3">
      <TestChecklistPanel
        done={checklistDone}
        onReset={() => setChecklistDone(new Set())}
      />

      {/* Dev banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-orange/25 bg-brand-orange/[0.06] px-3 py-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <FlaskConical className="size-4 text-brand-orange" />
          <span className="font-medium text-brand-navy">Mock v3 prototype</span>
          <Badge variant="outline" className="text-[10px] uppercase">
            Option F — design only
          </Badge>
          <Badge className="gap-1 bg-brand-navy text-[10px] hover:bg-brand-navy">
            <MousePointerClick className="size-3" />
            {clickCount} click{clickCount === 1 ? "" : "s"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-brand-navy/10 bg-background p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setUiMode("mock-v3");
              markCheck("ui-toggle");
              bump();
            }}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              uiMode === "mock-v3"
                ? "bg-brand-orange text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Mock v3 (chips)
          </button>
          <button
            type="button"
            onClick={() => {
              setUiMode("option-a");
              markCheck("ui-toggle");
              bump();
            }}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              uiMode === "option-a"
                ? "bg-brand-navy text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Option A (lists)
          </button>
          <button
            type="button"
            onClick={() => {
              setUiMode("mock-v5");
              markCheck("ui-toggle");
              bump();
            }}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              uiMode === "mock-v5"
                ? "bg-brand-navy text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Mock v5 (ProDemand+TM)
          </button>
          <button
            type="button"
            onClick={() => {
              setUiMode("mock-v4");
              markCheck("ui-toggle");
              bump();
            }}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium transition-colors",
              uiMode === "mock-v4"
                ? "bg-emerald-600 text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Mock v4 (tree-grid)
          </button>
        </div>
      </div>

      {uiMode === "mock-v5" ? (
        <p className="px-1 text-xs text-muted-foreground">
          <strong className="text-brand-navy">Mock v5 (default on :3031):</strong> Tekmetric top
          breadcrumb + ProDemand left tree + center flat table + right detail + bottom staging.
          See <code className="text-[10px]">docs/design/labor-book-prodemand-tekmetric.md</code>.
        </p>
      ) : uiMode === "mock-v4" ? (
        <p className="px-1 text-xs text-muted-foreground">
          <strong className="text-emerald-700">Mock v4:</strong> persistent MOTOR tree + live results
          grid + bottom staging dock. Position = grid filters, not nav levels. See{" "}
          <code className="text-[10px]">docs/design/labor-breadcrumb-mockup-V4-COMPETITOR.md</code>.
        </p>
      ) : uiMode === "option-a" ? (
        <p className="px-1 text-xs text-muted-foreground">
          <strong className="text-brand-navy">Option A mode:</strong> position and operation appear
          as middle-pane <em>lists</em> (trail drill). Mock v3 uses <em>chip-sync</em> for faster
          Front↔Rear swaps.
        </p>
      ) : (
        <p className="px-1 text-xs text-muted-foreground">
          <strong className="text-brand-navy">Mock v3:</strong> search-first landing; chips write
          facets into the left trail. {PATH_1_HINT}. {PATH_2_HINT}. {PATH_3_HINT}.
        </p>
      )}

      {estimateToast ? (
        <div className="rounded-md border border-emerald-300/60 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {estimateToast}
        </div>
      ) : null}

      {/* Path switcher — v3 / Option A only */}
      {uiMode !== "mock-v4" && uiMode !== "mock-v5" ? (
      <div className="flex flex-wrap gap-1 border-b border-brand-navy/10 pb-2">
        {(
          [
            ["path-1", "Path 1 — Brake pads"],
            ["path-2", "Path 2 — Struts"],
            ["path-3", "Path 3 — Heater core"],
            ["free", "Free browse"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => handlePathTab(id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              pathTab === id
                ? "bg-brand-navy text-white"
                : "bg-brand-navy/5 text-brand-navy hover:bg-brand-navy/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      ) : null}

      {uiMode === "mock-v5" ? (
        <LaborMockupV5Panel clickCount={clickCount} onBump={bump} />
      ) : uiMode === "mock-v4" ? (
        <LaborMockupV4Panel clickCount={clickCount} onBump={bump} />
      ) : (
      <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl border border-brand-navy/15 bg-card shadow-sm">
        {/* Header */}
        <div className="border-b border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-brand-navy">
              Smart Labor Book — {vehicleHeader(activeVehicle)}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Cart ({cartItems.length})</span>
              <span className="text-brand-navy/30">·</span>
              <span>{millerOn ? "Miller on" : "Miller off"}</span>
              <button
                type="button"
                onClick={toggleMiller}
                className="rounded border border-brand-navy/15 bg-background px-1.5 py-0.5 text-[10px] hover:bg-brand-navy/5"
                title="Toggle Miller columns (stub)"
              >
                ⌘⇧M
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search flat-rate ops for this vehicle…"
                className="h-8 border-brand-navy/15 bg-background pl-8 text-sm"
              />
            </div>
            {searchQuery ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => handleSearchChange("")}
              >
                Clear
              </Button>
            ) : null}
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleBrowseClick}>
              <BookOpen className="size-3.5" />
              Browse →
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setShowRecent((v) => !v);
                  markCheck("recent-menu");
                  bump();
                }}
              >
                Recent ▾
              </Button>
              {showRecent ? (
                <ul className="absolute top-full right-0 z-20 mt-1 min-w-[220px] rounded-lg border border-brand-navy/15 bg-background py-1 shadow-md">
                  {RECENT_JOBS.map((r) => (
                    <li key={r.name}>
                      <button
                        type="button"
                        className="flex w-full px-3 py-1.5 text-left text-xs hover:bg-brand-navy/5"
                        onClick={() => {
                          handleSearchChange(r.query);
                          setShowRecent(false);
                          bump();
                        }}
                      >
                        {r.name} · {r.hours}h
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((chip) => (
              <button
                key={chip.chipId}
                type="button"
                onClick={() => applyChip(chip.chipId)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                  activeChip === chip.chipId
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-navy/15 bg-background text-brand-navy hover:border-brand-orange/40 hover:bg-brand-orange/5",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3-pane body */}
        <div
          className={cn(
            "grid min-h-0 flex-1 divide-x divide-brand-navy/10",
            millerOn ? "grid-cols-[140px_140px_1fr_220px]" : "grid-cols-[180px_1fr_220px]",
          )}
        >
          {millerOn ? (
            <aside className="flex flex-col overflow-y-auto bg-brand-navy/[0.04] p-2">
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-brand-navy/50 uppercase">
                Miller stub
              </p>
              <p className="text-[10px] text-muted-foreground italic">
                System / Component columns (⌘⇧M power-user mode)
              </p>
            </aside>
          ) : null}

          {/* Left trail */}
          <aside className="flex flex-col overflow-y-auto bg-brand-navy/[0.02] p-3">
            <p
              className={cn(
                "mb-2 text-[10px] font-semibold tracking-wider uppercase",
                navMode === "search" ? "text-muted-foreground/60" : "text-brand-navy/70",
              )}
            >
              {navMode === "search" ? "Trail (dim)" : "Browse trail"}
            </p>

            {navMode === "search" ? (
              <p className="text-xs text-muted-foreground italic">search mode</p>
            ) : showSystemList ? (
              <ul className="space-y-1">
                {LABOR_CATEGORY_TREE.slice(0, 8).map((sys) => (
                  <li key={sys.id}>
                    <button
                      type="button"
                      onClick={() => selectSystem(sys.id)}
                      className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs text-muted-foreground hover:bg-brand-navy/5 hover:text-brand-navy"
                    >
                      <span className="size-1.5 rounded-full border border-brand-navy/30" />
                      {sys.label}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ol className="space-y-0.5">
                {trailParts.map((part, i) => (
                  <li key={`${part}-${i}`}>
                    <button
                      type="button"
                      onClick={() => trailNavigate(i)}
                      className={cn(
                        "group flex w-full items-center gap-1 truncate rounded px-1.5 py-1 text-left text-xs transition-colors",
                        i === trailParts.length - 1
                          ? "font-semibold text-brand-navy"
                          : "text-muted-foreground hover:bg-brand-navy/5 hover:text-brand-navy",
                      )}
                      title={part}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          i === trailParts.length - 1 ? "bg-brand-orange" : "bg-brand-navy/30",
                        )}
                      />
                      <span className="truncate">{part}</span>
                    </button>
                  </li>
                ))}
                {!browse.subcategoryId && category ? (
                  <li className="mt-2 text-[10px] text-muted-foreground">Pick a component →</li>
                ) : null}
              </ol>
            )}
          </aside>

          {/* Middle results */}
          <main className="flex flex-col overflow-y-auto p-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-brand-navy/70 uppercase">
              Results
            </p>

            {navMode === "default" && !searchQuery && !browse.categoryId ? (
              <div className="flex flex-1 flex-col justify-center gap-3 text-center">
                <Sparkles className="mx-auto size-8 text-brand-orange/50" />
                <p className="text-sm text-muted-foreground">
                  Type or pick a chip to jump to jobs.
                </p>
                <p className="text-xs text-muted-foreground">
                  New hire?{" "}
                  <button
                    type="button"
                    className="text-brand-navy underline"
                    onClick={handleBrowseClick}
                  >
                    Browse →
                  </button>{" "}
                  starts System list.
                </p>
                <div className="mx-auto mt-2 text-left text-xs text-muted-foreground">
                  <p className="mb-1 font-medium text-brand-navy/80">Recent</p>
                  {RECENT_JOBS.map((r) => (
                    <p key={r.name}>
                      {r.name} · {r.hours}h
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {navMode === "browse" && browse.categoryId && !browse.subcategoryId && category ? (
              <ul className="space-y-1">
                {category.subcategories.map((sub) => (
                  <li key={sub.id}>
                    <button
                      type="button"
                      onClick={() => selectSubcategory(sub.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-brand-navy/8 bg-background px-3 py-2 text-left text-sm hover:border-brand-orange/30 hover:bg-brand-orange/[0.03]"
                    >
                      <span className="font-medium text-brand-navy">{sub.label}</span>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            {navMode === "browse" && browse.subcategoryId && !isAssembly ? (
              <div className="mb-3 space-y-2">
                {showPositionFacet && positions.length > 0 ? (
                  <FacetRow
                    label="Position"
                    uiMode={uiMode}
                    items={positions.map((p) => ({ id: p.id, label: p.label }))}
                    selectedId={browse.positionId}
                    onSelect={(id) => selectFacet("position", id)}
                    chipSyncNote={uiMode === "mock-v3"}
                  />
                ) : null}
                {showOperationFacet && operations.length > 0 ? (
                  <FacetRow
                    label="Operation"
                    uiMode={uiMode}
                    items={operations.map((o) => ({ id: o.id, label: o.label }))}
                    selectedId={browse.operationId}
                    onSelect={(id) => selectFacet("operation", id)}
                    chipSyncNote={uiMode === "mock-v3"}
                  />
                ) : null}
              </div>
            ) : null}

            {isAssembly && browse.subcategoryId === "hvac-heater-core" ? (
              <QualifierVariantBand
                variant={qualifierVariant}
                onChange={(v) => {
                  setQualifierVariant(v);
                  setSelectedJobId(v === "with-ac" ? "heater-with-ac" : "heater-without-ac");
                  markCheck("qualifier-variant");
                  bump();
                }}
              />
            ) : null}

            {qualifier && (pathComplete || navMode === "search") && !isAssembly ? (
              <div className="mb-2 rounded-md border border-brand-navy/10 bg-brand-navy/[0.03] px-2.5 py-1.5 text-xs text-brand-navy">
                <span className="font-medium">Qualifier:</span> {qualifier}
              </div>
            ) : null}

            {jobs.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-brand-navy/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-brand-navy/10 bg-brand-navy/[0.04] text-left text-[10px] tracking-wide text-brand-navy/70 uppercase">
                      {isAssembly ? <th className="w-6 px-2 py-1.5" /> : null}
                      <th className="w-12 px-2 py-1.5">Hrs</th>
                      <th className="px-2 py-1.5">Operation</th>
                      {!isAssembly ? <th className="w-16 px-2 py-1.5">Pos</th> : null}
                      <th className="w-10 px-2 py-1.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const isVariantRow = Boolean(job.variant);
                      const isActiveVariant = job.variant === qualifierVariant;
                      const dimmed = isVariantRow && !isActiveVariant;
                      return (
                        <tr
                          key={job.id}
                          className={cn(
                            "cursor-pointer border-b border-brand-navy/5 transition-colors last:border-0",
                            selectedJob?.id === job.id
                              ? "bg-brand-orange/10"
                              : "hover:bg-brand-navy/[0.03]",
                            dimmed && "opacity-45",
                          )}
                          onClick={() => {
                            if (job.variant) {
                              setQualifierVariant(job.variant);
                              markCheck("qualifier-variant");
                            }
                            setSelectedJobId(job.id);
                            bump();
                          }}
                        >
                          {isAssembly ? (
                            <td className="px-2 py-2 text-center text-brand-navy">
                              {isActiveVariant ? "●" : "○"}
                            </td>
                          ) : null}
                          <td className="px-2 py-2 font-medium text-brand-navy tabular-nums">
                            {job.hours.toFixed(1)}
                          </td>
                          <td className="px-2 py-2 font-medium text-brand-navy">{job.name}</td>
                          {!isAssembly ? (
                            <td className="px-2 py-2 text-muted-foreground">
                              {job.position ?? "—"}
                            </td>
                          ) : null}
                          <td className="px-2 py-2">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-brand-orange hover:bg-brand-orange/10 hover:text-brand-orange"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(job);
                              }}
                            >
                              <Plus className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}

            {navMode === "search" && searchQuery && jobs.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No match?{" "}
                <button
                  type="button"
                  className="text-brand-navy underline"
                  onClick={() => {
                    setNavMode("browse");
                    setBrowse({
                      categoryId: "brakes",
                      subcategoryId: null,
                      positionId: null,
                      operationId: null,
                    });
                    bump();
                  }}
                >
                  Browse Brakes →
                </button>
              </p>
            ) : null}
          </main>

          {/* Right detail */}
          <aside className="flex flex-col overflow-y-auto bg-brand-navy/[0.02] p-3">
            <p className="mb-2 text-[10px] font-semibold tracking-wider text-brand-navy/70 uppercase">
              Detail
            </p>

            {selectedJob ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm leading-snug font-semibold text-brand-navy">
                    {selectedJob.name}
                    {selectedJob.position ? ` — ${selectedJob.position}` : ""}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedJob.hours.toFixed(1)} hr
                    {selectedJob.skill ? ` · Skill ${selectedJob.skill}` : ""}
                  </p>
                  {selectedJob.includes ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-brand-navy/80">Includes:</span>{" "}
                      {selectedJob.includes}
                    </p>
                  ) : null}
                  {selectedJob.partsCount != null ? (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-brand-navy/80">Parts:</span>{" "}
                      {selectedJob.partsCount} linked
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Button
                    size="sm"
                    className="w-full bg-brand-orange text-white hover:bg-brand-orange/90"
                    onClick={() => addToJob(selectedJob)}
                  >
                    <Plus className="size-3.5" />
                    Add to job
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => addToCart(selectedJob)}
                  >
                    <ShoppingCart className="size-3.5" />
                    Add to cart
                  </Button>
                </div>

                {selectedJob.related && selectedJob.related.length > 0 ? (
                  <div>
                    <button
                      type="button"
                      className="text-xs font-medium text-brand-navy hover:underline"
                      onClick={() => {
                        setShowRelated((v) => !v);
                        markCheck("related-labor");
                        bump();
                      }}
                    >
                      Related labor {showRelated ? "▾" : "▸"}
                    </button>
                    {showRelated ? (
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {selectedJob.related.map((r) => (
                          <li key={r}>· {r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a row to preview</p>
            )}
          </aside>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShoppingCart className="size-3.5" />
            Cart ({cartItems.length})
            {cartItems.length > 0 ? (
              <>
                <span className="text-brand-navy/30">·</span>
                <span className="font-medium text-brand-navy tabular-nums">
                  {cartHours.toFixed(1)}h total
                </span>
              </>
            ) : null}
            <span className="text-brand-navy/30">·</span>
            {millerOn ? "Miller on" : "Miller off"}
          </span>
          <Button
            size="sm"
            variant={cartItems.length > 0 ? "default" : "outline"}
            className={cn(
              "h-7 text-xs",
              cartItems.length > 0 && "bg-brand-orange text-white hover:bg-brand-orange/90",
            )}
            disabled={cartItems.length === 0}
            onClick={handleAddToEstimate}
          >
            Add to estimate →
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

function FacetRow({
  label,
  uiMode,
  items,
  selectedId,
  onSelect,
  chipSyncNote,
}: {
  label: string;
  uiMode: UiMode;
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  chipSyncNote?: boolean;
}) {
  if (uiMode === "option-a") {
    return (
      <div>
        <p className="mb-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
          {label} list (Option A)
        </p>
        <ul className="space-y-0.5">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded border px-2.5 py-1.5 text-left text-xs transition-colors",
                  selectedId === item.id
                    ? "border-brand-navy bg-brand-navy/5 font-medium text-brand-navy"
                    : "border-brand-navy/10 hover:border-brand-navy/25",
                )}
              >
                {item.label}
                <ChevronRight className="size-3 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
        {label}
        {chipSyncNote ? (
          <span className="ml-1 font-normal text-brand-orange">· syncs trail</span>
        ) : null}
      </p>
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
              selectedId === item.id
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

function QualifierVariantBand({
  variant,
  onChange,
}: {
  variant: QualifierVariant;
  onChange: (v: QualifierVariant) => void;
}) {
  return (
    <div className="mb-3 rounded-md border border-brand-navy/10 bg-brand-navy/[0.03] px-2.5 py-2">
      <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
        Qualifier (VIN-derived)
      </p>
      <div className="flex flex-col gap-1">
        {(["with-ac", "without-ac"] as const).map((v) => (
          <label
            key={v}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs transition-colors",
              variant === v
                ? "bg-brand-orange/10 font-medium text-brand-navy"
                : "text-muted-foreground hover:bg-brand-navy/5",
            )}
          >
            <input
              type="radio"
              name="hvac-variant"
              checked={variant === v}
              onChange={() => onChange(v)}
              className="accent-brand-orange"
            />
            {qualifierVariantLabel(v)}
          </label>
        ))}
      </div>
    </div>
  );
}
