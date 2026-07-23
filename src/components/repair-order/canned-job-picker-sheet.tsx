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
import { AlertCircle, Loader2, Plus, Search, Star, X } from "lucide-react";

import {
  CannedJobFormSummary,
  CannedJobIntakeForm,
  cannedJobFormToPayload,
  emptyCannedJobForm,
  laborRowTitle,
  type CannedJobFormState,
} from "@/components/canned-jobs/canned-job-form";
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
import { CANNED_JOB_CATEGORIES } from "@/lib/canned-job-schemas";
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
  saveCannedJob,
} from "@/server/actions/canned-jobs";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";

type PickerMode = "browse" | "create";

function defaultCreateForm(): CannedJobFormState {
  return {
    ...emptyCannedJobForm(),
    labor: [{ name: "", description: "", hours: 0, flatAmountCents: null }],
  };
}

function validateCreateForm(form: CannedJobFormState): string | null {
  if (!form.name.trim()) return "Job name is required.";
  if (!form.labor.some((l) => laborRowTitle(l))) return "Add at least one labor line.";
  return null;
}

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
        "flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors",
        active
          ? "bg-brand-navy text-white shadow-sm"
          : "text-muted-foreground hover:text-foreground",
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
        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap transition-colors",
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-border bg-background text-muted-foreground hover:border-brand-navy/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
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
    <p className="mt-2 text-xs tabular-nums text-muted-foreground">
      Labor {formatCents(laborCents)} · Parts {formatCents(partsCents)} ·{" "}
      <span className="font-semibold text-brand-navy">Total {formatCents(totalCents)}</span>
    </p>
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
  const [localJobs, setLocalJobs] = useState(jobs);
  const [q, setQ] = useState(initialQuery);
  const [debouncedQ, setDebouncedQ] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CannedJobDetail | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [createPending, startCreate] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CannedJobFormState>(defaultCreateForm);
  const [createError, setCreateError] = useState<string | null>(null);
  const detailCache = useRef(new Map<string, CannedJobDetail>());
  const fetchGen = useRef(0);
  const openedAtRef = useRef(0);

  const busy = pending || createPending;

  const filterCategories = useMemo(
    () => [...new Set([...categories, ...CANNED_JOB_CATEGORIES])].sort(),
    [categories],
  );

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    setLocalJobs(jobs);
    setMode("browse");
    setQ(initialQuery);
    setDebouncedQ(initialQuery);
    setCategory("");
    setSelectedId(null);
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setError(null);
    setCreateForm(defaultCreateForm());
    setCreateError(null);
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

  const selectCreatedJob = useCallback((id: string, name: string) => {
    setMode("browse");
    setQ("");
    setDebouncedQ("");
    setCategory("");
    setSelectedId(id);
    setCreateForm(defaultCreateForm());
    toast("success", `Created "${name}" — select Add to estimate when ready`);
  }, [toast]);

  const saveCreate = useCallback(
    (andAdd: boolean) => {
      if (createPending) return;
      const validationError = validateCreateForm(createForm);
      if (validationError) {
        setCreateError(validationError);
        toast("error", validationError);
        return;
      }
      setCreateError(null);
      const payload = cannedJobFormToPayload(createForm);
      const jobName = createForm.name.trim();

      startCreate(async () => {
        const res = await saveCannedJob(payload);
        if (!res.ok) {
          setCreateError(res.error);
          toast("error", res.error);
          return;
        }

        const newId = res.id!;
        detailCache.current.delete(newId);
        await refreshJobs();

        if (andAdd) {
          const addRes = await addCannedJobToRepairOrder(roId, newId);
          if (addRes.ok) {
            toast("success", `Created and added "${jobName}" to estimate`);
            onOpenChange(false);
            router.refresh();
          } else {
            setCreateError(addRes.error);
            toast("error", addRes.error);
            selectCreatedJob(newId, jobName);
          }
        } else {
          selectCreatedJob(newId, jobName);
          router.refresh();
        }
      });
    },
    [createPending, createForm, toast, refreshJobs, selectCreatedJob, roId, onOpenChange, router],
  );

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
    if (!selectedId || busy) return;
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
  }, [selectedId, busy, selectedSummary, roId, toast, onOpenChange, router]);

  useEffect(() => {
    if (!open || mode !== "browse") return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.defaultPrevented || !selectedId || busy) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      // Ignore Enter that opened the dialog from the toolbar (same keystroke bubbles to window).
      if (Date.now() - openedAtRef.current < 400) return;
      e.preventDefault();
      addSelected();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, selectedId, busy, addSelected]);

  const createValid = validateCreateForm(createForm) === null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex h-[min(85vh,calc(100dvh-1.5rem))] w-[min(62rem,calc(100vw-1.5rem))] max-w-none flex-col gap-0 overflow-hidden p-0",
          "sm:max-w-none",
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-brand-navy/10 bg-brand-navy px-3 py-2 text-white">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Star className="size-4 shrink-0 text-brand-light" aria-hidden />
            <DialogTitle className="shrink-0 text-sm font-semibold text-white">
              Add canned job
            </DialogTitle>
            <span className="hidden h-3 w-px shrink-0 bg-white/25 sm:block" aria-hidden />
            <DialogDescription className="truncate text-xs text-white/70">
              {mode === "browse"
                ? "Pick a template · click Add to estimate"
                : "Build a template — save to library or add straight to estimate"}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-white hover:bg-white/10 hover:text-white"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </header>

        {/*
          Fixed split layout: explicit grid columns prevent overlap.
          Left = search + scrollable chips + job list.
          Right = preview + sticky CTA (always visible on md+).
        */}
        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(280px,1.2fr)_minmax(260px,1fr)] md:grid-rows-1">
          {/* —— Left: library —— */}
          <section className="flex min-h-0 min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
            <div className="shrink-0 space-y-2 border-b border-border p-3">
              <div className="flex rounded-lg border border-brand-navy/20 bg-muted/50 p-0.5">
                <ModeTab active={mode === "browse"} onClick={() => setMode("browse")}>
                  Browse
                </ModeTab>
                <ModeTab active={mode === "create"} onClick={() => setMode("create")}>
                  Create new
                </ModeTab>
              </div>

              {mode === "browse" ? (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute top-2 left-2 size-3.5 text-muted-foreground" />
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search by name or category"
                      className="h-8 w-full pl-7 text-sm"
                      autoFocus
                    />
                  </div>

                  {filterCategories.length > 0 ? (
                    <div className="min-w-0">
                      <div className="scrollbar-thin overflow-x-auto overscroll-x-contain">
                        <div className="flex w-max min-w-full flex-nowrap gap-1 pb-px">
                          <CategoryChip active={!category} onClick={() => setCategory("")}>
                            All
                          </CategoryChip>
                          {filterCategories.map((c) => (
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
                    {filtered.length} template{filtered.length === 1 ? "" : "s"}
                    {debouncedQ.trim() ? ` · “${debouncedQ.trim()}”` : ""}
                  </p>
                </>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {mode === "create" ? (
                <div className="p-3">
                  <CannedJobIntakeForm
                    form={createForm}
                    setForm={setCreateForm}
                    categories={filterCategories}
                    idPrefix="picker-cj"
                    showQuickTemplates={false}
                    laborRateCents={baseRateCents}
                    hideInlineSummary
                    compact
                  />
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {localJobs.length === 0
                      ? "No canned job templates yet."
                      : "No canned jobs match your search."}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 gap-1 border-brand-navy/30 text-xs text-brand-navy"
                    onClick={() => setMode("create")}
                  >
                    <Plus className="size-3.5" />
                    Create new template
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border" role="listbox" aria-label="Canned jobs">
                  {filtered.map((j) => {
                    const est = estimateCannedJobSummaryTotal(j, baseRateCents, partTiers, laborTiers);
                    const active = j.id === selectedId;
                    return (
                      <li key={j.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => setSelectedId(j.id)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                            active
                              ? "bg-brand-light/15 ring-1 ring-inset ring-brand-navy/25"
                              : "hover:bg-muted/50",
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                            {j.name}
                          </span>
                          {j.category ? (
                            <Badge
                              variant="outline"
                              className="hidden shrink-0 px-1.5 py-0 text-[10px] font-normal sm:inline-flex"
                            >
                              {j.category}
                            </Badge>
                          ) : null}
                          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            {j.laborHours.toFixed(1)}h · ~{formatCents(est.totalCents)}
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
          <section className="flex min-h-0 min-w-0 flex-col bg-muted/20">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
              {mode === "create" ? (
                <CannedJobFormSummary
                  form={createForm}
                  laborRateCents={baseRateCents}
                  compact
                />
              ) : !selectedSummary ? (
                <p className="text-sm text-muted-foreground">Select a canned job to preview.</p>
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
                                <td className="px-2 py-1" title={l.description}>
                                  <span className="line-clamp-2 break-words">{l.description}</span>
                                </td>
                                <td className="shrink-0 px-2 py-1 text-right tabular-nums text-muted-foreground">
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
                                <td className="px-2 py-1" title={p.description}>
                                  <span className="line-clamp-2 break-words">{p.description}</span>
                                </td>
                                <td className="shrink-0 px-2 py-1 text-right tabular-nums text-muted-foreground">
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

            <div className="shrink-0 border-t border-border bg-background px-3 py-2">
              {mode === "create" ? (
                <>
                  {createError ? (
                    <p className="mb-1.5 text-xs text-destructive">{createError}</p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 flex-1 border-brand-navy/30 text-xs text-brand-navy"
                      disabled={!createValid || createPending}
                      onClick={() => saveCreate(false)}
                    >
                      {createPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Save to library"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 flex-1 gap-1 bg-brand-navy text-xs hover:bg-brand-navy/90"
                      disabled={!createValid || createPending}
                      onClick={() => saveCreate(true)}
                    >
                      {createPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="size-3.5" />
                          Save &amp; add
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {error ? <p className="mb-1.5 text-xs text-destructive">{error}</p> : null}
                  <Button
                    size="sm"
                    className="h-8 w-full gap-1"
                    disabled={!selectedId || busy}
                    onClick={addSelected}
                  >
                    {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    Add to estimate
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
