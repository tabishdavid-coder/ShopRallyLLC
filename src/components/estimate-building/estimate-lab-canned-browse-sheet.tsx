"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";
import { filterCannedJobsByQuery, filterCannedJobsForBrowse } from "@/lib/canned-job-browse-filter";
import {
  estimateCannedJobSummaryTotal,
  estimateCannedJobTotal,
} from "@/lib/canned-job-estimate";
import type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import {
  LABOR_CATEGORY_TREE,
  laborCategoryById,
  laborSubcategoryById,
} from "@/lib/labor-categories";
import {
  browseBreadcrumbParts,
  operationFacetsForSubcategory,
  positionFacetsForSubcategory,
  subcategoryUsesOperationFirst,
} from "@/lib/labor-nav-facets";
import {
  implicitBrowsePositionId,
  isBrowsePathComplete,
  nextBrowseStep,
  shouldLoadOnSubcategorySelect,
} from "@/lib/labor-browse-hierarchy";
import {
  addCannedJobToRepairOrder,
  fetchCannedJobDetail,
} from "@/server/actions/canned-jobs";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";

type BrowseStep = "category" | "subcategory" | "position" | "operation" | "jobs";

function NavRow({
  label,
  meta,
  active,
  onClick,
}: {
  label: string;
  meta?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 border-b border-border/50 px-3 py-2.5 text-left text-sm transition-colors last:border-b-0",
        active
          ? "bg-brand-light/15 font-semibold text-brand-navy"
          : "bg-white hover:bg-brand-light/8",
      )}
    >
      <span className="truncate">{label}</span>
      <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {meta ? <span className="text-[11px] tabular-nums">{meta}</span> : null}
        <ChevronRight className="size-3.5" />
      </span>
    </button>
  );
}

function PreviewTotalsBar({
  laborCents,
  partsCents,
  totalCents,
}: {
  laborCents: number;
  partsCents: number;
  totalCents: number;
}) {
  return (
    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
      Labor {formatCents(laborCents)} · Parts {formatCents(partsCents)} ·{" "}
      <span className="font-semibold text-brand-navy">Total {formatCents(totalCents)}</span>
    </p>
  );
}

