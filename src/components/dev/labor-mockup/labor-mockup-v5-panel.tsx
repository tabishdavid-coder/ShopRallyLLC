"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, LayoutGrid, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LABOR_CATEGORY_TREE } from "@/lib/labor-categories";
import { subcategoryIsAssemblyOnly } from "@/lib/labor-browse-hierarchy";
import {
  browseBreadcrumbParts,
  operationFacetsForSubcategory,
} from "@/lib/labor-nav-facets";
import { LABOR_BOOK_POPULAR } from "@/lib/labor-book-v4-helpers";
import {
  DEFAULT_VEHICLE,
  HEATER_CORE_VEHICLE,
  mockJobsForContext,
  qualifierForSubcategory,
  qualifierVariantLabel,
  type MockJobRow,
  type MockVehicle,
} from "@/components/dev/labor-mockup/mock-data";

type QualifierVariant = "with-ac" | "without-ac";

function vehicleHeader(v: MockVehicle) {
  const vin = v.vin ? ` · VIN …${v.vin.slice(-5)}` : "";
  return `${v.year} ${v.make} ${v.model} · ${v.engine}${vin}`;
}

function mockJobsAllPositions(ctx: {
  categoryId?: string | null;
  subcategoryId?: string | null;
  operationId?: string | null;
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

export function LaborMockupV5Panel({
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
  const [browseOperationId, setBrowseOperationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<MockJobRow[]>([]);
  const [qualifierVariant, setQualifierVariant] = useState<QualifierVariant>("with-ac");
  const [estimateToast, setEstimateToast] = useState<string | null>(null);

  const isSearchActive = searchQuery.trim().length > 0;
  const isAssembly =
    selectedSubcategoryId != null && subcategoryIsAssemblyOnly(selectedSubcategoryId);

  const breadcrumbParts = useMemo(() => {
    if (isSearchActive || !selectedSubcategoryId) return [];
    return browseBreadcrumbParts(selectedSubcategoryId, null, browseOperationId);
  }, [isSearchActive, selectedSubcategoryId, browseOperationId]);

  const gridRows = useMemo(() => {
    if (isSearchActive) return mockJobsForContext({ searchQuery });
    if (!selectedSubcategoryId) return [];
    let rows = mockJobsAllPositions({
      categoryId: selectedCategoryId ?? undefined,
      subcategoryId: selectedSubcategoryId,
      operationId: isAssembly ? "replace" : browseOperationId,
    });
    if (isAssembly) rows = rows.filter((r) => r.variant === qualifierVariant);
    return rows;
  }, [
    isSearchActive,
    searchQuery,
    selectedSubcategoryId,
    selectedCategoryId,
    browseOperationId,
    isAssembly,
    qualifierVariant,
  ]);

  const selectedRow = gridRows.find((r) => r.id === selectedRowId) ?? gridRows[0] ?? null;

  const toggleSystem = (categoryId: string) => {
    setExpandedSystems((prev) => (prev.has(categoryId) ? new Set() : new Set([categoryId])));
    onBump();
  };

  const selectSubcategory = (categoryId: string, subcategoryId: string) => {
    setExpandedSystems(new Set([categoryId]));
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(subcategoryId);
    setSearchQuery("");
    setSelectedRowId(null);
    if (subcategoryId === "hvac-heater-core") {
      setVehicle(HEATER_CORE_VEHICLE);
      setQualifierVariant("with-ac");
    } else {
      setVehicle(DEFAULT_VEHICLE);
    }
    if (subcategoryIsAssemblyOnly(subcategoryId)) {
      setBrowseOperationId(null);
    } else {
      const ops = operationFacetsForSubcategory(subcategoryId);
      setBrowseOperationId(ops[0]?.id ?? null);
    }
    onBump();
  };

  const truncateBreadcrumb = (index: number) => {
    if (index < 0) {
      setSelectedCategoryId(null);
      setSelectedSubcategoryId(null);
      setBrowseOperationId(null);
      setSelectedRowId(null);
      onBump();
      return;
    }
    const cat = LABOR_CATEGORY_TREE.find((c) => c.label === breadcrumbParts[0]);
    const sub = cat?.subcategories.find((s) => s.label === breadcrumbParts[1]);
    if (!cat) return;
    if (index === 0) {
      setSelectedCategoryId(cat.id);
      setSelectedSubcategoryId(null);
      setBrowseOperationId(null);
    } else if (sub && index === 1) {
      setSelectedCategoryId(cat.id);
      setSelectedSubcategoryId(sub.id);
      setBrowseOperationId(null);
    }
    setSelectedRowId(null);
    onBump();
  };

  const addToCart = (job: MockJobRow) => {
    setCartItems((prev) => (prev.some((j) => j.id === job.id) ? prev : [...prev, job]));
    onBump();
  };

  const addToEstimate = useCallback(() => {
    if (cartItems.length === 0) return;
    const hrs = cartItems.reduce((s, j) => s + j.hours, 0);
    setEstimateToast(`Added ${cartItems.length} line(s) (${hrs.toFixed(1)} hr)`);
    setCartItems([]);
    onBump();
    setTimeout(() => setEstimateToast(null), 3000);
  }, [cartItems, onBump]);

  const cartHours = cartItems.reduce((sum, j) => sum + j.hours, 0);
  const qualifier = qualifierForSubcategory(selectedSubcategoryId);
  const operationPills =
    selectedSubcategoryId && !isAssembly && !isSearchActive
      ? operationFacetsForSubcategory(selectedSubcategoryId)
      : [];

  const breadcrumbSegments = [
    { label: vehicleHeader(vehicle), index: -1 },
    ...breadcrumbParts.map((part, i) => ({ label: part, index: i })),
  ];

  return (
    <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-xl border border-brand-navy/15 bg-card shadow-sm">
      <div className="border-b border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-brand-navy">{vehicleHeader(vehicle)}</h2>
          <span className="text-xs text-muted-foreground">
            Mock v5 · ProDemand+Tekmetric · {clickCount} click{clickCount === 1 ? "" : "s"}
          </span>
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value.trim()) onBump();
            }}
            placeholder="Search labor guide…"
            className="h-8 border-brand-navy/15 bg-background pl-8 text-sm"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {LABOR_BOOK_POPULAR.slice(0, 6).map((pick) => (
            <button
              key={pick.query}
              type="button"
              onClick={() => {
                if (pick.browsePath) {
                  selectSubcategory(pick.browsePath.categoryId, pick.browsePath.subcategoryId);
                } else {
                  setSearchQuery(pick.query);
                  onBump();
                }
              }}
              className="rounded-full border border-brand-navy/15 px-2.5 py-0.5 text-xs text-brand-navy hover:border-brand-orange/50"
            >
              {pick.label}
            </button>
          ))}
        </div>
      </div>

      {!isSearchActive && breadcrumbSegments.length > 1 ? (
        <nav className="flex flex-wrap items-center gap-1 border-b border-brand-navy/10 px-4 py-2 text-xs">
          {breadcrumbSegments.map((seg, i) => (
            <Fragment key={`${seg.label}-${i}`}>
              {i > 0 ? <ChevronRight className="size-3 text-brand-navy/30" /> : null}
              <button
                type="button"
                onClick={() => truncateBreadcrumb(seg.index)}
                className={cn(
                  "rounded px-1 py-0.5 hover:underline",
                  i === breadcrumbSegments.length - 1
                    ? "font-semibold text-brand-navy"
                    : "text-muted-foreground hover:text-brand-navy",
                )}
              >
                {seg.label}
              </button>
            </Fragment>
          ))}
        </nav>
      ) : null}

      {estimateToast ? (
        <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">
          {estimateToast}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="w-[200px] shrink-0 overflow-y-auto border-r border-brand-navy/10 bg-brand-navy/[0.02] p-2">
          <p className="mb-2 flex items-center gap-1 px-1 text-[10px] font-semibold tracking-wide text-brand-navy/60 uppercase">
            <LayoutGrid className="size-3" /> Systems
          </p>
          {LABOR_CATEGORY_TREE.map((cat) => {
            const expanded = expandedSystems.has(cat.id);
            return (
              <div key={cat.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => toggleSystem(cat.id)}
                  className="flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs font-medium text-brand-navy hover:bg-brand-navy/5"
                >
                  {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                  {cat.label}
                </button>
                {expanded ? (
                  <ul className="ml-4 border-l border-brand-navy/10 pl-1">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <button
                          type="button"
                          onClick={() => selectSubcategory(cat.id, sub.id)}
                          className={cn(
                            "w-full rounded px-2 py-1 text-left text-[11px]",
                            selectedSubcategoryId === sub.id && !isSearchActive
                              ? "bg-brand-orange font-medium text-white"
                              : "text-muted-foreground hover:bg-brand-navy/5",
                          )}
                        >
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </aside>

        <main className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-3">
            {!selectedSubcategoryId && !isSearchActive ? (
              <p className="m-auto text-sm text-muted-foreground">
                Pick a system component or search above.
              </p>
            ) : (
              <>
                {!isSearchActive && isAssembly ? (
                  <div className="mb-2 space-y-1 rounded-md border border-brand-navy/10 bg-brand-navy/[0.03] p-2">
                    {(["with-ac", "without-ac"] as const).map((v) => (
                      <label key={v} className="flex items-center gap-2 text-xs">
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
                ) : null}
                {operationPills.length > 0 ? (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {operationPills.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => {
                          setBrowseOperationId(o.id);
                          onBump();
                        }}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs",
                          browseOperationId === o.id
                            ? "border-brand-navy bg-brand-navy/10 text-brand-navy"
                            : "border-brand-navy/15 text-brand-navy",
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-brand-navy/10">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-brand-navy/[0.04] text-[10px] uppercase text-brand-navy/70">
                      <tr>
                        <th className="px-3 py-2 text-left">Operation</th>
                        <th className="px-2 py-2 text-left">Pos</th>
                        <th className="px-2 py-2 text-right">Hrs</th>
                        <th className="px-2 py-2 text-center">+</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gridRows.map((row) => (
                        <tr
                          key={row.id}
                          className={cn(
                            "cursor-pointer border-t border-brand-navy/5",
                            selectedRowId === row.id ? "bg-brand-orange/10" : "hover:bg-brand-navy/[0.03]",
                          )}
                          onClick={() => {
                            setSelectedRowId(row.id);
                            onBump();
                          }}
                        >
                          <td className="px-3 py-2 font-medium text-brand-navy">{row.name}</td>
                          <td className="px-2 py-2 text-muted-foreground">{row.position ?? "—"}</td>
                          <td className="px-2 py-2 text-right font-mono">{row.hours.toFixed(2)}</td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(row);
                              }}
                              className="inline-flex size-6 items-center justify-center rounded border border-brand-navy/15 hover:border-brand-orange"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <aside className="hidden w-[220px] shrink-0 flex-col border-l border-brand-navy/10 bg-brand-navy/[0.02] p-3 md:flex">
            <p className="mb-2 text-[10px] font-semibold uppercase text-brand-navy/60">Detail</p>
            {selectedRow ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-brand-navy">{selectedRow.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {selectedRow.hours.toFixed(2)} hr
                  {selectedRow.skill ? ` · Skill ${selectedRow.skill}` : ""}
                </p>
                {selectedRow.includes ? (
                  <p className="text-xs text-muted-foreground">Includes: {selectedRow.includes}</p>
                ) : null}
                {selectedRow.related?.length ? (
                  <ul className="text-xs text-muted-foreground">
                    {selectedRow.related.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                ) : null}
                <Button
                  size="sm"
                  className="w-full bg-brand-orange text-white"
                  onClick={() => addToCart(selectedRow)}
                >
                  Add to job
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select a row</p>
            )}
          </aside>
        </main>
      </div>

      <div className="flex items-center justify-between border-t border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-2">
        <span className="text-xs text-muted-foreground">
          Staging ({cartItems.length}) · {cartHours.toFixed(2)} hr
        </span>
        <Button
          size="sm"
          disabled={cartItems.length === 0}
          className="bg-brand-navy text-xs"
          onClick={addToEstimate}
        >
          Add to estimate →
        </Button>
      </div>
    </div>
  );
}
