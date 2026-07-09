"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LABOR_CATEGORY_TREE } from "@/lib/labor-categories";
import { subcategoryIsAssemblyOnly } from "@/lib/labor-browse-hierarchy";
import { positionFacetsForSubcategory } from "@/lib/labor-nav-facets";
import {
  DEFAULT_VEHICLE,
  HEATER_CORE_VEHICLE,
  mockJobsForContext,
  qualifierForSubcategory,
  qualifierVariantLabel,
  RECENT_JOBS,
  type MockJobRow,
  type MockVehicle,
} from "@/components/dev/labor-mockup/mock-data";

type PositionFilter = "all" | "front" | "rear";
type QualifierVariant = "with-ac" | "without-ac";

function vehicleHeader(v: MockVehicle) {
  const vin = v.vin ? ` · VIN …${v.vin.slice(-5)}` : "";
  return `${v.year} ${v.make} ${v.model} · ${v.engine}${vin}`;
}

export function LaborMockupV4Panel({
  clickCount,
  onBump,
}: {
  clickCount: number;
  onBump: () => void;
}) {
  const [vehicle, setVehicle] = useState<MockVehicle>(DEFAULT_VEHICLE);
  const [expandedSystems, setExpandedSystems] = useState<Set<string>>(() => new Set());
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("front");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<MockJobRow[]>([]);
  const [qualifierVariant, setQualifierVariant] = useState<QualifierVariant>("with-ac");
  const [estimateToast, setEstimateToast] = useState<string | null>(null);

  const isSearchActive = searchQuery.trim().length > 0;
  const isAssembly =
    selectedSubcategoryId != null && subcategoryIsAssemblyOnly(selectedSubcategoryId);

  const scopeLabel = useMemo(() => {
    if (isSearchActive) return "All systems (search)";
    if (!selectedCategoryId || !selectedSubcategoryId) return "All systems";
    const cat = LABOR_CATEGORY_TREE.find((c) => c.id === selectedCategoryId);
    const sub = cat?.subcategories.find((s) => s.id === selectedSubcategoryId);
    if (!cat || !sub) return "All systems";
    return `${cat.label} › ${sub.label}`;
  }, [isSearchActive, selectedCategoryId, selectedSubcategoryId]);

  const gridRows = useMemo(() => {
    if (isSearchActive) {
      return mockJobsForContext({ searchQuery });
    }
    if (!selectedSubcategoryId) return [];
    const positionId =
      isAssembly || positionFilter === "all"
        ? null
        : positionFilter === "front"
          ? "front"
          : "rear";
    let rows = mockJobsForContext({
      categoryId: selectedCategoryId ?? undefined,
      subcategoryId: selectedSubcategoryId,
      positionId,
      operationId: isAssembly ? "replace" : positionId ? "replace" : null,
    });
    if (isAssembly) {
      rows = rows.filter((r) => r.variant === qualifierVariant);
    } else if (positionFilter !== "all") {
      rows = rows.filter(
        (r) => !r.position || r.position.toLowerCase() === positionFilter,
      );
    }
    return rows;
  }, [
    isSearchActive,
    searchQuery,
    selectedSubcategoryId,
    selectedCategoryId,
    positionFilter,
    isAssembly,
    qualifierVariant,
  ]);

  const treeHighlight = useMemo(() => {
    if (!isSearchActive) return null;
    const q = searchQuery.toLowerCase();
    const hits = new Set<string>();
    for (const cat of LABOR_CATEGORY_TREE) {
      for (const sub of cat.subcategories) {
        if (
          sub.label.toLowerCase().includes(q) ||
          sub.keywords.some((kw) => q.includes(kw.toLowerCase()))
        ) {
          hits.add(sub.id);
          hits.add(cat.id);
        }
      }
    }
    return hits;
  }, [isSearchActive, searchQuery]);

  const toggleSystem = (categoryId: string) => {
    setExpandedSystems((prev) => {
      if (prev.has(categoryId)) return new Set();
      return new Set([categoryId]);
    });
    onBump();
  };

  const selectSubcategory = (categoryId: string, subcategoryId: string) => {
    setExpandedSystems(new Set([categoryId]));
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
    setSearchQuery("");
    setExpandedRowId(null);
    if (subcategoryId === "hvac-heater-core") {
      setVehicle(HEATER_CORE_VEHICLE);
      setQualifierVariant("with-ac");
    } else {
      setVehicle(DEFAULT_VEHICLE);
    }
    if (subcategoryIsAssemblyOnly(subcategoryId)) {
      setPositionFilter("all");
    } else {
      setPositionFilter("front");
    }
    onBump();
  };

  const addToCart = (job: MockJobRow) => {
    setCartItems((prev) => (prev.some((j) => j.id === job.id) ? prev : [...prev, job]));
    onBump();
  };

  const addToEstimate = useCallback(() => {
    if (cartItems.length === 0) return;
    setEstimateToast(`Added ${cartItems.length} line(s) to estimate (${cartHours.toFixed(1)} hr)`);
    setCartItems([]);
    onBump();
    setTimeout(() => setEstimateToast(null), 3000);
  }, [cartItems.length, onBump]);

  const cartHours = cartItems.reduce((sum, j) => sum + j.hours, 0);
  const qualifier = qualifierForSubcategory(selectedSubcategoryId);
  const positionFacets =
    selectedSubcategoryId && !isAssembly
      ? positionFacetsForSubcategory(selectedSubcategoryId)
      : [];

  return (
    <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl border border-brand-navy/15 bg-card shadow-sm">
      <div className="border-b border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-navy">
            Smart Labor Book — {vehicleHeader(vehicle)}
          </h2>
          <span className="text-xs text-muted-foreground">
            Mock v4 · Tree-Grid · {clickCount} click{clickCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) onBump();
            }}
            placeholder="Filter tree & operations…"
            className="h-8 border-brand-navy/15 bg-background pl-8 text-sm"
          />
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Scope: <span className="font-medium text-brand-navy">{scopeLabel}</span>
          {isSearchActive ? ` · ${gridRows.length} matches · tree filtered` : null}
        </p>
      </div>

      {estimateToast ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">
          {estimateToast}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        {/* Persistent MOTOR tree */}
        <aside className="w-[200px] shrink-0 overflow-y-auto border-r border-brand-navy/10 bg-brand-navy/[0.02] p-2">
          <p className="mb-2 px-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
            Motor tree
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

        {/* Live results grid */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
          {!selectedSubcategoryId && !isSearchActive ? (
            <div className="flex flex-1 flex-col justify-center text-center">
              <p className="text-sm text-muted-foreground">
                Pick a component in the tree — or search to filter across all systems.
              </p>
              <p className="mt-3 text-xs text-brand-navy/70">Popular for this vehicle:</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {RECENT_JOBS.map((r) => (
                  <button
                    key={r.query}
                    type="button"
                    onClick={() => {
                      setSearchQuery(r.query);
                      onBump();
                    }}
                    className="rounded-full border border-brand-navy/15 px-2.5 py-0.5 text-xs text-brand-navy hover:border-brand-orange/50"
                  >
                    {r.name} {r.hours}h
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {!isSearchActive && !isAssembly && positionFacets.length > 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-1">
                  <span className="text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
                    Filters:
                  </span>
                  {(["front", "rear", "all"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        setPositionFilter(f);
                        onBump();
                      }}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                        positionFilter === f
                          ? "border-brand-orange bg-brand-orange text-white"
                          : "border-brand-navy/20 text-brand-navy hover:border-brand-orange/50",
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              ) : null}

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
                          onChange={() => {
                            setQualifierVariant(v);
                            onBump();
                          }}
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
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={cn(
                              "border-t border-brand-navy/5 transition-colors",
                              expanded ? "bg-brand-orange/[0.06]" : "hover:bg-brand-navy/[0.03]",
                            )}
                          >
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedRowId(expanded ? null : row.id);
                                  onBump();
                                }}
                                className="text-left font-medium text-brand-navy hover:underline"
                              >
                                {expanded ? "▾ " : "▸ "}
                                {row.name}
                              </button>
                            </td>
                            {isSearchActive ? (
                              <td className="px-2 py-2 text-muted-foreground">{row.position ? "Brakes" : "—"}</td>
                            ) : null}
                            <td className="px-2 py-2 capitalize text-muted-foreground">
                              {row.position ?? "—"}
                            </td>
                            <td className="px-2 py-2 text-right font-mono">{row.hours.toFixed(1)}</td>
                            <td className="px-2 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => addToCart(row)}
                                className="inline-flex size-6 items-center justify-center rounded border border-brand-navy/15 text-brand-navy hover:border-brand-orange hover:bg-brand-orange/10"
                                aria-label="Add to staging"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                          {expanded ? (
                            <tr key={`${row.id}-detail`} className="bg-brand-navy/[0.02]">
                              <td
                                colSpan={isSearchActive ? 5 : 4}
                                className="px-3 py-2 text-[11px] text-muted-foreground"
                              >
                                MOTOR {row.hours}h · Skill {row.skill ?? "B"} · ymm cache
                                {row.includes ? ` · Includes: ${row.includes}` : null}
                                {row.related?.length ? (
                                  <span> · Related: {row.related.join(", ")}</span>
                                ) : null}
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
                {gridRows.length === 0 ? (
                  <p className="p-4 text-center text-xs text-muted-foreground">No operations match.</p>
                ) : null}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Bottom staging dock */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-navy/15 bg-brand-navy/[0.04] px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
            Staging ({cartItems.length}) · {cartHours.toFixed(1)} hr
          </p>
          {cartItems.length > 0 ? (
            <p className="truncate text-xs text-brand-navy">
              {cartItems.map((j) => `${j.name}${j.position ? ` ${j.position}` : ""}`).join(" · ")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Row + adds to staging dock</p>
          )}
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-brand-navy hover:bg-brand-navy/90"
          disabled={cartItems.length === 0}
          onClick={addToEstimate}
        >
          Add to estimate →
        </Button>
      </div>
    </div>
  );
}
