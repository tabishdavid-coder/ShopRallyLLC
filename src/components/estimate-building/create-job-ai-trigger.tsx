"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CreateJobAiReviewDialog } from "@/components/estimate-building/create-job-ai-dialog";
import { SmartAiPromptBar } from "@/components/repair-order/smart-ai-prompt-bar";
import { useSmartRoIntakeEnabled } from "@/lib/shop-capabilities";
import { filterEstimateJobAiItems, type ShopNotesAiProposal } from "@/lib/shop-notes-ai-types";
import { parseShopNotesWithAi } from "@/server/actions/shop-notes-ai";
import { cn } from "@/lib/utils";

type Props = {
  roId: string;
  className?: string;
  /** Compact label for dense toolbars (default: full "Create job with AI"). */
  label?: string;
  /** Bias amend matching toward a specific job when invoked from a job card. */
  focusJobId?: string | null;
};

/** One-click expand → horizontal Smart AI prompt; review opens in a compact dialog after parse. */
export function CreateJobAiTrigger({
  roId,
  className,
  label = "Create job with AI",
  focusJobId = null,
}: Props) {
  const entitled = useSmartRoIntakeEnabled();
  const inputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [proposal, setProposal] = useState<ShopNotesAiProposal | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (expanded) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(t);
    }
  }, [expanded]);

  if (!entitled) return null;

  function collapse() {
    if (pending) return;
    setExpanded(false);
    setText("");
    setError(null);
  }

  function parseDescription() {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setError("Describe the work needed in a few words.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await parseShopNotesWithAi({ roId, text: trimmed, focusJobId: focusJobId ?? undefined });
      if (!res.ok) {
        setError(res.error);
        return;
      }

      const items = filterEstimateJobAiItems(res.proposal.items);
      if (items.length === 0) {
        setError(
          "No new jobs found — describe the repair work (e.g. front brakes, oil change, AC not cold).",
        );
        return;
      }

      setProposal({ ...res.proposal, items });
      setExpanded(false);
      setText("");
      setReviewOpen(true);
    });
  }

  function reopenPrompt() {
    setReviewOpen(false);
    setProposal(null);
    setExpanded(true);
    if (proposal?.sourceText) setText(proposal.sourceText);
  }

  if (expanded) {
    return (
      <>
        <div
          className={cn(
            "flex min-w-[min(100%,28rem)] flex-1 basis-[18rem] flex-col gap-1",
            className,
          )}
        >
          <SmartAiPromptBar
            ref={inputRef}
            value={text}
            onChange={(next) => {
              setText(next);
              setError(null);
            }}
            onSubmit={parseDescription}
            onCancel={collapse}
            pending={pending}
            placeholder={
              focusJobId
                ? "e.g. Add rotors to this job"
                : "e.g. Add rotors to the brake pad job"
            }
            aria-label="Describe work to add with AI"
          />
          {error ? (
            <p className="flex items-start gap-1.5 px-0.5 text-xs text-destructive">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>

        <CreateJobAiReviewDialog
          roId={roId}
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          proposal={proposal}
          onBack={reopenPrompt}
        />
      </>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "h-9 gap-1.5 rounded-none border-brand-navy/25 bg-white px-3 text-sm font-medium text-brand-navy shadow-none hover:bg-brand-navy/5",
          className,
        )}
        onClick={() => setExpanded(true)}
      >
        <Sparkles className="size-4 text-brand-red" aria-hidden />
        {label}
      </Button>

      <CreateJobAiReviewDialog
        roId={roId}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        proposal={proposal}
        onBack={reopenPrompt}
      />
    </>
  );
}
