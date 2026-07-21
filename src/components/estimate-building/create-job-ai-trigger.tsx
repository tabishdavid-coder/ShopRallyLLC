"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateJobAiReviewDialog } from "@/components/estimate-building/create-job-ai-dialog";
import { estimateJobActionAiButton } from "@/components/estimate-building/estimate-job-action-styles";
import { SmartAiPromptBar } from "@/components/repair-order/smart-ai-prompt-bar";
import { useCorePlanShop, useSmartRoIntakeEnabled } from "@/lib/shop-capabilities";
import { SMART_RO_ADDON_LABEL } from "@/lib/smart-ro-intake-types";
import { filterEstimateJobAiItems, type CreateJobAiMode, type ShopNotesAiProposal } from "@/lib/shop-notes-ai-types";
import { parseShopNotesWithAi } from "@/server/actions/shop-notes-ai";
import { cn } from "@/lib/utils";

type Props = {
  roId: string;
  className?: string;
  /** Compact label for dense toolbars (default: full "Create job with AI"). */
  label?: string;
  /** Bias amend matching toward a specific job when invoked from a job card. */
  focusJobId?: string | null;
  /** create-job — new RO job card; amend-job — append labor/parts to focusJobId. */
  mode?: CreateJobAiMode;
  /** When not entitled, show a disabled upgrade button instead of hiding. Default true. */
  showGated?: boolean;
  /** default — h-9 toolbar chip; compact — h-8 uppercase job-card footer chip. */
  size?: "default" | "compact";
  /** cluster — spaced sibling button in EstimateJobActionsCluster. */
  appearance?: "default" | "cluster";
  /** inline — expand beside trigger; dialog — modal composer (job card footers). */
  presentation?: "inline" | "dialog";
};

const DEFAULT_BTN =
  "h-9 gap-1.5 rounded-none border-brand-navy/25 bg-white px-3 text-sm font-medium text-brand-navy shadow-none hover:bg-brand-navy/5";

const COMPACT_BTN =
  "h-8 gap-1.5 rounded-none border-brand-navy/25 bg-white px-3 text-xs font-semibold uppercase tracking-wide text-brand-navy shadow-none hover:border-brand-navy/25 hover:bg-brand-light/10 hover:text-brand-navy";

