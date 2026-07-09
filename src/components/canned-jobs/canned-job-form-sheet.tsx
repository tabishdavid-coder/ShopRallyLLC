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
  const progressPct = ((stepIndex + 1) / STEPS.length) * 100;
  const isReview = currentStep === "review";

  useEffect(() => {
    if (open) {
      setForm(job ? cannedJobFormFromDetail(job) : emptyCannedJobForm());
      setStepIndex(0);
      setError(null);
    }
  }, [open, job]);

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
        className="flex max-h-[min(92vh,900px)] w-[calc(100%-1.5rem)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden border-0 p-0 shadow-2xl sm:max-w-6xl sm:rounded-2xl lg:max-w-7xl"
      >
        <div className="relative shrink-0 bg-brand-navy px-5 py-4 text-white sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
            className="absolute right-4 top-4 text-white hover:bg-white/15 hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>

          <DialogTitle className="pr-10 text-lg font-semibold text-white sm:text-xl">
            {job ? "Edit canned job" : "New canned job"}
          </DialogTitle>
          <DialogDescription className="mt-1 max-w-2xl text-sm text-white/75">
            Step {stepIndex + 1} of {STEPS.length} — build a reusable template for your service writers.
          </DialogDescription>

          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-0.5">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(i)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    active && "bg-white text-brand-navy shadow-sm",
                    done && !active && "bg-white/20 text-white hover:bg-white/30",
                    !active && !done && "bg-white/10 text-white/55",
                  )}
                >
                  <Icon className="size-3.5" />
                  {step.label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-white px-5 py-5 sm:px-6 sm:py-6">
          <CannedJobIntakeForm
            form={form}
            setForm={setForm}
            categories={categories}
            laborRateCents={laborRateCents}
            showQuickTemplates={showQuickTemplates && !job}
            step={currentStep}
          />

          {error ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            onClick={stepIndex === 0 ? () => onOpenChange(false) : goBack}
            disabled={pending}
            className="gap-1.5 text-slate-600"
          >
            {stepIndex === 0 ? (
              "Cancel"
            ) : (
              <>
                <ArrowLeft className="size-4" />
                Back
              </>
            )}
          </Button>

          {isReview ? (
            <Button
              onClick={save}
              disabled={pending}
              className="min-w-36 gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Save canned job
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canContinue()}
              className="min-w-32 gap-1.5 bg-brand-navy hover:bg-brand-navy/90"
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
