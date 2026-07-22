"use client";

import { useEffect, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Package,
  Wrench,
  X,
} from "lucide-react";

import {
  CannedJobIntakeForm,
  cannedJobFormFromDetail,
  cannedJobFormToPayload,
  emptyCannedJobForm,
  type CannedJobFormState,
  type CannedJobIntakeStep,
} from "@/components/canned-jobs/canned-job-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { saveCannedJob } from "@/server/actions/canned-jobs";
import type { CannedJobDetail } from "@/lib/canned-job-types";

const STEPS: { id: CannedJobIntakeStep; label: string; icon: typeof ClipboardList }[] = [
  { id: "basics", label: "Details", icon: ClipboardList },
  { id: "labor", label: "Labor", icon: Wrench },
  { id: "parts", label: "Parts", icon: Package },
  { id: "review", label: "Review", icon: CheckCircle2 },
];

export function CannedJobFormSheet({
  open,
  onOpenChange,
  job,
  categories,
  laborRateCents = 15000,
  onSaved,
  showQuickTemplates = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: CannedJobDetail | null;
  categories: string[];
  laborRateCents?: number;
  onSaved?: (id?: string) => void;
  showQuickTemplates?: boolean;
}) {
  const [form, setForm] = useState<CannedJobFormState>(() =>
    job ? cannedJobFormFromDetail(job) : emptyCannedJobForm(),
  );
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const currentStep = STEPS[stepIndex]?.id ?? "basics";
  const isReview = currentStep === "review";

  useEffect(() => {
    if (open) {
      setForm(job ? cannedJobFormFromDetail(job) : emptyCannedJobForm());
      setStepIndex(0);
      setError(null);
    }
  }, [open, job]);

  useEffect(() => {
    if (form.name.trim() && error === "Job name is required.") {
      setError(null);
    }
  }, [form.name, error]);

  function canContinue(): boolean {
    if (currentStep === "basics") return form.name.trim().length > 0;
    return true;
  }

  function goToStep(index: number) {
    if (index > 0 && !form.name.trim()) {
      setError("Job name is required.");
      setStepIndex(0);
      return;
    }
    setStepIndex(index);
    setError(null);
  }

  function goNext() {
    if (!canContinue()) {
      setError("Job name is required.");
      return;
    }
    setError(null);
    if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
  }

  function goBack() {
    setError(null);
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  }

  function save() {
    if (!form.name.trim()) {
      setError("Job name is required.");
      setStepIndex(0);
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveCannedJob(cannedJobFormToPayload(form, job?.id));
      if (res.ok) {
        onOpenChange(false);
        onSaved?.(res.id);
      } else setError(res.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(90vh,820px)] w-[min(64rem,calc(100vw-1.5rem))] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-lg border border-border p-0 shadow-xl sm:max-w-5xl"
      >
        <div className="relative shrink-0 border-b border-border bg-gradient-to-r from-slate-50 via-white to-brand-light/10 px-5 py-3">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-brand-navy"
            aria-hidden
          />

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="absolute right-3 top-3 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>

          <div className="pr-8">
            <DialogTitle className="text-base font-semibold tracking-tight text-brand-navy">
              {job ? "Edit canned job" : "New canned job"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Build a reusable template — Details, labor, parts, then review.
            </DialogDescription>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <nav
            className="shrink-0 border-b border-border bg-slate-50/60 lg:w-44 lg:border-b-0 lg:border-r"
            aria-label="Wizard steps"
          >
            <p className="hidden px-4 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground lg:block">
              Steps
            </p>
            <ol className="flex lg:flex-col">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const active = i === stepIndex;
                const done = i < stepIndex;
                return (
                  <li key={step.id} className="flex-1 lg:flex-none">
                    <button
                      type="button"
                      onClick={() => goToStep(i)}
                      className={cn(
                        "relative flex w-full items-center justify-center gap-1.5 px-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] transition-colors sm:text-[11px]",
                        "border-b-2 lg:border-b-0 lg:border-l-[3px] lg:justify-start lg:gap-2 lg:px-4 lg:py-3 lg:text-left",
                        active &&
                          "border-brand-navy bg-brand-navy/5 text-brand-navy lg:bg-brand-navy/[0.07]",
                        !active &&
                          done &&
                          "border-transparent text-brand-navy/70 hover:border-brand-light hover:bg-brand-light/10 hover:text-brand-navy lg:border-transparent lg:hover:border-l-brand-light",
                        !active &&
                          !done &&
                          "border-transparent text-muted-foreground hover:text-foreground lg:border-transparent lg:hover:border-l-border lg:hover:bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold tabular-nums lg:size-7",
                          active && "bg-brand-navy text-white",
                          !active && done && "bg-brand-navy/15 text-brand-navy",
                          !active && !done && "bg-muted text-muted-foreground",
                        )}
                        aria-hidden
                      >
                        {done ? <CheckCircle2 className="size-3.5" /> : i + 1}
                      </span>
                      <Icon className="size-3.5 shrink-0 lg:hidden" aria-hidden />
                      <span>{step.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-white px-5 py-4">
            <CannedJobIntakeForm
              form={form}
              setForm={setForm}
              categories={categories}
              laborRateCents={laborRateCents}
              showQuickTemplates={showQuickTemplates && !job}
              step={currentStep}
              dense
            />

            {error ? (
              <p
                role="alert"
                className="mt-3 rounded-md border border-brand-red/25 bg-brand-red/5 px-3 py-2 text-xs font-medium text-brand-red"
              >
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-slate-50/90 px-5 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}
            disabled={pending}
            className="h-9 gap-1.5 text-muted-foreground"
          >
            {stepIndex === 0 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="size-3.5" />
                Back
              </>
            )}
          </Button>

          {isReview ? (
            <Button
              size="sm"
              onClick={save}
              disabled={pending}
              className="h-9 min-w-32 gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
            >
              {pending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-3.5" />
              )}
              Save canned job
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={goNext}
              disabled={!canContinue() || pending}
              className="h-9 min-w-28 gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
            >
              Continue
              <ArrowRight className="size-3.5" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