/** One-click expand or dialog → Smart AI prompt; review opens after parse. */
export function CreateJobAiTrigger({
  roId,
  className,
  label = "Create job with AI",
  focusJobId = null,
  mode = "create-job",
  showGated = true,
  size = "default",
  appearance = "default",
  presentation = "inline",
}: Props) {
  const entitled = useSmartRoIntakeEnabled();
  const isCore = useCorePlanShop();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [proposal, setProposal] = useState<ShopNotesAiProposal | null>(null);
  const [pending, startTransition] = useTransition();

  const promptVisible = presentation === "dialog" ? promptOpen : expanded;
  const btnClass =
    appearance === "cluster"
      ? estimateJobActionAiButton
      : size === "compact"
        ? COMPACT_BTN
        : DEFAULT_BTN;

  const gatedTitle = isCore
    ? `Requires ${SMART_RO_ADDON_LABEL}. Enable in Settings → Subscription.`
    : "Job with AI is a Core-only AI Plus feature.";

  const isAmendMode = mode === "amend-job";

  const promptPlaceholder = isAmendMode
    ? "e.g. Add rear rotors and extra bleed time — include parts if needed"
    : focusJobId
      ? "e.g. Add rotors to this job — include parts if needed"
      : "e.g. Front brake pads and rotors — include labor hours";

  useEffect(() => {
    if (!promptVisible) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [promptVisible]);

  function collapse() {
    if (pending) return;
    setExpanded(false);
    setPromptOpen(false);
    setText("");
    setError(null);
  }

  function openPrompt() {
    if (presentation === "dialog") {
      setPromptOpen(true);
      return;
    }
    setExpanded(true);
  }

  function parseDescription() {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setError("Describe the work needed in a few words.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await parseShopNotesWithAi({
        roId,
        text: trimmed,
        focusJobId: focusJobId ?? undefined,
        mode,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }

      const items = filterEstimateJobAiItems(res.proposal.items);
      if (items.length === 0) {
        setError(
          isAmendMode
            ? "No labor or parts found — describe what to add to this job (e.g. rotors, extra labor hours)."
            : "No new jobs found — describe the repair work (e.g. front brakes, oil change, AC not cold).",
        );
        return;
      }

      setProposal({ ...res.proposal, items });
      setExpanded(false);
      setPromptOpen(false);
      setText("");
      setReviewOpen(true);
    });
  }

  function reopenPrompt() {
    setReviewOpen(false);
    setProposal(null);
    if (presentation === "dialog") {
      setPromptOpen(true);
    } else {
      setExpanded(true);
    }
    if (proposal?.sourceText) setText(proposal.sourceText);
  }

  const reviewDialog = (
    <CreateJobAiReviewDialog
      roId={roId}
      open={reviewOpen}
      onOpenChange={setReviewOpen}
      proposal={proposal}
      onBack={reopenPrompt}
      mode={mode}
    />
  );

  const triggerTitle = isAmendMode
    ? "Describe work to add — AI drafts labor and parts lines for this job"
    : "Describe another job — AI drafts labor and parts for your review";

  if (!entitled) {
    if (!showGated) return null;
    return (
      <Button
        type="button"
        variant="outline"
        size={appearance === "cluster" ? "lg" : "sm"}
        disabled
        title={gatedTitle}
        aria-label={`${label} — ${gatedTitle}`}
        className={cn(btnClass, "cursor-not-allowed opacity-60", className)}
      >
        <Sparkles
          className={cn(
            "size-4 shrink-0",
            appearance === "cluster" ? "text-brand-orange/45" : "text-brand-red/50",
          )}
          aria-hidden
        />
        {label}
      </Button>
    );
  }

  const promptBar = (
    <SmartAiPromptBar
      ref={inputRef}
      variant={presentation === "dialog" ? "composer" : "toolbar"}
      value={text}
      onChange={(next) => {
        setText(next);
        setError(null);
      }}
      onSubmit={parseDescription}
      onCancel={collapse}
      pending={pending}
      placeholder={promptPlaceholder}
      aria-label="Describe work to add with AI"
    />
  );

  if (presentation === "dialog") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          size={appearance === "cluster" ? "lg" : "sm"}
          className={cn(btnClass, className)}
          onClick={openPrompt}
          title={triggerTitle}
        >
          <Sparkles
            className={cn(
              "size-4 shrink-0",
              appearance === "cluster" ? undefined : "text-brand-red",
            )}
            aria-hidden
          />
          {label}
        </Button>

        <Dialog open={promptOpen} onOpenChange={(open) => (open ? setPromptOpen(true) : collapse())}>
          <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <DialogHeader className="border-b border-brand-navy/10 bg-gradient-to-br from-brand-navy/[0.04] via-background to-brand-light/[0.08] px-5 pb-4 pt-5 pr-12 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-brand-navy">
                <Sparkles className="size-4 text-brand-red" aria-hidden />
                {label}
              </DialogTitle>
              <DialogDescription className="text-sm leading-snug text-muted-foreground">
                {isAmendMode
                  ? "Describe additional labor or parts for this job. AI drafts lines for your review — nothing is saved until you apply."
                  : "Paste or describe another job on this repair order. AI drafts labor and parts — nothing is saved until you review and apply."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 px-5 py-4">
              {promptBar}
              {error ? (
                <p className="flex items-start gap-1.5 text-xs text-destructive">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {error}
                </p>
              ) : null}
            </div>
          </DialogContent>
        </Dialog>

        {reviewDialog}
      </>
    );
  }

  if (expanded) {
    return (
      <>
        <div
          className={cn(
            "flex min-w-[min(100%,36rem)] flex-1 basis-[22rem] flex-col gap-1",
            className,
          )}
        >
          {promptBar}
          {error ? (
            <p className="flex items-start gap-1.5 px-0.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>

        {reviewDialog}
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={appearance === "cluster" ? "lg" : "sm"}
        className={cn(btnClass, className)}
        onClick={openPrompt}
        title={triggerTitle}
      >
        <Sparkles
          className={cn(
            "size-4 shrink-0",
            appearance === "cluster" ? undefined : "text-brand-red",
          )}
          aria-hidden
        />
        {label}
      </Button>

      {reviewDialog}
    </>
  );
}
