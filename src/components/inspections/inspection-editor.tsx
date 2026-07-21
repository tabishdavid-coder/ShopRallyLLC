"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Loader2,
  StickyNote,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  groupInspectionItems,
  INSPECTION_ITEM_STATUS,
  INSPECTION_STATUS,
  INSPECTION_STATUS_DOT,
  inspectionProgress,
} from "@/lib/inspection";
import { InspectionWorkflowBadge } from "@/components/inspections/inspection-badges";
import { InspectionStatusToggle } from "@/components/inspections/inspection-status-toggle";
import { ShareInspectionDialog } from "@/components/inspections/share-inspection-dialog";
import { AddInspectionDialog } from "@/components/inspections/add-inspection-dialog";
import {
  completeInspection,
  updateInspectionItem,
} from "@/server/actions/inspections";
import type { InspectionDetail } from "@/server/inspections";
import type { InspectionItemStatus, InspectionStatus } from "@/generated/prisma";

type ItemState = {
  id: string;
  name: string;
  category: string | null;
  status: InspectionItemStatus;
  note: string | null;
  sortOrder: number;
};

function estimateInspectionsHref(roId: string) {
  return `/repair-orders/${roId}/estimate?tab=inspections`;
}

function CategoryProgressBar({
  rated,
  total,
  className,
}: {
  rated: number;
  total: number;
  className?: string;
}) {
  const pct = total === 0 ? 0 : Math.round((rated / total) * 100);
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-slate-200/90", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-brand-navy transition-[width] duration-300 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function InspectionEditor({
  roId,
  roNumber,
  customerFirstName,
  customerName,
  shopName,
  phones,
  email,
  inspections,
}: {
  roId: string;
  roNumber: number;
  customerFirstName: string;
  customerName?: string;
  shopName: string;
  phones: { label: string; value: string }[];
  email: string | null;
  inspections: InspectionDetail[];
}) {
  const router = useRouter();
  const exitHref = estimateInspectionsHref(roId);
  const [activeId, setActiveId] = useState(inspections[0]?.id ?? "");
  const [items, setItems] = useState<ItemState[]>(() =>
    inspections[0]?.items.map((i) => ({ ...i })) ?? [],
  );
  const [status, setStatus] = useState<InspectionStatus>(
    inspections[0]?.status ?? INSPECTION_STATUS.NOT_STARTED,
  );
  const [progress, setProgress] = useState(inspections[0]?.progress);
  const [shareOpen, setShareOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const [completing, startComplete] = useTransition();
  const [pending, startSave] = useTransition();

  const syncFromInspection = useCallback((insp: InspectionDetail) => {
    setActiveId(insp.id);
    setItems(insp.items.map((i) => ({ ...i })));
    setStatus(insp.status);
    setProgress(insp.progress);
    setError(null);
    setNotesOpen({});
  }, []);

  useEffect(() => {
    if (inspections.length === 0) return;
    const current = inspections.find((i) => i.id === activeId);
    if (!current) {
      syncFromInspection(inspections[inspections.length - 1]);
    } else {
      setItems(current.items.map((i) => ({ ...i })));
      setStatus(current.status);
      setProgress(current.progress);
    }
  }, [inspections, activeId, syncFromInspection]);

  function addInspection() {
    setAddOpen(true);
  }

  const existingTemplateNames = inspections.map((i) => i.templateName);
  const activeInspection = inspections.find((i) => i.id === activeId) ?? inspections[0];

  function saveItem(itemId: string, patch: { status?: InspectionItemStatus; note?: string }) {
    if (!activeId) return;
    setError(null);

    setItems((prev) => {
      const next = prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              ...patch,
              note: patch.note !== undefined ? patch.note || null : i.note,
            }
          : i,
      );
      setProgress(inspectionProgress(next));
      return next;
    });

    startSave(async () => {
      const res = await updateInspectionItem({
        inspectionId: activeId,
        itemId,
        ...patch,
      });
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  function markComplete() {
    if (!activeId) return;
    setError(null);
    startComplete(async () => {
      const res = await completeInspection(activeId);
      if (res.ok) {
        setStatus(INSPECTION_STATUS.COMPLETED);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const groups = useMemo(() => groupInspectionItems(items), [items]);
  const canComplete =
    status !== INSPECTION_STATUS.COMPLETED &&
    items.length > 0 &&
    items.every((i) => i.status !== INSPECTION_ITEM_STATUS.NA);
  const rated = progress?.rated ?? 0;
  const total = progress?.total ?? 0;
  const percent = progress?.percent ?? 0;

  if (inspections.length === 0) {
    return (
      <>
        <div className="rounded-xl border border-dashed border-brand-navy/20 bg-gradient-to-b from-brand-light/10 to-card p-10 text-center sm:p-12">
          <ClipboardList className="mx-auto size-10 text-brand-navy/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            Diagnose vehicle issues with a digital multi-point inspection checklist.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" asChild>
              <Link href={exitHref}>
                <ArrowLeft className="size-4" />
                Back to estimate
              </Link>
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={addInspection}
            >
              Add New Inspection
            </Button>
          </div>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <AddInspectionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          roId={roId}
          existingTemplateNames={[]}
        />
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex h-full min-h-0 flex-col">
      {/* Performer chrome — exit + progress always visible */}
      <div className="shrink-0 border-b border-brand-navy/10 bg-background px-1 pb-3 pt-1 shadow-[0_8px_24px_-16px_rgba(22,88,142,0.45)] sm:px-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 border-brand-navy/20 bg-card font-medium text-brand-navy hover:bg-brand-light/15"
            asChild
          >
            <Link href={exitHref}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {canComplete ? (
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={markComplete}
                disabled={completing}
              >
                {completing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Mark complete
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5 bg-brand-navy text-white hover:bg-brand-navy/90"
              asChild
            >
              <Link href={exitHref}>Done</Link>
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {inspections.length > 1 ? (
              <Select
                value={activeId}
                onValueChange={(id) => {
                  const insp = inspections.find((i) => i.id === id);
                  if (insp) syncFromInspection(insp);
                }}
              >
                <SelectTrigger className="h-9 w-[min(100%,280px)] border-brand-navy/15 bg-card">
                  <SelectValue placeholder="Select inspection" />
                </SelectTrigger>
                <SelectContent>
                  {inspections.map((insp) => (
                    <SelectItem key={insp.id} value={insp.id}>
                      {insp.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <h2 className="truncate text-base font-semibold text-brand-navy">
                {activeInspection?.templateName}
              </h2>
            )}
            <InspectionWorkflowBadge status={status} />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-muted-foreground"
              onClick={addInspection}
            >
              Add inspection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={() => setShareOpen(true)}
            >
              <Share2 className="size-3.5" />
              Share
            </Button>
          </div>

          <div className="min-w-0 flex-1 lg:max-w-md">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold tabular-nums text-brand-navy">
                {rated} of {total} rated
              </p>
              <p className="text-xs font-medium tabular-nums text-muted-foreground">
                {percent}%
              </p>
            </div>
            <div className="relative mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/60">
              {total > 0 ? (
                <div className="absolute inset-0 flex">
                  <div
                    className="bg-emerald-500 transition-[width] duration-300"
                    style={{
                      width: `${((progress?.counts.GREEN ?? 0) / total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-amber-500 transition-[width] duration-300"
                    style={{
                      width: `${((progress?.counts.YELLOW ?? 0) / total) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-rose-500 transition-[width] duration-300"
                    style={{
                      width: `${((progress?.counts.RED ?? 0) / total) * 100}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] font-medium text-muted-foreground">
              {(progress?.counts.GREEN ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span className={cn("size-1.5 rounded-full", INSPECTION_STATUS_DOT.GREEN)} />
                  {progress?.counts.GREEN} pass
                </span>
              ) : null}
              {(progress?.counts.YELLOW ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span className={cn("size-1.5 rounded-full", INSPECTION_STATUS_DOT.YELLOW)} />
                  {progress?.counts.YELLOW} monitor
                </span>
              ) : null}
              {(progress?.counts.RED ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <span className={cn("size-1.5 rounded-full", INSPECTION_STATUS_DOT.RED)} />
                  {progress?.counts.RED} fail
                </span>
              ) : null}
              {pending ? (
                <span className="inline-flex items-center gap-1 text-brand-navy">
                  <Loader2 className="size-3 animate-spin" />
                  Saving…
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 sm:px-0">
      {error ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-3 pb-4">
        {groups.map((group) => {
          const catProg = inspectionProgress(group.items);
          const catDone = catProg.rated === catProg.total && catProg.total > 0;
          return (
            <section
              key={group.category}
              className={cn(
                "overflow-hidden rounded-xl border bg-card shadow-sm",
                catDone
                  ? "border-emerald-500/25 ring-1 ring-emerald-500/10"
                  : "border-border/80",
              )}
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-gradient-to-r from-brand-navy/[0.06] via-brand-light/[0.08] to-transparent px-3 py-2.5 sm:px-4">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold tracking-tight text-brand-navy">
                    {group.category}
                  </h3>
                  <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {catProg.rated}/{catProg.total} rated
                    {catDone ? " · complete" : ""}
                  </p>
                </div>
                <CategoryProgressBar
                  rated={catProg.rated}
                  total={catProg.total}
                  className="w-24 sm:w-32"
                />
              </header>

              <ul className="divide-y divide-border/60">
                {group.items.map((item) => {
                  const noteExpanded =
                    notesOpen[item.id] ?? Boolean(item.note?.trim());
                  const ratedItem = item.status !== INSPECTION_ITEM_STATUS.NA;
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        "px-3 py-3 transition-colors sm:px-4",
                        item.status === INSPECTION_ITEM_STATUS.GREEN && "bg-emerald-500/[0.04]",
                        item.status === INSPECTION_ITEM_STATUS.YELLOW && "bg-amber-500/[0.05]",
                        item.status === INSPECTION_ITEM_STATUS.RED && "bg-rose-500/[0.04]",
                      )}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                          <span
                            className={cn(
                              "mt-1.5 size-2.5 shrink-0 rounded-full ring-2 ring-white",
                              INSPECTION_STATUS_DOT[item.status],
                            )}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-snug text-foreground">
                              {item.name}
                            </p>
                            {!ratedItem ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Tap a rating
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:justify-end">
                          <InspectionStatusToggle
                            value={item.status}
                            onChange={(s) => saveItem(item.id, { status: s })}
                            size="touch"
                          />

                          {/* Desktop: compact inline notes — no popover/dialog */}
                          <div className="hidden min-w-[12rem] flex-1 lg:block lg:max-w-xs">
                            <Input
                              placeholder="Notes for advisor or customer…"
                              value={item.note ?? ""}
                              onChange={(e) =>
                                setItems((prev) =>
                                  prev.map((i) =>
                                    i.id === item.id ? { ...i, note: e.target.value } : i,
                                  ),
                                )
                              }
                              onBlur={(e) => {
                                const note = e.target.value;
                                const saved = items.find((i) => i.id === item.id)?.note ?? "";
                                if (note !== saved) {
                                  saveItem(item.id, { note });
                                }
                              }}
                              className="h-9 border-brand-navy/15 bg-background text-xs"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Mobile: expand note inline on the same row */}
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className={cn(
                                "h-10 gap-1.5 px-2.5 text-xs lg:hidden",
                                item.note?.trim()
                                  ? "text-brand-navy"
                                  : "text-muted-foreground",
                              )}
                              onClick={() =>
                                setNotesOpen((prev) => ({
                                  ...prev,
                                  [item.id]: !noteExpanded,
                                }))
                              }
                              aria-expanded={noteExpanded}
                            >
                              <StickyNote className="size-3.5" />
                              {item.note?.trim() ? "Edit note" : "Add note"}
                              <ChevronDown
                                className={cn(
                                  "size-3.5 opacity-60 transition-transform",
                                  noteExpanded && "rotate-180",
                                )}
                              />
                            </Button>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-10 cursor-not-allowed gap-1.5 border-dashed px-2.5 text-xs text-muted-foreground opacity-70"
                                    aria-disabled
                                    tabIndex={-1}
                                    onClick={(e) => e.preventDefault()}
                                  >
                                    <Camera className="size-3.5" />
                                    <span className="hidden sm:inline">Photo</span>
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Photo upload coming soon — attach findings per item in a future
                                update.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>

                      {noteExpanded ? (
                        <div className="mt-2.5 pl-5 sm:pl-6 lg:hidden">
                          <Textarea
                            placeholder="Add a note for the advisor or customer…"
                            value={item.note ?? ""}
                            rows={2}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id ? { ...i, note: e.target.value } : i,
                                ),
                              )
                            }
                            onBlur={(e) => {
                              const note = e.target.value;
                              const saved = items.find((i) => i.id === item.id)?.note ?? "";
                              if (note !== saved) {
                                saveItem(item.id, { note });
                              }
                            }}
                            className="min-h-[4.5rem] resize-y border-brand-navy/15 bg-background text-sm"
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
      </div>

      {/* End-of-list exit — techs shouldn't hunt for global nav */}
      <div className="shrink-0 border-t border-brand-navy/10 bg-background px-1 py-3 shadow-[0_-8px_24px_-16px_rgba(22,88,142,0.35)] sm:px-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Ratings save as you tap.{" "}
            <span className="font-medium text-foreground">
              {rated}/{total} rated
            </span>
            {status === INSPECTION_STATUS.COMPLETED
              ? " · Inspection complete"
              : canComplete
                ? " · Ready to mark complete"
                : " · Finish anytime with Done"}
          </p>
          <div className="flex flex-wrap gap-2">
            {canComplete ? (
              <Button
                type="button"
                size="sm"
                className="h-10 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={markComplete}
                disabled={completing}
              >
                {completing ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Mark complete
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              className="h-10 gap-1.5 bg-brand-navy px-5 text-white hover:bg-brand-navy/90"
              asChild
            >
              <Link href={exitHref}>Done — back to estimate</Link>
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Link href="/inspections" className="text-primary hover:underline">
            View all shop inspections
          </Link>
        </p>
      </div>

      {activeId ? (
        <ShareInspectionDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          inspectionId={activeId}
          roNumber={roNumber}
          customerFirstName={customerFirstName}
          customerName={customerName}
          shopName={shopName}
          phones={phones}
          email={email}
        />
      ) : null}

      <AddInspectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roId={roId}
        existingTemplateNames={existingTemplateNames}
      />
    </div>
    </TooltipProvider>
  );
}
