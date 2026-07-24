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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus, Search, Star, X } from "lucide-react";

import { CannedJobFormSheet } from "@/components/canned-jobs/canned-job-form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/format";
import {
  estimateCannedJobSummaryTotal,
  estimateCannedJobTotal,
} from "@/lib/canned-job-estimate";
import type { CannedJobDetail, CannedJobSummary } from "@/lib/canned-job-types";
import type { LaborTier, PartTier } from "@/lib/matrix";
import {
  addCannedJobToRepairOrder,
  fetchCannedJobDetail,
  fetchCannedJobsForPicker,
} from "@/server/actions/canned-jobs";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";

/** Categories present on the shop catalog (same CannedJob rows as /canned-jobs). */
function categoriesFromJobs(jobs: CannedJobSummary[], extra: string[] = []): string[] {
  const fromJobs = jobs.map((j) => j.category).filter((c): c is string => Boolean(c?.trim()));
  return [...new Set([...extra, ...fromJobs])].sort((a, b) => a.localeCompare(b));
}

type PickerMode = "browse" | "create";

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-1 pb-2 text-sm font-medium transition-colors",
        active
          ? "font-semibold text-brand-navy after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-orange"
          : "text-muted-foreground hover:text-brand-navy",
      )}
    >
      {children}
    </button>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors",
        active
          ? "bg-brand-navy/[0.08] text-brand-navy"
          : "text-muted-foreground hover:bg-brand-navy/[0.04] hover:text-brand-navy",
      )}
    >
      {children}
    </button>
  );
}

/** Quiet section label — Profile/Vehicles flat rhythm. */
function PreviewSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
      {children}
    </p>
  );
}

/** Inline totals row for browse preview. */
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
    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-[#eaecf0] pt-3 text-xs tabular-nums text-muted-foreground">
      <span>Labor {formatCents(laborCents)}</span>
      <span className="text-border">·</span>
      <span>Parts {formatCents(partsCents)}</span>
      <span className="text-border">·</span>
      <span className="font-semibold text-brand-navy">Total {formatCents(totalCents)}</span>
    </div>
  );
}