/** Lab browse modal — labor-guide breadcrumbs + canned job preview; explicit Add only. */
export function EstimateLabCannedBrowseSheet({
  open,
  onOpenChange,
  roId,
  jobs,
  baseRateCents,
  partTiers,
  laborTiers,
  initialQuery = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  jobs: CannedJobSummary[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  initialQuery?: string;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [q, setQ] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CannedJobDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef(new Map<string, CannedJobDetail>());
  const fetchGen = useRef(0);

  const searchActive = q.trim().length > 0;

  const browseOpFirst = selectedSubcategory
    ? subcategoryUsesOperationFirst(selectedSubcategory)
    : false;
  const browseReady =
    Boolean(selectedSubcategory) &&
    isBrowsePathComplete(selectedSubcategory, selectedPosition, selectedOperation);

  const browseStep = useMemo((): BrowseStep => {
    if (searchActive) return "jobs";
    if (!selectedCategory) return "category";
    if (!selectedSubcategory) return "subcategory";
    const next = nextBrowseStep(selectedSubcategory, selectedPosition, selectedOperation);
    if (next === "position") return "position";
    if (next === "operation") return "operation";
    return "jobs";
  }, [
    searchActive,
    selectedCategory,
    selectedSubcategory,
    selectedPosition,
    selectedOperation,
  ]);

  const breadcrumbParts = useMemo(() => {
    if (searchActive) return ["Search", q.trim()];
    if (selectedSubcategory) {
      return browseBreadcrumbParts(selectedSubcategory, selectedPosition, selectedOperation);
    }
    if (selectedCategory) {
      const cat = laborCategoryById(selectedCategory);
      return cat ? [cat.label] : [];
    }
    return [];
  }, [searchActive, q, selectedCategory, selectedSubcategory, selectedPosition, selectedOperation]);

  const contextJobs = useMemo(() => {
    if (searchActive) return filterCannedJobsByQuery(jobs, q);
    if (!browseReady || !selectedSubcategory) return [];
    return filterCannedJobsForBrowse(jobs, selectedSubcategory, selectedPosition, selectedOperation);
  }, [searchActive, q, jobs, browseReady, selectedSubcategory, selectedPosition, selectedOperation]);

  useEffect(() => {
    if (!open) return;
    setQ(initialQuery);
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedId(null);
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setError(null);
  }, [open, initialQuery]);

  useEffect(() => {
    if (browseStep !== "jobs") {
      setSelectedId(null);
      setPreview(null);
      return;
    }
    if (contextJobs.length === 0) {
      setSelectedId(null);
      setPreview(null);
      return;
    }
    setSelectedId((current) => {
      if (current && contextJobs.some((j) => j.id === current)) return current;
      return contextJobs[0]!.id;
    });
  }, [browseStep, contextJobs]);

  useEffect(() => {
    if (!selectedId || !open || browseStep !== "jobs") {
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    const cached = detailCache.current.get(selectedId);
    if (cached) {
      setPreview(cached);
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    const gen = ++fetchGen.current;
    setPreviewLoading(true);
    setPreviewError(null);

    fetchCannedJobDetail(selectedId)
      .then((res) => {
        if (gen !== fetchGen.current) return;
        if (res.ok) {
          detailCache.current.set(selectedId, res.job);
          setPreview(res.job);
          setPreviewError(null);
        } else {
          setPreview(null);
          setPreviewError(res.error);
        }
      })
      .catch(() => {
        if (gen !== fetchGen.current) return;
        setPreview(null);
        setPreviewError("Could not load job details. Try again.");
      })
      .finally(() => {
        if (gen !== fetchGen.current) return;
        setPreviewLoading(false);
      });
  }, [selectedId, open, browseStep]);

  const selectedSummary = contextJobs.find((j) => j.id === selectedId) ?? null;

  const previewTotals = useMemo(() => {
    if (preview) {
      return estimateCannedJobTotal(preview, baseRateCents, partTiers, laborTiers);
    }
    if (selectedSummary) {
      return estimateCannedJobSummaryTotal(selectedSummary, baseRateCents, partTiers, laborTiers);
    }
    return null;
  }, [preview, selectedSummary, baseRateCents, partTiers, laborTiers]);

  const addSelected = useCallback(() => {
    if (!selectedId || pending) return;
    const name = selectedSummary?.name ?? "Canned job";
    setError(null);
    start(async () => {
      const res = await addCannedJobToRepairOrder(roId, selectedId);
      if (res.ok) {
        toast("success", `Added "${name}" to estimate`);
        onOpenChange(false);
        router.refresh();
      } else {
        setError(res.error);
        toast("error", res.error);
      }
    });
  }, [selectedId, pending, selectedSummary, roId, toast, onOpenChange, router]);

  const addJobById = useCallback(
    (job: CannedJobSummary) => {
      if (pending) return;
      setError(null);
      start(async () => {
        const res = await addCannedJobToRepairOrder(roId, job.id);
        if (res.ok) {
          toast("success", `Added "${job.name}" to estimate`);
          onOpenChange(false);
          router.refresh();
        } else {
          setError(res.error);
          toast("error", res.error);
        }
      });
    },
    [pending, roId, toast, onOpenChange, router],
  );

  function resetBrowse() {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedId(null);
    setPreview(null);
    setQ("");
  }

  function selectCategory(categoryId: string) {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedId(null);
    setQ("");
  }

  function selectSubcategory(subcategoryId: string) {
    const found = laborSubcategoryById(subcategoryId);
    if (found) setSelectedCategory(found.category.id);
    setSelectedSubcategory(subcategoryId);
    setSelectedPosition(null);
    setSelectedOperation(null);
    setSelectedId(null);
    setQ("");

    if (shouldLoadOnSubcategorySelect(subcategoryId)) return;

    const implicitPos = implicitBrowsePositionId(subcategoryId);
    if (implicitPos) setSelectedPosition(implicitPos);
  }

  function selectPosition(positionId: string) {
    setSelectedPosition(positionId);
    setSelectedId(null);
  }

  function selectOperation(operationId: string) {
    setSelectedOperation(operationId);
    setSelectedId(null);
    if (selectedSubcategory && subcategoryUsesOperationFirst(selectedSubcategory)) {
      setSelectedPosition(null);
    }
  }

  function goToBreadcrumb(index: number) {
    if (searchActive) {
      if (index === 0) setQ("");
      return;
    }
    if (index < 0) {
      resetBrowse();
      return;
    }
    const parts = breadcrumbParts;
    if (index >= parts.length) return;

    if (index === 0) {
      setSelectedSubcategory(null);
      setSelectedPosition(null);
      setSelectedOperation(null);
      return;
    }
    if (index === 1) {
      setSelectedPosition(null);
      setSelectedOperation(null);
      return;
    }
    if (index === 2) {
      if (browseOpFirst) setSelectedPosition(null);
      else setSelectedOperation(null);
      return;
    }
    if (index === 3) setSelectedOperation(null);
  }

  function renderNavList(): ReactNode {
    if (browseStep === "category") {
      return (
        <ul className="divide-y divide-border">
          {LABOR_CATEGORY_TREE.map((cat) => (
            <li key={cat.id}>
              <NavRow label={cat.label} onClick={() => selectCategory(cat.id)} />
            </li>
          ))}
        </ul>
      );
    }

    if (browseStep === "subcategory") {
      const cat = selectedCategory ? laborCategoryById(selectedCategory) : null;
      if (!cat) return null;
      return (
        <ul className="divide-y divide-border">
          {cat.subcategories.map((sub) => (
            <li key={sub.id}>
              <NavRow label={sub.label} onClick={() => selectSubcategory(sub.id)} />
            </li>
          ))}
        </ul>
      );
    }

    if (browseStep === "position" && selectedSubcategory) {
      return (
        <ul className="divide-y divide-border">
          {positionFacetsForSubcategory(selectedSubcategory).map((pos) => (
            <li key={pos.id}>
              <NavRow label={pos.label} onClick={() => selectPosition(pos.id)} />
            </li>
          ))}
        </ul>
      );
    }

    if (browseStep === "operation" && selectedSubcategory) {
      return (
        <ul className="divide-y divide-border">
          {operationFacetsForSubcategory(selectedSubcategory).map((op) => (
            <li key={op.id}>
              <NavRow label={op.label} onClick={() => selectOperation(op.id)} />
            </li>
          ))}
        </ul>
      );
    }

    if (browseStep === "jobs") {
      if (contextJobs.length === 0) {
        return (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            {searchActive
              ? "No canned jobs match your search."
              : "No shop templates in this category yet — try another path or create one in Settings."}
          </div>
        );
      }

      return (
        <ul className="divide-y divide-border" role="listbox" aria-label="Canned jobs">
          {contextJobs.map((j) => {
            const est = estimateCannedJobSummaryTotal(j, baseRateCents, partTiers, laborTiers);
            const active = j.id === selectedId;
            return (
              <li key={j.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5",
                    active ? "bg-brand-light/15 ring-1 ring-inset ring-brand-navy/25" : "hover:bg-muted/50",
                  )}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => setSelectedId(j.id)}
                    onDoubleClick={() => addJobById(j)}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    <span className="block truncate text-sm font-medium text-foreground">{j.name}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {j.laborHours.toFixed(1)}h · ~{formatCents(est.totalCents)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 shrink-0 gap-1 border-brand-navy/30 px-2 text-xs text-brand-navy"
                    disabled={pending}
                    onClick={() => addJobById(j)}
                  >
                    {pending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Add
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      );
    }

    return null;
  }

  const stepTitle =
    browseStep === "category"
      ? "System"
      : browseStep === "subcategory"
        ? "Component"
        : browseStep === "position"
          ? "Position"
          : browseStep === "operation"
            ? "Operation"
            : searchActive
              ? "Search results"
              : "Templates";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(720px,calc(100vh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <div className="shrink-0 border-b px-5 py-3.5">
          <DialogTitle className="text-lg font-semibold text-brand-navy">Browse job templates</DialogTitle>
          <DialogDescription>Drill down by system · explicit Add only</DialogDescription>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(280px,1.2fr)_minmax(260px,1fr)] md:grid-rows-1">
          <section className="flex min-h-0 min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <div className="shrink-0 space-y-2 border-b border-border p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search templates by name"
                  className="h-8 w-full pl-7 text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {breadcrumbParts.length > 0 ? (
                  <button
                    type="button"
                    onClick={resetBrowse}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-brand-navy"
                    aria-label="Back to all systems"
                  >
                    <ArrowLeft className="size-3.5" />
                  </button>
                ) : null}
                <nav
                  className="min-w-0 flex-1 truncate text-xs text-muted-foreground"
                  aria-label="Browse path"
                >
                  {breadcrumbParts.length === 0 ? (
                    <span className="font-medium text-brand-navy">All systems</span>
                  ) : (
                    breadcrumbParts.map((part, i) => (
                      <span key={`${part}-${i}`}>
                        {i > 0 ? (
                          <ChevronRight className="mx-0.5 inline size-3 text-brand-navy/50" />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => goToBreadcrumb(i)}
                          className={cn(
                            "hover:text-brand-navy",
                            i === breadcrumbParts.length - 1 && browseStep === "jobs"
                              ? "font-semibold text-brand-navy"
                              : "",
                          )}
                        >
                          {part}
                        </button>
                      </span>
                    ))
                  )}
                </nav>
              </div>

              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-navy/70">
                {stepTitle}
                {browseStep === "jobs" && contextJobs.length > 0 ? (
                  <span className="ml-1 font-normal normal-case text-muted-foreground">
                    · {contextJobs.length} template{contextJobs.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{renderNavList()}</div>
          </section>

          <section className="flex min-h-0 min-w-0 flex-col bg-muted/20">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              {browseStep !== "jobs" || !selectedSummary ? (
                <p className="text-sm text-muted-foreground">
                  {browseStep === "jobs" && searchActive && contextJobs.length === 0
                    ? "No preview — adjust search or browse by system."
                    : browseStep !== "jobs"
                      ? "Pick a path on the left — Category → Subcategory → Operation."
                      : "Select a template to preview labor and parts."}
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h4 className="font-semibold text-foreground">{selectedSummary.name}</h4>
                    {selectedSummary.category ? (
                      <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                        {selectedSummary.category}
                      </Badge>
                    ) : null}
                  </div>
                  {selectedSummary.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {selectedSummary.description}
                    </p>
                  ) : null}

                  {previewError ? (
                    <div className="mt-2 flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-xs text-destructive">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                      <span>{previewError}</span>
                    </div>
                  ) : null}

                  {(preview?.laborLines.length || selectedSummary.laborLineCount > 0) && (
                    <div className="mt-2 overflow-hidden rounded-md border border-border bg-card">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <th className="px-2 py-1 text-left font-medium">Labor</th>
                            <th className="w-12 px-2 py-1 text-right font-medium">Hrs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview?.laborLines.length ? (
                            preview.laborLines.map((l) => (
                              <tr key={l.id} className="border-b border-border/60 last:border-0">
                                <td className="px-2 py-1">{l.description}</td>
                                <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                                  {l.hours.toFixed(1)}
                                </td>
                              </tr>
                            ))
                          ) : previewLoading ? (
                            <tr>
                              <td colSpan={2} className="px-2 py-2 text-muted-foreground">
                                <Loader2 className="mr-1 inline size-3 animate-spin" />
                                Loading…
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={2} className="px-2 py-1 text-muted-foreground">
                                {selectedSummary.laborLineCount} line
                                {selectedSummary.laborLineCount === 1 ? "" : "s"} ·{" "}
                                {selectedSummary.laborHours.toFixed(1)}h
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {(preview?.partLines.length || selectedSummary.partLineCount > 0) && (
                    <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-card">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <th className="px-2 py-1 text-left font-medium">Parts</th>
                            <th className="w-10 px-2 py-1 text-right font-medium">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview?.partLines.length ? (
                            preview.partLines.map((p) => (
                              <tr key={p.id} className="border-b border-border/60 last:border-0">
                                <td className="px-2 py-1">{p.description}</td>
                                <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">
                                  ×{p.quantity}
                                </td>
                              </tr>
                            ))
                          ) : previewLoading ? (
                            <tr>
                              <td colSpan={2} className="px-2 py-2 text-muted-foreground">
                                <Loader2 className="mr-1 inline size-3 animate-spin" />
                                Loading…
                              </td>
                            </tr>
                          ) : (
                            <tr>
                              <td colSpan={2} className="px-2 py-1 text-muted-foreground">
                                {selectedSummary.partLineCount} part line
                                {selectedSummary.partLineCount === 1 ? "" : "s"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {previewTotals ? (
                    <PreviewTotalsBar
                      laborCents={previewTotals.laborCents}
                      partsCents={previewTotals.partsCents}
                      totalCents={previewTotals.totalCents}
                    />
                  ) : null}
                </>
              )}
            </div>
          </section>
        </div>
        <div className="shrink-0 border-t px-5 py-3">
          {error ? <p className="mb-1.5 text-xs text-destructive">{error}</p> : null}
          <Button
            size="sm"
            className="h-9 w-full gap-1 bg-brand-navy hover:bg-brand-navy/90"
            disabled={!selectedId || pending || browseStep !== "jobs"}
            onClick={addSelected}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            Add to estimate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
