"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Loader2,
  Package,
  Sparkles,
  Wrench,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEstimateActionToast } from "@/components/repair-order/estimate-action-toast";
import {
  filterEstimateJobAiItems,
  type CreateJobAiMode,
  type ShopNotesAiProposal,
  type ShopNotesProposalItem,
} from "@/lib/shop-notes-ai-types";
import { applyShopNotesProposals } from "@/server/actions/shop-notes-ai";
import { cn } from "@/lib/utils";

type Props = {
  roId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: ShopNotesAiProposal | null;
  onBack?: () => void;
  mode?: CreateJobAiMode;
};

const REVIEW_GROUPS: {
  title: string;
  kinds: ShopNotesProposalItem["kind"][];
  icon: typeof Wrench;
}[] = [
  { title: "Concerns", kinds: ["concern"], icon: Wrench },
  { title: "Jobs & parts", kinds: ["job", "part"], icon: Package },
];

const REVIEW_GROUPS_AMEND: {
  title: string;
  kinds: ShopNotesProposalItem["kind"][];
  icon: typeof Wrench;
}[] = [
  { title: "Labor lines", kinds: ["job"], icon: Wrench },
  { title: "Parts", kinds: ["part"], icon: Package },
];

function modeBadge(item: ShopNotesProposalItem, amendMode: boolean) {
  if (amendMode && item.kind === "job") {
    return (
      <Badge variant="outline" className="border-brand-navy/40 bg-brand-navy/5 text-[10px] text-brand-navy">
        Add to this job
      </Badge>
    );
  }
  if (amendMode && item.kind === "part") {
    return (
      <Badge variant="outline" className="border-brand-navy/40 bg-brand-navy/5 text-[10px] text-brand-navy">
        Add to this job
      </Badge>
    );
  }
  if (item.mode === "update" && item.targetJobId) {
    return (
      <Badge variant="outline" className="border-brand-navy/40 bg-brand-navy/5 text-[10px] text-brand-navy">
        Update existing
      </Badge>
    );
  }
  if (item.mode === "update") {
    return (
      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-900">
        Replace existing
      </Badge>
    );
  }
  if (item.mode === "fill") {
    return (
      <Badge variant="outline" className="border-brand-light/60 bg-brand-light/10 text-[10px] text-brand-navy">
        Fill empty
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-[10px] text-emerald-900">
      Add new
    </Badge>
  );
}

/** Compact review dialog — opens after inline Smart AI prompt parses jobs for this estimate. */
export function CreateJobAiReviewDialog({
  roId,
  open,
  onOpenChange,
  proposal,
  onBack,
  mode = "create-job",
}: Props) {
  const isAmendMode = mode === "amend-job";
  const reviewGroups = isAmendMode ? REVIEW_GROUPS_AMEND : REVIEW_GROUPS;
  const router = useRouter();
  const { toast } = useEstimateActionToast();
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = useCallback(() => {
    setAccepted({});
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (!proposal) return;
    const items = filterEstimateJobAiItems(proposal.items);
    setAccepted(Object.fromEntries(items.map((item) => [item.id, item.defaultAccepted])));
    setError(null);
  }, [open, proposal, reset]);

  const reviewItems = useMemo(
    () => (proposal ? filterEstimateJobAiItems(proposal.items) : []),
    [proposal],
  );

  const selectedCount = useMemo(
    () => reviewItems.filter((item) => accepted[item.id]).length,
    [reviewItems, accepted],
  );

  function toggleAll(next: boolean) {
    if (!proposal) return;
    setAccepted(Object.fromEntries(reviewItems.map((item) => [item.id, next])));
  }

  function applySelected() {
    if (!proposal) return;
    const items = reviewItems
      .filter((item) => accepted[item.id])
      .map((item) => ({
        id: item.id,
        kind: item.kind,
        proposedValue: item.proposedValue,
        job: item.job,
        part: item.part,
      }));
    if (items.length === 0) {
      setError(isAmendMode ? "Select at least one line to add to this job." : "Select at least one job or line to add.");
      return;
    }

    startTransition(async () => {
      const res = await applyShopNotesProposals({ roId, items });
      if (!res.ok) {
        setError(res.error);
        toast("error", res.error);
        return;
      }
      toast(
        "success",
        res.skipped > 0
          ? `Applied ${res.applied} change${res.applied === 1 ? "" : "s"} (${res.skipped} skipped).`
          : isAmendMode
            ? `Added ${res.applied} line${res.applied === 1 ? "" : "s"} to this job.`
            : `Applied ${res.applied} change${res.applied === 1 ? "" : "s"} to this estimate.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-border bg-gradient-to-r from-brand-navy/[0.04] via-background to-brand-red/[0.03] px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-brand-navy">
            <span className="flex size-8 items-center justify-center rounded-md bg-brand-navy/10">
              <Sparkles className="size-4 text-brand-red" aria-hidden />
            </span>
            {isAmendMode ? "Review lines for this job" : "Review AI suggestions"}
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-sm">
            {isAmendMode
              ? "AI drafted additional labor and parts for this job. Nothing is saved until you confirm."
              : "Nothing is added until you confirm. Matching an existing job updates it instead of creating a duplicate."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {proposal ? (
            <div className="flex flex-col lg:min-h-[min(420px,55vh)] lg:flex-row">
              {/* Left: source description — context rail on desktop */}
              <aside className="shrink-0 border-b border-border bg-brand-navy/[0.03] px-5 py-4 lg:w-[min(320px,34%)] lg:border-b-0 lg:border-r lg:py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-navy/70">
                  Your description
                </p>
                <p className="mt-2 max-h-32 overflow-y-auto text-sm leading-relaxed text-foreground/90 lg:max-h-none lg:overflow-visible">
                  {proposal.sourceText}
                </p>
                <p className="mt-4 hidden text-xs leading-relaxed text-muted-foreground lg:block">
                  {isAmendMode
                    ? "Selected lines are added to the current job — no new job card is created."
                    : "Review each suggestion on the right, then add only what you want on this estimate."}
                </p>
              </aside>

              {/* Right: suggestion groups in a horizontal grid on desktop */}
              <div className="min-w-0 flex-1 px-5 py-4 lg:py-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    <span className="font-semibold text-brand-navy">{reviewItems.length}</span>{" "}
                    suggestion{reviewItems.length === 1 ? "" : "s"}
                    {selectedCount > 0 ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-semibold text-brand-navy">
                          {selectedCount} selected
                        </span>
                      </>
                    ) : null}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleAll(true)}
                    >
                      All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleAll(false)}
                    >
                      None
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 md:items-start">
                  {reviewGroups.map((group) => {
                    const items = reviewItems.filter((item) => group.kinds.includes(item.kind));
                    if (items.length === 0) return null;
                    const Icon = group.icon;
                    return (
                      <section
                        key={group.title}
                        className="min-w-0 rounded-lg border border-border/80 bg-card"
                      >
                        <div className="flex items-center gap-2 border-b border-border/70 bg-brand-navy/[0.04] px-3 py-2.5">
                          <Icon className="size-3.5 text-brand-navy" aria-hidden />
                          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-navy">
                            {group.title}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="ml-auto h-5 px-1.5 text-[10px] font-medium"
                          >
                            {items.length}
                          </Badge>
                        </div>
                        <div className="space-y-2 p-2.5">
                          {items.map((item) => (
                            <ProposalRow
                              key={item.id}
                              item={item}
                              checked={Boolean(accepted[item.id])}
                              amendMode={isAmendMode}
                              onCheckedChange={(checked) =>
                                setAccepted((prev) => ({ ...prev, [item.id]: checked }))
                              }
                            />
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mx-5 mb-4 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-muted/10 px-5 py-3 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onBack?.();
            }}
            disabled={pending}
          >
            Back
          </Button>
          <Button
            type="button"
            className="bg-brand-navy hover:bg-brand-navy/90"
            disabled={pending || selectedCount === 0 || !proposal}
            onClick={applySelected}
          >
            {pending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Adding…
              </>
            ) : (
              <>
                {isAmendMode ? "Add to this job" : "Apply to estimate"} ({selectedCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalRow({
  item,
  checked,
  amendMode,
  onCheckedChange,
}: {
  item: ShopNotesProposalItem;
  checked: boolean;
  amendMode: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-2.5 rounded-md border px-2.5 py-2 transition-colors",
        checked
          ? "border-brand-navy/35 bg-brand-navy/[0.05] shadow-sm shadow-brand-navy/5"
          : "border-border/70 bg-background hover:border-brand-navy/20 hover:bg-muted/25",
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium leading-snug text-foreground">{item.label}</span>
          {modeBadge(item, amendMode)}
        </div>
        {item.currentValue ? (
          <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="line-through opacity-70">{item.currentValue}</span>
            <ArrowRight className="size-3 shrink-0" aria-hidden />
            <span className="font-medium text-foreground">{item.proposedValue}</span>
          </p>
        ) : (
          <p className="text-sm leading-snug text-foreground">{item.proposedValue}</p>
        )}
        {item.job?.laborDescription && item.kind === "job" ? (
          <p className="text-xs text-muted-foreground">
            Labor line: {item.job.laborDescription}
            {item.job.jobNotes ? " · procedure saved to job notes" : null}
          </p>
        ) : null}
        {item.detail ? <p className="text-xs text-muted-foreground">{item.detail}</p> : null}
      </div>
    </label>
  );
}

/** @deprecated Use CreateJobAiReviewDialog — entry is inline via CreateJobAiTrigger. */
export const CreateJobAiDialog = CreateJobAiReviewDialog;