/** Wide split-panel picker — list left, preview right; stacks on small screens. */
export function CannedJobPickerSheet({
  open,
  onOpenChange,
  roId,
  jobs,
  categories,
  baseRateCents,
  partTiers,
  laborTiers,
  initialQuery = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roId: string;
  jobs: CannedJobSummary[];
  categories: string[];
  baseRateCents: number;
  partTiers: PartTier[];
  laborTiers: LaborTier[];
  initialQuery?: string;
}) {
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [mode, setMode] = useState<PickerMode>("browse");
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [localJobs, setLocalJobs] = useState(jobs);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [q, setQ] = useState(initialQuery);
  const [debouncedQ, setDebouncedQ] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CannedJobDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const detailCache = useRef(new Map<string, CannedJobDetail>());
  const fetchGen = useRef(0);
  const listFetchGen = useRef(0);
  const openedAtRef = useRef(0);

  /** Browse chips = categories on live shop templates (not empty preset chips). */
  const browseCategories = useMemo(
    () => categoriesFromJobs(localJobs, categories),
    [localJobs, categories],
  );

  const openCreateSheet = useCallback(() => {
    setMode("create");
    setCreateSheetOpen(true);
  }, []);

  const closeCreateSheet = useCallback(() => {
    setCreateSheetOpen(false);
    setMode("browse");
  }, []);

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    // Paint SSR snapshot immediately, then refresh from the same shop catalog as /canned-jobs.
    setLocalJobs(jobs);
    setListError(null);
    setMode("browse");
    setCreateSheetOpen(false);
    setQ(initialQuery);
    setDebouncedQ(initialQuery);
    setCategory("");
    setSelectedId(null);
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setError(null);

    const gen = ++listFetchGen.current;
    setListLoading(true);
    fetchCannedJobsForPicker()
      .then((updated) => {
        if (gen !== listFetchGen.current) return;
        setLocalJobs(updated);
      })
      .catch(() => {
        if (gen !== listFetchGen.current) return;
        setListError("Could not refresh canned jobs. Showing last loaded list.");
      })
      .finally(() => {
        if (gen !== listFetchGen.current) return;
        setListLoading(false);
      });
  }, [open, initialQuery, jobs]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 250);
    return () => clearTimeout(id);
  }, [q]);

  const filtered = useMemo(() => {
    const needle = debouncedQ.trim().toLowerCase();
    return localJobs.filter((j) => {
      if (category && j.category !== category) return false;
      if (!needle) return true;
      return (
        j.name.toLowerCase().includes(needle) ||
        (j.category?.toLowerCase().includes(needle) ?? false) ||
        (j.description?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [localJobs, debouncedQ, category]);

  useEffect(() => {
    if (!open || mode !== "browse") return;
    if (filtered.length === 0) {
      setSelectedId(null);
      setPreview(null);
      return;
    }
    setSelectedId((current) => {
      if (current && filtered.some((j) => j.id === current)) return current;
      return filtered[0]!.id;
    });
  }, [open, filtered, mode]);

  useEffect(() => {
    if (!selectedId || !open || mode !== "browse") {
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
  }, [selectedId, open, mode]);

  const selectedSummary = filtered.find((j) => j.id === selectedId) ?? null;

  const refreshJobs = useCallback(async () => {
    const updated = await fetchCannedJobsForPicker();
    setLocalJobs(updated);
    return updated;
  }, []);

  /** After Save (template only): refresh catalog, select new job, stay on Browse. */
  const handleCreateSaved = useCallback(
    (id?: string) => {
      void (async () => {
        await refreshJobs();
        setMode("browse");
        setCreateSheetOpen(false);
        setQ("");
        setDebouncedQ("");
        setCategory("");
        if (id) {
          detailCache.current.delete(id);
          setSelectedId(id);
        }
        router.refresh();
      })();
    },
    [refreshJobs, router],
  );

  const handleAddedToEstimate = useCallback(() => {
    setCreateSheetOpen(false);
    setMode("browse");
    onOpenChange(false);
    router.refresh();
  }, [onOpenChange, router]);

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

  useEffect(() => {
    if (!open || mode !== "browse") return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.defaultPrevented || !selectedId || pending) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      // Ignore Enter that opened the dialog from the toolbar (same keystroke bubbles to window).
      if (Date.now() - openedAtRef.current < 400) return;
      e.preventDefault();
      addSelected();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, selectedId, pending, addSelected]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          className={cn(
            "flex h-[min(85vh,calc(100dvh-1.5rem))] w-[min(62rem,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0",
            "sm:max-w-none",
          )}
        >
          {/* Clean title header — matches customer drawer / job launcher */}
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#eaecf0] bg-white px-5 py-4 pr-4">
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <Star className="size-4 shrink-0 text-brand-orange" aria-hidden />
                <DialogTitle className="text-base font-semibold text-brand-navy">
                  Add canned job
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                {mode === "browse"
                  ? "Shop catalog · pick a template for this estimate"
                  : "Same builder as Settings → Canned Jobs"}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 shrink-0 text-muted-foreground hover:bg-brand-navy/[0.04] hover:text-brand-navy"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </header>

          {/*
            Fixed split layout: explicit grid columns prevent overlap.
            Left = search + chips + job list.
            Right = preview + sticky CTA.
          */}
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(280px,1.15fr)_minmax(280px,1fr)] md:grid-rows-1">
            {/* —— Left: library —— */}
            <section className="flex min-h-0 min-w-0 flex-col border-b border-[#eaecf0] bg-white md:border-b-0 md:border-r">
              <div className="shrink-0 space-y-3 px-4 pt-4 pb-3">
                <div className="flex gap-4 border-b border-[#eaecf0]">
                  <ModeTab
                    active={mode === "browse"}
                    onClick={() => {
                      setMode("browse");
                      setCreateSheetOpen(false);
                    }}
                  >
                    Browse
                  </ModeTab>
                  <ModeTab active={mode === "create"} onClick={openCreateSheet}>
                    Create new
                  </ModeTab>
                </div>

                {mode === "browse" ? (
                  <>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search by name or category"
                        className="h-9 w-full border-[#d0d5dd] bg-white pl-8 text-sm shadow-none focus-visible:border-brand-navy/40 focus-visible:ring-brand-navy/15"
                        autoFocus
                      />
                    </div>

                    {browseCategories.length > 0 ? (
                      <div className="min-w-0">
                        <div className="scrollbar-thin overflow-x-auto overscroll-x-contain">
                          <div className="flex w-max min-w-full flex-nowrap gap-0.5">
                            <CategoryChip active={!category} onClick={() => setCategory("")}>
                              All
                            </CategoryChip>
                            {browseCategories.map((c) => (
                              <CategoryChip
                                key={c}
                                active={category === c}
                                onClick={() => setCategory(category === c ? "" : c)}
                              >
                                {c}
                              </CategoryChip>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <p className="text-[11px] text-muted-foreground">
                      {listLoading ? "Refreshing shop catalog…" : null}
                      {!listLoading ? (
                        <>
                          {filtered.length} template{filtered.length === 1 ? "" : "s"}
                          {debouncedQ.trim() ? ` · “${debouncedQ.trim()}”` : ""}
                        </>
                      ) : null}
                      {listError ? (
                        <span className="mt-0.5 block text-amber-700">{listError}</span>
                      ) : null}
                    </p>
                  </>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {mode === "create" ? (
                  <div className="flex flex-col items-center px-6 py-10 text-center">
                    <span className="mb-3 flex size-10 items-center justify-center rounded-md bg-brand-navy/[0.06]">
                      <Plus className="size-5 text-brand-navy" aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-brand-navy">
                      {createSheetOpen ? "Building template…" : "Create a canned job"}
                    </p>
                    <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
                      Uses the same New canned job builder as Settings → Canned Jobs — lines,
                      categories, and save actions.
                    </p>
                    {!createSheetOpen ? (
                      <Button
                        size="sm"
                        className="mt-4 h-8 gap-1 bg-brand-navy text-xs font-semibold hover:bg-brand-navy/90"
                        onClick={openCreateSheet}
                      >
                        <Plus className="size-3.5" />
                        Open builder
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-8 text-xs text-muted-foreground"
                      onClick={closeCreateSheet}
                    >
                      Back to browse
                    </Button>
                  </div>
                ) : listLoading && localJobs.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-brand-navy" aria-hidden />
                    Loading shop canned jobs…
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center">
                    <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-md bg-brand-navy/[0.06]">
                      <Star className="size-5 text-muted-foreground" aria-hidden />
                    </span>
                    <p className="text-sm font-medium text-brand-navy">
                      {localJobs.length === 0
                        ? "No canned job templates yet"
                        : "No matches"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {localJobs.length === 0
                        ? "Create a template for this shop, or manage the full catalog."
                        : "Try another search or category."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1 border-brand-navy/25 text-xs font-semibold text-brand-navy hover:bg-brand-navy/[0.04]"
                        onClick={openCreateSheet}
                      >
                        <Plus className="size-3.5" />
                        Create new template
                      </Button>
                      {localJobs.length === 0 ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-brand-navy"
                          asChild
                        >
                          <Link href="/canned-jobs">Manage catalog</Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <ul className="px-2 pb-2" role="listbox" aria-label="Canned jobs">
                    {filtered.map((j) => {
                      const est = estimateCannedJobSummaryTotal(
                        j,
                        baseRateCents,
                        partTiers,
                        laborTiers,
                      );
                      const active = j.id === selectedId;
                      return (
                        <li key={j.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={active}
                            onClick={() => setSelectedId(j.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                              active
                                ? "bg-brand-navy/[0.06] text-brand-navy"
                                : "text-foreground hover:bg-brand-navy/[0.03]",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span
                                className={cn(
                                  "block truncate text-sm",
                                  active ? "font-semibold" : "font-medium",
                                )}
                              >
                                {j.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                                {j.category ? `${j.category} · ` : ""}
                                {j.laborHours.toFixed(1)}h · ~{formatCents(est.totalCents)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* —— Right: preview —— */}
            <section className="flex min-h-0 min-w-0 flex-col bg-brand-navy/[0.02]">
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                {mode === "create" ? (
                  <div className="space-y-2 pt-1">
                    <h4 className="text-sm font-semibold text-brand-navy">Full catalog builder</h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Labor, parts, fees, discounts, category colors, and shop labor pickers match
                      Settings → Canned Jobs. Save to refresh this list, or Save &amp; add to put it
                      on this estimate immediately.
                    </p>
                  </div>
                ) : !selectedSummary ? (
                  <p className="pt-2 text-sm text-muted-foreground">
                    Select a canned job to preview.
                  </p>
                ) : (
                  <>
                    <div className="space-y-1">
                      <h4 className="text-base font-semibold text-brand-navy">
                        {selectedSummary.name}
                      </h4>
                      {selectedSummary.category ? (
                        <p className="text-xs text-muted-foreground">{selectedSummary.category}</p>
                      ) : null}
                      {selectedSummary.description ? (
                        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {selectedSummary.description}
                        </p>
                      ) : null}
                    </div>

                    {previewError ? (
                      <div className="mt-4 flex items-start gap-1.5 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        <span>{previewError}</span>
                      </div>
                    ) : null}

                    {(preview?.laborLines.length || selectedSummary.laborLineCount > 0) && (
                      <div className="mt-5">
                        <PreviewSectionLabel>Labor</PreviewSectionLabel>
                        <ul className="divide-y divide-[#eaecf0]">
                          {preview?.laborLines.length ? (
                            preview.laborLines.map((l) => (
                              <li
                                key={l.id}
                                className="flex items-start justify-between gap-3 py-2 text-sm"
                                title={l.description}
                              >
                                <span className="min-w-0 line-clamp-2 break-words text-foreground">
                                  {l.description}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  {l.hours.toFixed(1)}h
                                </span>
                              </li>
                            ))
                          ) : previewLoading ? (
                            <li className="flex items-center gap-1.5 py-2 text-sm text-muted-foreground">
                              <Loader2 className="size-3 animate-spin" />
                              Loading…
                            </li>
                          ) : (
                            <li className="py-2 text-sm text-muted-foreground">
                              {selectedSummary.laborLineCount} line
                              {selectedSummary.laborLineCount === 1 ? "" : "s"} ·{" "}
                              {selectedSummary.laborHours.toFixed(1)}h
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {(preview?.partLines.length || selectedSummary.partLineCount > 0) && (
                      <div className="mt-5">
                        <PreviewSectionLabel>Parts</PreviewSectionLabel>
                        <ul className="divide-y divide-[#eaecf0]">
                          {preview?.partLines.length ? (
                            preview.partLines.map((p) => (
                              <li
                                key={p.id}
                                className="flex items-start justify-between gap-3 py-2 text-sm"
                                title={p.description}
                              >
                                <span className="min-w-0 line-clamp-2 break-words text-foreground">
                                  {p.description}
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                  ×{p.quantity}
                                </span>
                              </li>
                            ))
                          ) : previewLoading ? (
                            <li className="flex items-center gap-1.5 py-2 text-sm text-muted-foreground">
                              <Loader2 className="size-3 animate-spin" />
                              Loading…
                            </li>
                          ) : (
                            <li className="py-2 text-sm text-muted-foreground">
                              {selectedSummary.partLineCount} part line
                              {selectedSummary.partLineCount === 1 ? "" : "s"}
                            </li>
                          )}
                        </ul>
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

              <div className="shrink-0 border-t border-[#eaecf0] bg-white px-5 py-3.5">
                {mode === "create" ? (
                  <Button
                    size="sm"
                    className="h-9 w-full gap-1.5 bg-brand-navy text-sm font-semibold text-white hover:bg-brand-navy/90"
                    onClick={openCreateSheet}
                  >
                    <Plus className="size-3.5" />
                    {createSheetOpen ? "Builder open" : "Open canned job builder"}
                  </Button>
                ) : (
                  <>
                    {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
                    <Button
                      size="sm"
                      className="h-9 w-full gap-1.5 bg-brand-orange text-sm font-semibold text-white hover:bg-brand-orange/90"
                      disabled={!selectedId || pending}
                      onClick={addSelected}
                    >
                      {pending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Plus className="size-3.5" />
                      )}
                      Add to estimate
                    </Button>
                  </>
                )}
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Canonical Settings create/edit surface — same component as /canned-jobs manager */}
      <CannedJobFormSheet
        open={createSheetOpen}
        onOpenChange={(next) => {
          if (!next) closeCreateSheet();
          else setCreateSheetOpen(true);
        }}
        job={null}
        categories={browseCategories}
        laborRateCents={baseRateCents}
        defaultRepairOrderId={roId}
        onSaved={handleCreateSaved}
        onAddedToRepairOrder={handleAddedToEstimate}
      />
    </>
  );
}
